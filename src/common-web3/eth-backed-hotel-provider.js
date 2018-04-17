// @flow
import type { HotelInterface } from '../interfaces';
import Utils from './utils';
import Contracts from './contracts';
import RemotelyBacked from '../dataset/remotely-backed';

/**
 * Wrapper class for a hotel primarily backed by a smart
 * contract on Ethereum that's holding `url` of its data.
 *
 * It can be extended to support data stored in another
 * form of remote storage.
 */
class EthBackedHotelProvider {
  address: Promise<?string> | ?string;

  // provided by eth backed dataset
  url: Promise<?string> | ?string;
  manager: Promise<?string> | ?string;
  
  web3Utils: Utils;
  web3Contracts: Contracts;
  indexContract: Object;
  contractInstance: Object;
  ethBackedDataset: RemotelyBacked;

  /**
   * Create new configured instance.
   * @param  {Utils} web3Utils
   * @param  {Contracts} web3Contracts
   * @param  {web3.eth.Contract} indexContract Representation of Winding Tree index
   * @param  {string} address is an optional pointer to Ethereum network where the hotel lives.
   * It is used as a reference for on-chain stored data. If it is not provided, a hotel has
   * to be created on chain to behave as expected.
   * @return {EthBackedHotelProvider}
   */
  constructor (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string) {
    this.address = address;
    this.web3Utils = web3Utils;
    this.web3Contracts = web3Contracts;
    this.indexContract = indexContract;
  }

  /**
   * Initializes the underlying RemotelyBacked dataset that actually
   * communicates with the on-chain stored data. If address was provided
   * in the contsructor, the RemotelyBacked dataset is marked as deployed.
   */
  async initialize (): Promise<void> {
    this.ethBackedDataset = new RemotelyBacked();
    this.ethBackedDataset.bindProperties({
      fields: {
        url: {
          remoteGetter: async (): Promise<?string> => {
            return (await this.__getContractInstance()).methods.url().call();
          },
          remoteSetter: this.__editInfo.bind(this),
        },
        manager: {
          remoteGetter: async (): Promise<?string> => {
            return (await this.__getContractInstance()).methods.manager().call();
          },
        },
      },
    }, this);
    if (this.address) {
      this.ethBackedDataset.markDeployed();
    }
  }

  /**
   * Update multiple data fields at once. This part
   * sets manager and url properties and none of them can be nulled.
   * @param {HotelInterface} newData
   */
  setLocalData (newData: HotelInterface) {
    if (newData.manager) {
      this.manager = newData.manager;
    }
    if (newData.url) {
      this.url = newData.url;
    }
  }

  async __getContractInstance (): Promise<Object> {
    if (!this.address) {
      throw new Error('Cannot get hotel instance without address');
    }
    if (!this.contractInstance) {
      this.contractInstance = await this.web3Contracts.getHotelInstance(this.address, this.web3Utils.getCurrentWeb3Provider());
    }
    return this.contractInstance;
  }

  /**
   * Updates url on-chain. Used internally as a remoteSetter for `url` property.
   *
   * @param {Object} transactionOptions usually contains from and to. Gas is automatically computed.
   * @return {Promise<string>} resulting transaction hash
   */
  async __editInfo (transactionOptions: Object): Promise<string> {
    const data = (await this.__getContractInstance()).methods.editInfo(await this.url).encodeABI();
    const estimate = await this.indexContract.methods.callHotel(this.address, data).estimateGas(transactionOptions);
    return new Promise(async (resolve, reject) => {
      return this.indexContract.methods.callHotel(this.address, data).send(Object.assign(transactionOptions, {
        gas: this.web3Utils.applyGasCoefficient(estimate),
      })).on('transactionHash', (hash) => {
        resolve(hash);
      }).on('error', (err) => {
        reject(new Error('Cannot update hotel info: ' + err));
      }).catch((err) => {
        reject(new Error('Cannot update hotel info: ' + err));
      });
    });
  }

  /**
   * Creates a new hotel on chain with specified `url`. The idea is that
   * a subclass of this handles the remote data storage and only after
   * it knows the resulting url, creates the hotel on-chain.
   *
   * It also precomputes the deployed hotel on-chain address. So even if
   * the resulting transaction is not yet mined, the address is already known.
   *
   * @param {Object} transactionOptions usually contains from and to. Gas is automatically computed.
   * @return {Promise<Array<string>>} list of resulting transaction hashes
   */
  async createOnNetwork (transactionOptions: Object, url: string): Promise<Array<string>> {
    // Pre-compute hotel address, we need to use index for it's creating the contract
    this.address = this.web3Utils.determineDeployedContractFutureAddress(
      this.indexContract.options.address,
      await this.web3Utils.determineCurrentAddressNonce(this.indexContract.options.address)
    );
    // Create hotel on-network
    const estimate = await this.indexContract.methods.registerHotel(url).estimateGas(transactionOptions);
    return new Promise(async (resolve, reject) => {
      this.indexContract.methods.registerHotel(url).send(Object.assign({}, transactionOptions, {
        gas: this.web3Utils.applyGasCoefficient(estimate),
      })).on('transactionHash', (hash) => {
        resolve([
          hash,
        ]);
      }).on('receipt', () => {
        this.ethBackedDataset.markDeployed();
      }).on('error', (err) => {
        reject(new Error('Cannot create hotel: ' + err));
      }).catch((err) => {
        reject(new Error('Cannot create hotel: ' + err));
      });
    });
  }

  /**
   * Updates all hotel-related data by calling `updateRemoteData` on a `RemotelyBacked`
   * dataset.
   *
   * @param {Object} transactionOptions usually contains from and to. Gas is automatically computed.
   * @throws {Error} When the underlying contract is not yet deployed.
   * @return {Promise<Array<string>>} List of transaction hashes
   */
  async updateOnNetwork (transactionOptions: Object): Promise<Array<string>> {
    // pre-check if contract is available at all and fail fast
    await this.__getContractInstance();
    // We have to clone options for each dataset as they may get modified
    // along the way
    return this.ethBackedDataset.updateRemoteData(Object.assign({}, transactionOptions));
  }

  /**
   * Destroys the object on network, in this cas, calls a `deleteHotel` on
   * Winding Tree index. Gas is computed autaoma
   *
   * @param {Object} transactionOptions usually contains from and to. Gas is automatically computed.
   * @throws {Error} When the underlying contract is not yet deployed.
   * @return {Promise<Array<string>>} List of transaction hashes
   */
  async removeFromNetwork (transactionOptions: Object): Promise<Array<string>> {
    if (!this.ethBackedDataset.isDeployed()) {
      throw new Error('Cannot remove hotel: not deployed');
    }
    const estimate = await this.indexContract.methods.deleteHotel(this.address).estimateGas(transactionOptions);
    return new Promise(async (resolve, reject) => {
      this.indexContract.methods.deleteHotel(this.address).send(Object.assign(transactionOptions, {
        gas: this.web3Utils.applyGasCoefficient(estimate),
      })).on('transactionHash', (hash) => {
        resolve([
          hash,
        ]);
      }).on('receipt', () => {
        this.ethBackedDataset.markObsolete();
      }).on('error', (err) => {
        reject(new Error('Cannot remove hotel: ' + err));
      }).catch((err) => {
        reject(new Error('Cannot remove hotel: ' + err));
      });
    });
  }
}

export default EthBackedHotelProvider;

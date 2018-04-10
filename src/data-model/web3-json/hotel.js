// @flow
import type { HotelInterface, HotelLocation } from '../../interfaces';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import RemotelyBacked from '../../dataset/remotely-backed';
import InMemoryBacked from '../../dataset/in-memory-backed';

class HotelDataProvider implements HotelInterface {
  address: Promise<?string> | ?string;

  // provided by backed datasets
  url: Promise<?string> | ?string;
  manager: Promise<?string> | ?string;
  description: Promise<?string> | ?string;
  name: Promise<?string> | ?string;
  location: Promise<?HotelLocation> | ?HotelLocation;
  
  web3Utils: Utils;
  web3Contracts: Contracts;
  indexContract: Object;
  contractInstance: Object;
  ethBackedData: RemotelyBacked;
  inMemBackedData: InMemoryBacked;

  static async createInstance (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string): Promise<HotelDataProvider> {
    const hotel = new HotelDataProvider(web3Utils, web3Contracts, indexContract, address);
    await hotel.initialize();
    return hotel;
  }

  constructor (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string) {
    this.address = address;
    this.web3Utils = web3Utils;
    this.web3Contracts = web3Contracts;
    this.indexContract = indexContract;
  }

  async initialize (): Promise<void> {
    this.ethBackedData = new RemotelyBacked();
    this.ethBackedData.bindProperties({
      fields: {
        url: {
          remoteGetter: async (): Promise<?string> => {
            return (await this._getContractInstance()).methods.url().call();
          },
          remoteSetter: this._editInfo,
        },
        manager: {
          remoteGetter: async (): Promise<?string> => {
            return (await this._getContractInstance()).methods.manager().call();
          },
        },
      },
    }, this);
    if (this.address) {
      this.ethBackedData.markDeployed();
    }
    this.inMemBackedData = new InMemoryBacked();
    this.inMemBackedData.bindProperties({
      fields: {
        description: {},
        name: {},
        location: {},
      },
    }, this);
    if (this.address) {
      // pre-heat contract to prevent multiple contract inits
      await this._getContractInstance();
      this.inMemBackedData.setHash(await this.url);
    } else {
      this.inMemBackedData.initialize();
    }
  }

  setLocalData (newData: HotelInterface) {
    this.manager = newData.manager || this.manager;
    this.name = newData.name;
    this.description = newData.description;
    this.location = newData.location;
  }

  async _getContractInstance (): Promise<Object> {
    if (!this.address) {
      throw new Error('Cannot get hotel instance without address');
    }
    if (!this.contractInstance) {
      this.contractInstance = await this.web3Contracts.getHotelInstance(this.address, this.web3Utils.getCurrentWeb3Provider());
    }
    return this.contractInstance;
  }

  async _editInfo (transactionOptions: Object): Object {
    const data = this.web3Utils.encodeMethodCall((await this._getContractInstance()).abi, 'editInfo', [await this.url]);
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

  async createOnNetwork (transactionOptions: Object): Promise<Array<string>> {
    // TODO create sleeker API, this hidden autofill is weird
    // wrap into a strategy and re-use web3-backed hotel with url
    const dataUrl = this.inMemBackedData.getHash();

    // Pre-compute hotel address, we need to use index for it's creating the contract
    const indexNonce = await this.web3Utils.determineCurrentAddressNonce(this.indexContract.options.address);
    this.address = this.web3Utils.determineDeployedContractFutureAddress(this.indexContract.options.address, indexNonce);
   
    // Create hotel on-network
    let transactionId;
    const estimate = await this.indexContract.methods.registerHotel(dataUrl).estimateGas(transactionOptions);
    return new Promise(async (resolve, reject) => {
      this.indexContract.methods.registerHotel(dataUrl).send(Object.assign({}, transactionOptions, {
        gas: this.web3Utils.applyGasCoefficient(estimate),
      })).on('transactionHash', (hash) => {
        transactionId = hash;
        // TODO possibly change if multiple transactions come into play
        resolve([
          transactionId,
        ]);
      }).on('receipt', () => {
        // TODO check that this actually happens
        this.ethBackedData.markDeployed();
      }).on('error', (err) => {
        reject(new Error('Cannot create hotel: ' + err));
      }).catch((err) => {
        reject(new Error('Cannot create hotel: ' + err));
      });
    });
  }

  async updateOnNetwork (transactionOptions: Object): Promise<Array<string>> {
    // check if contract is available at all
    await this._getContractInstance();
    // We have to clone options for each dataset as they may get modified
    // along the way
    return this.ethBackedData.updateRemoteData(Object.assign({}, transactionOptions));
  }

  async removeFromNetwork (transactionOptions: Object): Promise<Array<string>> {
    let transactionId;
    const estimate = await this.indexContract.methods.deleteHotel(this.address).estimateGas(transactionOptions);
    return new Promise(async (resolve, reject) => {
      this.indexContract.methods.deleteHotel(this.address).send(Object.assign(transactionOptions, {
        gas: this.web3Utils.applyGasCoefficient(estimate),
      })).on('transactionHash', (hash) => {
        transactionId = hash;
        // TODO possibly change if multiple transactions come into play
        resolve([
          transactionId,
        ]);
      }).on('receipt', () => {
        // TODO check that this actually happens
        this.ethBackedData.markObsolete();
      }).on('error', (err) => {
        reject(new Error('Cannot remove hotel: ' + err));
      }).catch((err) => {
        reject(new Error('Cannot remove hotel: ' + err));
      });
    });
  }
}

export default HotelDataProvider;

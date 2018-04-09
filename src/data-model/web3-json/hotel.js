// @flow
import type { HotelInterface, HotelLocation } from '../../interfaces';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import RemotelyBacked from '../../dataset/remotely-backed';

class HotelDataProvider implements HotelInterface {
  address: Promise<?string> | ?string;

  // later redefined
  url: Promise<?string> | ?string;
  manager: Promise<?string> | ?string;
  // TODO make these JSON backed
  description: Promise<?string> | ?string;
  name: Promise<?string> | ?string;
  location: Promise<?HotelLocation> | ?HotelLocation;
  
  web3Utils: Utils;
  web3Contracts: Contracts;
  indexContract: Object;
  contractInstance: Object;
  ethBackedData: RemotelyBacked;

  static createInstance (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string): HotelDataProvider {
    const hotel = new HotelDataProvider(web3Utils, web3Contracts, indexContract, address);
    hotel.initialize();
    return hotel;
  }

  constructor (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string) {
    this.address = address;
    this.web3Utils = web3Utils;
    this.web3Contracts = web3Contracts;
    this.indexContract = indexContract;
  }

  initialize () {
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
  }

  setLocalData (newData: HotelInterface) {
    this.url = newData.url;
    this.manager = newData.manager || this.manager;
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
    // TODO sync all other data into json storage
    
    // Pre-compute hotel address, we need to use index for it's creating the contract
    const indexNonce = await this.web3Utils.determineCurrentAddressNonce(this.indexContract.options.address);
    this.address = this.web3Utils.determineDeployedContractFutureAddress(this.indexContract.options.address, indexNonce);
    
    // Create hotel on-network
    let transactionId;
    const estimate = await this.indexContract.methods.registerHotel(await this.url).estimateGas(transactionOptions);
    
    return new Promise(async (resolve, reject) => {
      this.indexContract.methods.registerHotel(await this.url).send(Object.assign({}, transactionOptions, {
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

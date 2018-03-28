// @flow
import type { HotelDataInterface, HotelInterface } from '../../../interfaces';
import BackedByBlockchain from '../backed-by-blockchain';
import Web3Connector from '../';
import Contracts from '../contracts';
import Utils from '../utils';

class HotelDataProvider extends BackedByBlockchain implements HotelInterface {
  connector: Web3Connector;
  indexContract: Object;
  contractInstance: Object;

  static createInstance (connector: Web3Connector, indexContract: Object, address?: string): HotelDataProvider {
    const hotel = new HotelDataProvider(connector, indexContract, address);
    hotel.initialize();
    return hotel;
  }

  constructor (connector: Web3Connector, indexContract: Object, address?: string) {
    super();
    this.address = address;
    this.connector = connector;
    this.indexContract = indexContract;
  }

  initialize () {
    const updateNameAndDesc = async (contractInstance: Object, transactionOptions: Object): Object => {
      return this._editNameAndDescription(contractInstance, transactionOptions);
    };
    this.setOptions({
      fields: {
        name: {
          networkGetter: async (contractInstance: Object): Promise<?string> => {
            return contractInstance.name();
          },
          networkSetter: updateNameAndDesc,
        },
        description: {
          networkGetter: async (contractInstance: Object): Promise<?string> => {
            return contractInstance.description();
          },
          networkSetter: updateNameAndDesc,
        },
        manager: {
          networkGetter: async (contractInstance: Object): Promise<?string> => {
            return contractInstance.manager();
          },
        },
      },
    });
  }

  setLocalData (newData: HotelDataInterface) {
    // TODO deal with nulling the data
    if (!newData.name) {
      throw new Error('Missing name');
    }
    if (!newData.description) {
      throw new Error('Missing description');
    }
    this.name = newData.name;
    this.description = newData.description;
    this.manager = newData.manager || this.manager;
  }

  async _getContractInstance (): Promise<Object> {
    if (!this.address) {
      throw new Error('Cannot get hotel instance without address');
    }
    if (!this.contractInstance) {
      this.contractInstance = await Contracts.getHotelInstance(this.address, this.connector.web3.currentProvider);
    }
    return this.contractInstance;
  }

  async _getHotelIndexInManagerList (): Promise<number> {
    // TODO this can be cached/memoized for a decent amount of time
    if (!this.address) {
      throw new Error('Cannot get hotel index without address');
    }
    const manager = await this.manager;
    if (!manager) {
      throw new Error('Cannot get hotel index without manager');
    }
    const managersHotels = await this.indexContract.getHotelsByManager(manager);
    const hotelIndex = managersHotels.indexOf(this.address);
    if (hotelIndex < 0) {
      // TODO improve error handling
      throw new Error((this.address || 'unknown') + ' not found in manager ' + (manager || 'unknown') + ' collection');
    }
    return hotelIndex;
  }

  async _editNameAndDescription (contractInstance: Object, transactionOptions: Object): Object {
    const data = Utils.encodeMethodCall(contractInstance.abi, 'editInfo', [await this.name, await this.description]);
    const hotelIndex = await this._getHotelIndexInManagerList();
    const estimate = await this.indexContract.callHotel.estimateGas(hotelIndex, data, transactionOptions);
    return this.indexContract.callHotel(hotelIndex, data, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
  }

  async createOnNetwork (transactionOptions: Object): Promise<HotelDataProvider> {
    // We have to access __localData directly to prevent looping into network communication
    const estimate = await this.indexContract.registerHotel.estimateGas(this.__localData.name, this.__localData.description, transactionOptions);
    await this.indexContract.registerHotel(this.__localData.name, this.__localData.description, Object.assign({}, transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO check result
    // TODO pass hotel address into the log event if possible, that will be much more efficient
    const managersHotels = await this.indexContract.getHotelsByManager(this.__localData.manager);
    // TODO We expect that no other write happened in the meantime, that's plain wrong
    this.__localData.address = managersHotels.pop();
    if (!this.address) {
      this.address = this.__localData.address;
    }
    // sync all other data into network
    await this.updateOnNetwork(transactionOptions);
    return this;
  }

  async removeFromNetwork (transactionOptions: Object): Promise<boolean> {
    const hotelIndex = await this._getHotelIndexInManagerList();
    const estimate = await this.indexContract.deleteHotel.estimateGas(hotelIndex, transactionOptions);
    const result = await this.indexContract.deleteHotel(hotelIndex, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO check result
    this.markObsolete();
    return !!result.tx;
  }
}

export default HotelDataProvider;

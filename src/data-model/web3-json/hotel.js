// @flow
import type { HotelInterface } from '../../interfaces';
import Web3Connector from './index';
import Contracts from '../../common-web3/contracts';
import Utils from '../../common-web3/utils';

// TODO refactor the backedByBlockchain, maybe move one level down the foodchain
class HotelDataProvider implements HotelInterface {
  connector: Web3Connector;
  indexContract: Object;
  contractInstance: Object;

  static createInstance (connector: Web3Connector, indexContract: Object, address?: string): HotelDataProvider {
    const hotel = new HotelDataProvider(connector, indexContract, address);
    hotel.initialize();
    return hotel;
  }

  constructor (connector: Web3Connector, indexContract: Object, address?: string) {
    //super();
    this.address = address;
    this.connector = connector;
    this.indexContract = indexContract;
  }

  initialize () {
    const updateNameAndDesc = async (transactionOptions: Object): Object => {
      return this._editNameAndDescription(transactionOptions);
    };
    this.setOptions({
      fields: {
        name: {
          remoteGetter: async (): Promise<?string> => {
            return (await this._getContractInstance()).name();
          },
          remoteSetter: updateNameAndDesc,
        },
        description: {
          remoteGetter: async (): Promise<?string> => {
            return (await this._getContractInstance()).description();
          },
          remoteSetter: updateNameAndDesc,
        },
        manager: {
          remoteGetter: async (): Promise<?string> => {
            return (await this._getContractInstance()).manager();
          },
        },
      },
    });
  }

  setLocalData (newData: HotelInterface) {
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

  async _editNameAndDescription (transactionOptions: Object): Object {
    const data = Utils.encodeMethodCall((await this._getContractInstance()).abi, 'editInfo', [await this.name, await this.description]);
    const estimate = await this.indexContract.callHotel.estimateGas(this.address, data, transactionOptions);
    return this.indexContract.callHotel(this.address, data, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
  }

  async createOnNetwork (transactionOptions: Object): Promise<Array<string>> {
    // We have to access __localData directly to prevent looping into network communication
    const estimate = await this.indexContract.registerHotel.estimateGas(this.__localData.name, this.__localData.description, transactionOptions);
    await this.indexContract.registerHotel(this.__localData.name, this.__localData.description, Object.assign({}, transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO precompute address
    this.__localData.address = '0x00000';
    if (!this.address) {
      this.address = this.__localData.address;
    }
    // sync all other data onto network
    await this.updateOnNetwork(transactionOptions);
    // TODO fix this
    const transactionId = 'aaaaa';
    return [transactionId];
  }

  async removeFromNetwork (transactionOptions: Object): Promise<Array<string>> {
    const estimate = await this.indexContract.deleteHotel.estimateGas(this.address, transactionOptions);
    const result = await this.indexContract.deleteHotel(this.address, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO check result
    this.markObsolete();
    // TODO fix this?
    return [result.tx];
  }
}

export default HotelDataProvider;

// @flow

import { DataModelAccessorInterface, WTIndexInterface, AdaptedTxResultsInterface, WalletInterface, KeystoreV3Interface } from '../interfaces';
import Web3UriDataModel from './web3-uri';
import type { Web3UriDataModelOptionsType } from './web3-uri';
import { storageInstance } from '../dataset/in-memory-backed';

/**
 * DataModelType is a chosen `data-model`. Not all options are implemented right now.
 * @enum {String}
 */
export type DataModelType = 'web3-uri';
/**
 * Combination of all implemented Data Model options.
 *
 * "initialJsonData": {
 *   "url1": {},
 *   "url2": {}
 * }
 *
 * @type {Object}
 */
export type DataModelOptionsType = Web3UriDataModelOptionsType & {
  // Initial data for JSON storage, necessary for pre-existing data
  initialJsonData?: Object
};

/**
 * Representation of a current data model. You should use this factory
 * to obtain an implementation of Winding Tree index that serves data
 * from the desired data-model.
 */
class DataModel {
  type: string;
  options: DataModelOptionsType;
  _datamodel: DataModelAccessorInterface;

  /**
   * Returns a new configured instance. Fills InMemoryData storage
   * with initial data if provided.
   * @type {DataModel}
   */
  static createInstance (dataModelType: DataModelType, options: DataModelOptionsType): DataModel {
    if (options && options.initialJsonData) {
      for (let key in options.initialJsonData) {
        storageInstance.update(key, options.initialJsonData[key]);
      }
    }

    return new DataModel(dataModelType, options);
  }

  constructor (type: DataModelType, options: DataModelOptionsType) {
    this.type = type;
    this.options = options || {};
  }

  __getDataModelAccessor (): DataModelAccessorInterface {
    if (!this._datamodel) {
      switch (this.type) {
      case 'web3-uri':
        this._datamodel = Web3UriDataModel.createInstance(this.options);
        break;
      default:
        throw new Error(this.type + ' data model is not implemented');
      }
    }
    return this._datamodel;
  }

  /**
   * Returns an instance of Winding Tree index backed by the previously
   * chosen DataModel
   * @type {string} address where to look for the Winding Tree index.
   */
  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    return this.__getDataModelAccessor().getWindingTreeIndex(address);
  }

  /**
   * Returns transactions status from the previously chosen DataModel.
   */
  async getTransactionsStatus (transactionHashes: Array<string>): Promise<AdaptedTxResultsInterface> {
    return this.__getDataModelAccessor().getTransactionsStatus(transactionHashes);
  }

  async createWallet (jsonWallet: KeystoreV3Interface): Promise<WalletInterface> {
    return this.__getDataModelAccessor().createWallet(jsonWallet);
  }
}

export default DataModel;

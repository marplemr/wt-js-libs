// @flow

import { DataModelAccessorInterface, WTIndexInterface, AdaptedTxResultsInterface, WalletInterface, KeystoreV3Interface } from '../interfaces';
import FullJsonDataModel from './full-json';
import type { FullJsonDataModelOptionsType } from './full-json';
import Web3UriDataModel from './web3-uri';
import type { Web3UriDataModelOptionsType } from './web3-uri';

/**
 * DataModelType is a chosen `data-model`. Not all options are implemented right now.
 * @enum {String}
 */
export type DataModelType = 'full-json' | 'web3-uri';
/**
 * Combination of all implemented Data Model options.
 * @type {Object}
 */
export type DataModelOptionsType = FullJsonDataModelOptionsType & Web3UriDataModelOptionsType;

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
   * Returns a new configured instance.
   * @type {DataModel}
   */
  static createInstance (dataModelType: DataModelType, options: DataModelOptionsType): DataModel {
    if (![
      'full-json',
      'web3-uri',
    ].includes(dataModelType)) {
      // TODO improve exception system
      throw new Error(dataModelType + ' is not recognized as a valid data model type');
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
      case 'full-json':
        this._datamodel = FullJsonDataModel.createInstance(this.options);
        break;
      case 'web3-uri':
        this._datamodel = Web3UriDataModel.createInstance(this.options);
        break;
      default:
        throw new Error(this.type + ' data model is not yet implemented');
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

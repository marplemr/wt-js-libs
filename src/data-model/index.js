// @flow

import { DataModelAccessorInterface, WTIndexInterface, AdaptedTxResultsInterface } from '../interfaces';
import FullJsonDataModel from './full-json';
import type { FullJsonDataModelOptionsType } from './full-json';
import Web3JsonDataModel from './web3-json';
import type { Web3JsonDataModelOptionsType } from './web3-json';

/**
 * DataModelType is a chosen `data-model`. Not all options are implemented right now.
 * @enum {String}
 */
export type DataModelType = 'full-web3' | 'full-json' | 'web3-json' | 'web3-ipfs' | 'web3-swarm';
/**
 * Combination of all implemented Data Model options.
 * @type {Object}
 */
export type DataModelOptionsType = FullJsonDataModelOptionsType & Web3JsonDataModelOptionsType;

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
      'full-web3',
      'full-json',
      'web3-json',
      'web3-ipfs',
      'web3-swarm',
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
      case 'web3-json':
        this._datamodel = Web3JsonDataModel.createInstance(this.options);
        break;
      case 'full-web3':
      case 'web3-ipfs':
      case 'web3-swarm':
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
}

export default DataModel;

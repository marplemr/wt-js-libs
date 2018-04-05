// @flow

import { DataModelAccessorInterface, WTIndexInterface } from '../interfaces';
import FullJsonDataModel from './full-json';
import type { FullJsonDataModelOptionsType } from './full-json';

// Data Model Type, i. e. which data storage mode to use
export type DataModelType = 'full-web3' | 'full-json' | 'web3-json' | 'web3-ipfs' | 'web3-swarm';
export type DataModelOptionsType = FullJsonDataModelOptionsType;

class DataModel {
  type: string;
  options: DataModelOptionsType;
  _datamodel: DataModelAccessorInterface;

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

  getDataModelAccessor (): DataModelAccessorInterface {
    if (!this._datamodel) {
      switch (this.type) {
      case 'full-json':
        this._datamodel = FullJsonDataModel.createInstance(this.options);
        break;
      case 'full-web3':
      case 'web3-json':
      case 'web3-ipfs':
      case 'web3-swarm':
      default:
        throw new Error(this.type + ' data model is not yet implemented');
      }
    }
    return this._datamodel;
  }

  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    return this.getDataModelAccessor().getWindingTreeIndex(address);
  }
}

export default DataModel;

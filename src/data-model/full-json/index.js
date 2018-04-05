// @flow

import type { DataModelAccessorInterface, WTIndexInterface } from '../../interfaces';
import WTIndexDataProvider from './wt-index';

export type FullJsonDataModelOptionsType = {
  // deserialized JSON data object
  source?: Object
};

class FullJsonDataModel implements DataModelAccessorInterface {
  options: FullJsonDataModelOptionsType;
  source: Object;

  static createInstance (options: FullJsonDataModelOptionsType): FullJsonDataModel {
    return new FullJsonDataModel(options);
  }

  constructor (options: FullJsonDataModelOptionsType) {
    this.options = options || {};
    this.source = this.options.source || {};
  }

  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    const index = this.source[address] || {};
    return WTIndexDataProvider.createInstance(index);
  }
};

export default FullJsonDataModel;

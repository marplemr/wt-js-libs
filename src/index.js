// @flow

import type { DataModelType, DataModelOptionsType } from './data-model';
import type { WTIndexInterface } from './interfaces';
import DataModel from './data-model';

type WtLibsOptionsType = {
  // Blockchain address of WTIndex contract
  wtIndexAddress: string,
  dataModelType: DataModelType,
  dataModelOptions: DataModelOptionsType
};

class WTLibs {
  dataModel: DataModel;
  options: WtLibsOptionsType;

  static createInstance (options: WtLibsOptionsType): WTLibs {
    return new WTLibs(options);
  }

  constructor (options: WtLibsOptionsType) {
    this.options = options || {};
    this.options.dataModelType = this.options.dataModelType || 'web3-swarm';
    this.dataModel = DataModel.createInstance(this.options.dataModelType, this.options.dataModelOptions);
  }

  async getWTIndex (address: string): Promise<WTIndexInterface> {
    return this.dataModel.getWindingTreeIndex(address);
  }
}

export default WTLibs;

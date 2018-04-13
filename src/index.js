// @flow

import type { DataModelType, DataModelOptionsType } from './data-model';
import type { WTIndexInterface } from './interfaces';
import DataModel from './data-model';

/**
 * General options for wt-libs-js. Holds all things necessary
 * for successful setup of Winding Tree network.
 *
 * @type WtLibsOptionsType
 */
type WtLibsOptionsType = {
  dataModelType: DataModelType,
  dataModelOptions: DataModelOptionsType
};

/**
 * Main public interface of wt-libs-js.
 */
class WTLibs {
  dataModel: DataModel;
  options: WtLibsOptionsType;

  /**
   * Call this to create wt-libs-js instance
   * @param options
   * @type WTLibs
   */
  static createInstance (options: WtLibsOptionsType): WTLibs {
    return new WTLibs(options);
  }

  /**
   * constructs new instance. If `dataModelType` is not passed,
   * `web3-swarm` is used as a default. That is subject to change.
   *
   * @param options
   * @return WTLibs
   */
  constructor (options: WtLibsOptionsType) {
    this.options = options || {};
    this.options.dataModelType = this.options.dataModelType || 'web3-swarm';
    this.dataModel = DataModel.createInstance(this.options.dataModelType, this.options.dataModelOptions);
  }

  /**
   * Get an instance of Winding Tree index from the underlying `data-model`.
   *
   * @param address of the Winding Tree index
   * @type Promise<WTIndexInterface>
   */
  async getWTIndex (address: string): Promise<WTIndexInterface> {
    return this.dataModel.getWindingTreeIndex(address);
  }
}

export default WTLibs;

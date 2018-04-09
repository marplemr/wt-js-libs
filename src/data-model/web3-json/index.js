// @flow

import Web3 from 'web3';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import type { DataModelAccessorInterface, WTIndexInterface } from '../../interfaces';
import WTIndexDataProvider from './wt-index';

export type Web3JsonDataModelOptionsType = {
  // URL of currently used RPC provider
  provider?: string | Object,
  // Gas coefficient that is used as a multiplier when setting
  // a transaction gas
  // TODO maybe we can set this up later or automagically?
  gasCoefficient?: number
};

class Web3JsonDataModel implements DataModelAccessorInterface {
  options: Web3JsonDataModelOptionsType;
  commonWeb3Utils: Utils;
  commonWeb3Contracts: Contracts;

  static createInstance (options: Web3JsonDataModelOptionsType): Web3JsonDataModel {
    return new Web3JsonDataModel(options);
  }

  constructor (options: Web3JsonDataModelOptionsType) {
    this.options = options;
    this.options.gasCoefficient = this.options.gasCoefficient || 2;
    const web3instance = new Web3(options.provider);
    this.commonWeb3Utils = Utils.createInstance(this.options.gasCoefficient, web3instance);
    this.commonWeb3Contracts = Contracts.createInstance(web3instance);
  }

  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    return WTIndexDataProvider.createInstance(address, this.commonWeb3Utils, this.commonWeb3Contracts);
  }
};
export default Web3JsonDataModel;

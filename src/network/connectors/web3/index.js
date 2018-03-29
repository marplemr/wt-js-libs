// @flow

import Web3 from 'web3';

import type { ConnectorInterface, WTIndexInterface } from '../../interfaces';
import WTIndexDataAccessor from '../../data-accessors/wt-index';
import WTIndexDataProvider from './data-providers/wt-index';

export type Web3ConnectorOptionsType = {
  // URL of currently used RPC provider
  provider?: string | Object,
  // Gas coefficient that is used as a multiplier when setting
  // a transaction gas
  // TODO maybe we can set this up later or automagically?
  gasCoefficient?: number
};

class Web3Connector implements ConnectorInterface {
  options: Web3ConnectorOptionsType;
  web3: Web3;

  static createInstance (options: Web3ConnectorOptionsType): Web3Connector {
    return new Web3Connector(options);
  }

  constructor (options: Web3ConnectorOptionsType) {
    this.options = options;
    this.options.gasCoefficient = this.options.gasCoefficient || 2;
    this.web3 = new Web3(options.provider);
  }

  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    const providerInstance = await WTIndexDataProvider.createInstance(address, this);
    return WTIndexDataAccessor.createInstance(providerInstance);
  }

  // TODO improve or automate
  applyGasCoefficient (gas: number): number {
    if (this.options.gasCoefficient) {
      return Math.ceil(gas * this.options.gasCoefficient);
    }
    return gas;
  }
};
export default Web3Connector;

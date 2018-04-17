// @flow

import Web3 from 'web3';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import type { DataModelAccessorInterface } from '../../interfaces';
import Web3JsonWTIndexDataProvider from './wt-index';
import { storageInstance } from '../../dataset/in-memory-backed';

/**
 * Web3JsonDataModelOptionsType options. May look like this:
 *
 * ```
 * {
 *   "provider": 'http://localhost:8545',// or another Web3 provider
 *   "gasCoefficient": 2, // Optional, defaults to 2
 *   "initialJsonData": {
 *     "url1": {},
 *     "url2": {}
 *   }
 * }
 * ```
 */
export type Web3JsonDataModelOptionsType = {
  // URL of currently used RPC provider
  provider?: string | Object,
  // Gas coefficient that is used as a multiplier when setting
  // a transaction gas
  gasCoefficient?: number,
  // Initial data for JSON storage, necessary for pre-existing data
  initialJsonData?: Object
};

/**
 * Web3JsonDataModel
 */
class Web3JsonDataModel implements DataModelAccessorInterface {
  options: Web3JsonDataModelOptionsType;
  commonWeb3Utils: Utils;
  commonWeb3Contracts: Contracts;

  /**
   * Creates a configured Web3JsonDataModel instance.
   */
  static createInstance (options: Web3JsonDataModelOptionsType): Web3JsonDataModel {
    return new Web3JsonDataModel(options);
  }

  /**
   * Creates a new Web3 instance for given provider,
   * sets up Utils and Contracts and prepares the
   * InMemoryStorage
   */
  constructor (options: Web3JsonDataModelOptionsType) {
    this.options = options;
    this.options.gasCoefficient = this.options.gasCoefficient || 2;
    const web3instance = new Web3(options.provider);
    this.commonWeb3Utils = Utils.createInstance(this.options.gasCoefficient, web3instance);
    this.commonWeb3Contracts = Contracts.createInstance(web3instance);

    if (this.options.initialJsonData) {
      for (let key in this.options.initialJsonData) {
        storageInstance.update(key, this.options.initialJsonData[key]);
      }
    }
  }

  /**
   * Returns a combined Ethereum and JSON backed Winding Tree index.
   */
  async getWindingTreeIndex (address: string): Promise<Web3JsonWTIndexDataProvider> {
    return Web3JsonWTIndexDataProvider.createInstance(address, this.commonWeb3Utils, this.commonWeb3Contracts);
  }
};

export default Web3JsonDataModel;

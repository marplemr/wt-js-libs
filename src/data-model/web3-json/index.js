// @flow

import Web3 from 'web3';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import type { DataModelAccessorInterface, AdaptedTxResultInterface, AdaptedTxResultsInterface } from '../../interfaces';
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
  web3Utils: Utils;
  web3Contracts: Contracts;

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
    this.web3Utils = Utils.createInstance(this.options.gasCoefficient, web3instance);
    this.web3Contracts = Contracts.createInstance(web3instance);

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
    return Web3JsonWTIndexDataProvider.createInstance(address, this.web3Utils, this.web3Contracts);
  }

  /**
   * Find out in what state are transactions. All logs
   * are decoded along the way and some metrics such as blockAge
   * are computed. If you pass all transactions related to a single
   * operation (such as updateHotel), you may benefit from the computed
   * metrics.
   */
  async getTransactionsStatus (txHashes: Array<string>): Promise<AdaptedTxResultsInterface> {
    let promises = [];
    for (let hash of txHashes) {
      promises.push(this.web3Utils.getTransactionReceipt(hash));
    }
    const currentBlockNumber = await this.web3Utils.getCurrentBlockNumber();
    const receipts = await Promise.all(promises);
    
    let results = {};
    for (let receipt of receipts) {
      if (!receipt) { continue; }
      let decodedLogs = this.web3Contracts.decodeLogs(receipt.logs);
      for (let logRecord of decodedLogs) {
        // events is a really stupid name, so renaming
        logRecord.attributes = logRecord.events;
        delete logRecord.events;
      }
      results[receipt.transactionHash] = {
        blockAge: currentBlockNumber - receipt.blockNumber,
        decodedLogs: decodedLogs,
        raw: receipt,
      };
    }
    const resultsValues: Array<AdaptedTxResultInterface> = (Object.values(results): Array<any>); // eslint-disable-line flowtype/no-weak-types
    return {
      meta: {
        total: txHashes.length,
        processed: resultsValues.length,
        minBlockAge: Math.min(...(resultsValues.map((a) => a.blockAge))),
        maxBlockAge: Math.max(...(resultsValues.map((a) => a.blockAge))),
        allPassed: Math.min(...(resultsValues.map((a) => a.raw.status))) === 1 && txHashes.length === resultsValues.length,
      },
      results: results,
    };
  }
};

export default Web3JsonDataModel;

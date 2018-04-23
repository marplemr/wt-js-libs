// @flow

import Web3 from 'web3';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import type { DataModelAccessorInterface, AdaptedTxResultInterface, AdaptedTxResultsInterface, KeystoreV3Interface } from '../../interfaces';
import Web3JsonWTIndexDataProvider from './wt-index';
import Web3JsonWTWallet from './wallet';
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
  web3Instance: Web3;
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
    this.web3Instance = new Web3(options.provider);
    this.web3Utils = Utils.createInstance(this.options.gasCoefficient, this.web3Instance);
    this.web3Contracts = Contracts.createInstance(this.web3Instance);

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
    let receiptsPromises = [];
    let txDataPromises = [];
    for (let hash of txHashes) {
      receiptsPromises.push(this.web3Utils.getTransactionReceipt(hash));
      txDataPromises.push(this.web3Utils.getTransaction(hash));
    }
    const currentBlockNumber = await this.web3Utils.getCurrentBlockNumber();
    const receipts = await Promise.all(receiptsPromises);
    const txData = await Promise.all(txDataPromises);

    let results = {};
    for (let receipt of receipts) {
      if (!receipt) { continue; }
      let decodedLogs = this.web3Contracts.decodeLogs(receipt.logs);
      let originalTxData = txData.find((tx) => tx.hash === receipt.transactionHash);
      for (let logRecord of decodedLogs) {
        // events is a really stupid name, so renaming
        logRecord.attributes = logRecord.events;
        delete logRecord.events;
      }
      results[receipt.transactionHash] = {
        transactionHash: receipt.transactionHash,
        blockAge: currentBlockNumber - receipt.blockNumber,
        decodedLogs: decodedLogs,
        from: originalTxData && originalTxData.from,
        to: originalTxData && originalTxData.to,
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
        // TODO Possibly improve error codes
        // https://ethereum.stackexchange.com/questions/28077/how-do-i-detect-a-failed-transaction-after-the-byzantium-fork-as-the-revert-opco
        allPassed: Math.min(...(resultsValues.map((a) => parseInt(a.raw.status)))) === 1 && txHashes.length === resultsValues.length,
      },
      results: results,
    };
  }

  /**
   * Returns a wallet implementation for given keystore.
   */
  async createWallet (jsonWallet: KeystoreV3Interface): Promise<Web3JsonWTWallet> {
    const wallet = Web3JsonWTWallet.createInstance(jsonWallet);
    wallet.setWeb3(this.web3Instance);
    return Promise.resolve(wallet);
  }
};

export default Web3JsonDataModel;

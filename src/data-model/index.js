// @flow

import Web3 from 'web3';
import Utils from './utils';
import Contracts from './contracts';
import type { DataModelAccessorInterface, AdaptedTxResultInterface, AdaptedTxResultsInterface, KeystoreV3Interface } from '../interfaces';
import Web3UriWTIndexDataProvider from './wt-index';
import Web3WTWallet from './wallet';

/**
 * DataModelOptionsType options. May look like this:
 *
 * ```
 * {
 *   "provider": 'http://localhost:8545',// or another Web3 provider
 *   "gasCoefficient": 2 // Optional, defaults to 2
 * }
 * ```
 */
export type DataModelOptionsType = {
  // URL of currently used RPC provider.
  provider?: string | Object;
  // Gas coefficient that is used as a multiplier when setting
  // a transaction gas.
  gasCoefficient?: number
};

/**
 * Web3UriDataModel
 */
class Web3UriDataModel implements DataModelAccessorInterface {
  options: DataModelOptionsType;
  web3Instance: Web3;
  web3Utils: Utils;
  web3Contracts: Contracts;

  /**
   * Creates a configured Web3UriDataModel instance.
   */
  static createInstance (options: DataModelOptionsType): Web3UriDataModel {
    return new Web3UriDataModel(options);
  }

  /**
   * Creates a new Web3 instance for given provider,
   * sets up Utils and Contracts.
   */
  constructor (options: DataModelOptionsType) {
    this.options = options || {};
    this.options.gasCoefficient = this.options.gasCoefficient || 2;
    this.web3Instance = new Web3(this.options.provider);
    this.web3Utils = Utils.createInstance(this.options.gasCoefficient, this.web3Instance);
    this.web3Contracts = Contracts.createInstance(this.web3Instance);
  }

  /**
   * Returns a combined Ethereum and appropriate storage backed Winding Tree index.
   */
  async getWindingTreeIndex (address: string): Promise<Web3UriWTIndexDataProvider> {
    return Web3UriWTIndexDataProvider.createInstance(address, this.web3Utils, this.web3Contracts);
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
  async createWallet (jsonWallet: KeystoreV3Interface): Promise<Web3WTWallet> {
    const wallet = Web3WTWallet.createInstance(jsonWallet);
    wallet.setWeb3(this.web3Instance);
    return Promise.resolve(wallet);
  }
};

export default Web3UriDataModel;

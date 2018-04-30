// @flow

import type { DataModelAccessorInterface, AdaptedTxResultsInterface, KeystoreV3Interface } from '../../interfaces';
import JsonWTIndexDataProvider from './wt-index';
import JSONWTWallet from './wallet';

/**
 * FullJSonDataModel options. Contains only `source`
 * JSON object from which the whole data-model is
 * constructed. Every key in `source` object should
 * represent a Winding Tree index address that contains
 * a list of hotels such as:
 *
 * ```
 * {"index1": {
 *     "hotels": {
 *       "hotel1": {...data...}
 *       "hotel2": {...data...}
 *     }
 *   }
 * }
 * ```
 *
 * @type {Object}
 */
export type FullJsonDataModelOptionsType = {
  // deserialized JSON data object
  source?: Object
};

/**
 * FullJsonDataModel
 */
class FullJsonDataModel implements DataModelAccessorInterface {
  options: FullJsonDataModelOptionsType;
  source: Object;

  /**
   * Creates a configured FullJsonDataModel instance
   */
  static createInstance (options: FullJsonDataModelOptionsType): FullJsonDataModel {
    return new FullJsonDataModel(options);
  }

  constructor (options: FullJsonDataModelOptionsType) {
    this.options = options || {};
    this.source = this.options.source || {};
  }

  /**
   * Returns a JSON backed Winding Tree index.
   */
  async getWindingTreeIndex (address: string): Promise<JsonWTIndexDataProvider> {
    const index = this.source[address] || {};
    return JsonWTIndexDataProvider.createInstance(index);
  }

  /**
   * Fakes a response for multiple transactions status.
   */
  async getTransactionsStatus (txHashes: Array<string>): Promise<AdaptedTxResultsInterface> {
    const processed = txHashes.filter((a) => a.match(/tx-(add|remove|update)-/));
    let results = {};
    for (let hash of processed) {
      results[hash] = {
        transactionHash: hash,
        from: 'some-address',
        to: 'some-address',
        blockAge: 0,
        decodedLogs: [],
        raw: {
          status: 1,
        },
      };
    }
    return {
      meta: {
        total: txHashes.length,
        processed: processed.length,
        minBlockAge: 0,
        maxBlockAge: 0,
        allPassed: txHashes.length === processed.length,
      },
      results: results,
    };
  }

  /**
   * Returns a fake wallet implementation which actually does nothing.
   */
  async createWallet (jsonWallet: KeystoreV3Interface): Promise<JSONWTWallet> {
    return Promise.resolve(JSONWTWallet.createInstance(jsonWallet));
  }
};

export default FullJsonDataModel;

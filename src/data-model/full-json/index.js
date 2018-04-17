// @flow

import type { DataModelAccessorInterface } from '../../interfaces';
import JsonWTIndexDataProvider from './wt-index';

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
};

export default FullJsonDataModel;

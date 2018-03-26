// @flow

import type { ConnectorInterface, WTIndexInterface } from '../../interfaces';
import WTIndexDataAccessor from '../../data-accessors/wt-index';
import WTIndexDataProvider from './data-providers/wt-index';

export type JsonConnectorOptionsType = {
  // deserialized JSON data object
  source?: Object
};

class JsonConnector implements ConnectorInterface {
  options: JsonConnectorOptionsType;
  source: Object;

  static createInstance (options: JsonConnectorOptionsType): JsonConnector {
    return new JsonConnector(options);
  }

  constructor (options: JsonConnectorOptionsType) {
    this.options = options || {};
    this.source = this.options.source || {};
  }

  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    const index = this.source[address] || {};
    const providerInstance = await WTIndexDataProvider.createInstance(index);
    return WTIndexDataAccessor.createInstance(providerInstance);
  }
};

export default JsonConnector;

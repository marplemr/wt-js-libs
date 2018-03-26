// @flow

import { ConnectorInterface, WTIndexInterface } from './interfaces';
import JsonConnector from './connectors/json';
import type { JsonConnectorOptionsType } from './connectors/json';

export type NetworkConnectorType = 'json';
export type NetworkOptionsType = JsonConnectorOptionsType;

class Network {
  type: string;
  options: NetworkOptionsType;
  _connector: ConnectorInterface;

  static createInstance (connectorType: NetworkConnectorType, options: NetworkOptionsType): Network {
    if (!['json'].includes(connectorType)) {
      // TODO improve exception system
      throw new Error('Unrecognized network type');
    }
    return new Network(connectorType, options);
  }

  constructor (type: NetworkConnectorType, options: NetworkOptionsType) {
    this.type = type;
    this.options = options || {};
  }

  getConnector (): ConnectorInterface {
    if (!this._connector) {
      switch (this.type) {
      case 'json':
        this._connector = JsonConnector.createInstance(this.options);
        break;
      }
    }
    return this._connector;
  }

  async getWindingTreeIndex (address: string): Promise<WTIndexInterface> {
    return this.getConnector().getWindingTreeIndex(address);
  }
}

export default Network;

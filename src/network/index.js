// @flow

import { ConnectorInterface, WTIndexInterface } from './interfaces';
import JsonConnector from './connectors/json';
import Web3Connector from './connectors/web3';
import type { JsonConnectorOptionsType } from './connectors/json';
import type { Web3ConnectorOptionsType } from './connectors/web3';

// Way of connecting to the underlying network. defaults to web3
export type NetworkConnectorType = 'web3' | 'json';
export type NetworkOptionsType = JsonConnectorOptionsType & Web3ConnectorOptionsType;

class Network {
  type: string;
  options: NetworkOptionsType;
  _connector: ConnectorInterface;

  static createInstance (connectorType: NetworkConnectorType, options: NetworkOptionsType): Network {
    if (!['web3', 'json'].includes(connectorType)) {
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
      case 'web3':
      default:
        this._connector = Web3Connector.createInstance(this.options);
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

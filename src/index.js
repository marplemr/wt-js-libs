// @flow

import type { NetworkConnectorType, NetworkOptionsType } from './network';
import type { WTIndexInterface } from './network/interfaces';
import Network from './network';

type WtLibsOptionsType = {
  // Blockchain address of WTIndex contract
  wtIndexAddress: string,
  networkConnectorType: NetworkConnectorType,
  networkOptions: NetworkOptionsType
};

class WTLibs {
  network: Network;
  options: WtLibsOptionsType;

  static createInstance (options: WtLibsOptionsType): WTLibs {
    return new WTLibs(options);
  }

  constructor (options: WtLibsOptionsType) {
    this.options = options || {};
    this.options.networkConnectorType = this.options.networkConnectorType || 'json';
    this.network = Network.createInstance(this.options.networkConnectorType, this.options.networkOptions);
  }

  async getWTIndex (address: string): Promise<WTIndexInterface> {
    return this.network.getWindingTreeIndex(address);
  }
}

export default WTLibs;

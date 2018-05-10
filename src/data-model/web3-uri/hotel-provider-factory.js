// @flow
import type { RemoteHotelInterface } from '../../interfaces';
import Utils from './common/utils';
import Contracts from './common/contracts';
import JsonHotelProvider from './providers/json-hotel';

class HotelProviderFactory {
  defaultDataStorage: string;
  web3Utils: Utils;
  web3Contracts: Contracts;

  static createInstance (defaultDataStorage: string, web3Utils: Utils, web3Contracts: Contracts): HotelProviderFactory {
    return new HotelProviderFactory(defaultDataStorage, web3Utils, web3Contracts);
  }

  constructor (defaultDataStorage: string, web3Utils: Utils, web3Contracts: Contracts) {
    this.defaultDataStorage = defaultDataStorage;
    this.web3Utils = web3Utils;
    this.web3Contracts = web3Contracts;
  }

  async getHotelInstance (index: Object, address?: string): Promise<RemoteHotelInterface> {
    let providerClass;
    if (!address) {
      providerClass = this.__getHotelProviderClass(this.defaultDataStorage);
    } else {
      const url = await (await this.__getHotelContractInstance(address)).methods.url().call();
      providerClass = this.__getHotelProviderClass(this.__detectUsedSchema(url));
    }
    return providerClass.createInstance(this.web3Utils, this.web3Contracts, index, address);
  }

  async __getHotelContractInstance (address: string): Promise<Object> {
    return this.web3Contracts.getHotelInstance(address, this.web3Utils.getCurrentWeb3Provider());
  }

  __detectUsedSchema (url: string): ?string {
    const matchResult = url.match(/(\w+):\/\//i);
    return matchResult ? matchResult[1] : null;
  }

  // + in flow annotation means read only
  // @see https://flow.org/en/docs/types/interfaces/#toc-interface-property-variance-read-only-and-write-only
  __getHotelProviderClass (dataStorageType: ?string): {+createInstance: any} { // eslint-disable-line flowtype/no-weak-types
    switch (dataStorageType) {
    case 'json':
      return JsonHotelProvider;
    default:
      throw new Error(`Unsupported data storage type: ${dataStorageType || 'null'}`);
    }
  }
}

export default HotelProviderFactory;

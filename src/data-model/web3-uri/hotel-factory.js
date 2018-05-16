// @flow
import type { HotelInterface } from '../../interfaces';
import Utils from './utils';
import Contracts from './contracts';
import OnChainHotel from './on-chain-hotel';

/**
 * HotelFactory is used to instantiate
 * various forms of Hotel representation.
 */
class HotelFactory {
  defaultDataStorage: string;
  web3Utils: Utils;
  web3Contracts: Contracts;

  /**
   * Creates new instance of HotelFactory.
   * @param {string} defaultDataStorage is used every time a brand new hotel is created.
   * @param {Utils}
   * @param {Contracts}
   */
  static createInstance (defaultDataStorage: string, web3Utils: Utils, web3Contracts: Contracts): HotelFactory {
    return new HotelFactory(defaultDataStorage, web3Utils, web3Contracts);
  }

  constructor (defaultDataStorage: string, web3Utils: Utils, web3Contracts: Contracts) {
    this.defaultDataStorage = defaultDataStorage;
    this.web3Utils = web3Utils;
    this.web3Contracts = web3Contracts;
  }

  /**
   * Returns a HotelInterface based on data storage. It either uses the default
   * one or if an address is provided, it detects a storage type to be used
   * by checking the url field on-chain on given address.
   * @param {Object} Winding Tree index contract instance.
   * @param {string} Optional hotel address
   */
  async getHotelInstance (index: Object, address?: string): Promise<HotelInterface> {
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
    // case 'json':
    default:
      return OnChainHotel;
      // throw new Error(`Unsupported data storage type: ${dataStorageType || 'null'}`);
    }
  }
}

export default HotelFactory;

// @flow
import type { RemoteHotelInterface } from '../../interfaces';
import Utils from './common/utils';
import Contracts from './common/contracts';
import JsonHotelProvider from './providers/json-hotel';

class HotelProviderFactory {
  static async getInstance (web3Utils: Utils, web3Contracts: Contracts, index: Object, address?: string): Promise<RemoteHotelInterface> {
    return JsonHotelProvider.createInstance(web3Utils, web3Contracts, index, address);
  }
}

export default HotelProviderFactory;

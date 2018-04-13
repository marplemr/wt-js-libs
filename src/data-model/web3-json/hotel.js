// @flow
import type { HotelInterface, LocationInterface } from '../../interfaces';
import Utils from '../../common-web3/utils';
import Contracts from '../../common-web3/contracts';
import EthBackedHotelProvider from '../../common-web3/eth-backed-hotel-provider';
import InMemoryBacked from '../../dataset/in-memory-backed';

/**
 *
 */
class HotelDataProvider extends EthBackedHotelProvider implements HotelInterface {
  description: Promise<?string> | ?string;
  name: Promise<?string> | ?string;
  location: Promise<?LocationInterface> | ?LocationInterface;
  
  inMemBackedData: InMemoryBacked;

  /**
   * [web3Utils description]
   * @type {[type]}
   */
  static async createInstance (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string): Promise<HotelDataProvider> {
    const hotel = new HotelDataProvider(web3Utils, web3Contracts, indexContract, address);
    await hotel.initialize();
    return hotel;
  }

  /**
   *
   */
  async initialize (): Promise<void> {
    super.initialize();
    this.inMemBackedData = new InMemoryBacked();
    this.inMemBackedData.bindProperties({
      fields: {
        description: {},
        name: {},
        location: {},
      },
    }, this);
    if (this.address) {
      // pre-heat contract to prevent multiple contract inits
      await this._getContractInstance();
      this.inMemBackedData.setHash(await this.url);
    } else {
      this.inMemBackedData.initialize();
    }
  }

  /**
   */
  setLocalData (newData: HotelInterface) {
    super.setLocalData(newData);
    this.name = newData.name;
    this.description = newData.description;
    this.location = newData.location;
  }

  async createOnNetwork (transactionOptions: Object): Promise<Array<string>> {
    const dataUrl = this.inMemBackedData.getHash();
    return super.createOnNetwork(transactionOptions, dataUrl);
  }
}

export default HotelDataProvider;

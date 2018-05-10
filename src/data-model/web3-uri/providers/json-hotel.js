// @flow
import type { HotelInterface, RemoteHotelInterface, LocationInterface, WalletInterface } from '../../../interfaces';
import Utils from '../common/utils';
import Contracts from '../common/contracts';
import EthBackedHotelProvider from '../common/eth-backed-hotel-provider';
import InMemoryBacked from '../../../dataset/in-memory-backed';

/**
 * Ethereum based hotel with additional data stored in an in-memory JSON storage.
 */
class JsonHotelProvider extends EthBackedHotelProvider implements RemoteHotelInterface {
  description: Promise<?string> | ?string;
  name: Promise<?string> | ?string;
  location: Promise<?LocationInterface> | ?LocationInterface;
  
  inMemBackedData: InMemoryBacked;

  /**
   * Returns a configured instance of JsonHotelProvider. Optionally
   * may point to an existing Ethereum blockchain address with a hotel.
   *
   * Runs `initialize` before returning.
   */
  static async createInstance (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string): Promise<JsonHotelProvider> {
    const hotel = new JsonHotelProvider(web3Utils, web3Contracts, indexContract, address);
    await hotel.initialize();
    return hotel;
  }

  /**
   * Calls EthBackedHotelProvider's initialize
   * and sets up the additional InMemoryBacked dataset containing
   * `description`, `name` and `location`. If the address was provided,
   * an on-chain url pointer is used as an identifier for the InMemoryBacked
   * dataset.
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
      await this.__getContractInstance();
      const url = await this.url;
      if (!url) {
        throw new Error('Cannot initialize hotel data without url');
      }
      this.inMemBackedData.setHash(this.__stripSchemaFromUrl(url));
    } else {
      this.inMemBackedData.initialize();
    }
  }

  __stripSchemaFromUrl (url: string): string {
    const matchedUrl = url.match(/\w+:\/\/(.+)/i);
    if (!matchedUrl) {
      throw new Error(`Cannot find schema in url ${url}`);
    }
    return matchedUrl[1];
  }

  /**
   * Updates data locally, calls EthBackedHotelProvider's setLocalData
   * and sets `name`, `description` and `location`.
   */
  setLocalData (newData: HotelInterface) {
    super.setLocalData(newData);
    this.name = newData.name;
    this.description = newData.description;
    this.location = newData.location;
  }

  /**
   * Creates hotel on network while passing a current InMemoryBacked
   * storage hash as a data url. Calls EthBackedHotelProvider's `createOnNetwork`
   * in the end.
   */
  async createOnNetwork (wallet: WalletInterface, transactionOptions: Object): Promise<Array<string>> {
    const dataUrl = `json://${this.inMemBackedData.getHash()}`;
    return super.createOnNetwork(wallet, transactionOptions, dataUrl);
  }

  async toPlainObject (): Promise<Object> {
    return {
      address: await this.address,
      name: await this.name,
      description: await this.description,
      manager: await this.manager,
      location: await this.location,
      url: await this.url,
    };
  }

  /**
   * Updates hotel data. If the url has changed, the InMemoryBacked dataset
   * is copied over into the new location. EthBackedHotelProvider's `updateOnNetwork`
   * is called aferwards.
   */
  async updateOnNetwork (wallet: WalletInterface, transactionOptions: Object): Promise<Array<string>> {
    // url might have changed - copy over current inmem data and point a new url at them
    const currentUrl: string = ((await this.url): any); // eslint-disable-line flowtype/no-weak-types
    if (currentUrl !== this.inMemBackedData.getHash()) {
      this.inMemBackedData.changeHashTo(this.__stripSchemaFromUrl(currentUrl));
    }
    return super.updateOnNetwork(wallet, transactionOptions);
  }
}

export default JsonHotelProvider;

// @flow
import type { HotelInterface, LocationInterface, WalletInterface } from '../../interfaces';
import Utils from './common/utils';
import Contracts from './common/contracts';
import EthBackedHotelProvider from './common/eth-backed-hotel-provider';
import InMemoryBacked from '../../dataset/in-memory-backed';

/**
 * Ethereum based hotel with additional data stored in an in-memory JSON storage.
 */
class Web3JsonHotelDataProvider extends EthBackedHotelProvider implements HotelInterface {
  description: Promise<?string> | ?string;
  name: Promise<?string> | ?string;
  location: Promise<?LocationInterface> | ?LocationInterface;
  
  inMemBackedData: InMemoryBacked;

  /**
   * Returns a configured instance of Web3JsonHotelDataProvider. Optionally
   * may point to an existing Ethereum blockchain address with a hotel.
   *
   * Runs `initialize` before returning.
   */
  static async createInstance (web3Utils: Utils, web3Contracts: Contracts, indexContract: Object, address?: string): Promise<Web3JsonHotelDataProvider> {
    const hotel = new Web3JsonHotelDataProvider(web3Utils, web3Contracts, indexContract, address);
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
      this.inMemBackedData.setHash(await this.url);
    } else {
      this.inMemBackedData.initialize();
    }
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
    const dataUrl = this.inMemBackedData.getHash();
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
    const currentUrl = await this.url;
    if (currentUrl !== this.inMemBackedData.getHash()) {
      this.inMemBackedData.changeHashTo(currentUrl);
    }
    return super.updateOnNetwork(wallet, transactionOptions);
  }
}

export default Web3JsonHotelDataProvider;

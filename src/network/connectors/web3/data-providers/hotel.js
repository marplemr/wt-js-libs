// @flow
import type { HotelDataInterface, HotelInterface } from '../../../interfaces';
import Web3Connector from '../';
import Contracts from '../contracts';
import Utils from '../utils';

type ContractStateType = 'fresh' | 'downloaded' | 'dirty' | 'synced';

class HotelDataProvider implements HotelInterface {
  state: ContractStateType;
  address: ?string;
  connector: Web3Connector;
  indexContract: Object;
  deployedHotel: Object;

  /* Data */
  networkData: HotelDataInterface;
  localData: HotelDataInterface;

  static createInstance (connector: Web3Connector, indexContract: Object, address?: string): HotelDataProvider {
    return new HotelDataProvider(connector, indexContract, address);
  }

  constructor (connector: Web3Connector, indexContract: Object, address?: string) {
    this.address = address;
    this.connector = connector;
    this.indexContract = indexContract;
    this.networkData = {};
    this.localData = {};
    this.state = 'fresh';
  }

  /* Getters */
  async _genericGetter (property: string): any { // eslint-disable-line flowtype/no-weak-types
    // This is a totally new instance
    if (this.state === 'fresh' && this.address) {
      await this._loadFromNetwork();
    }
    return this.localData[property];
  }

  async getAddress (): Promise<?string> {
    return this._genericGetter('address');
  }

  async getName (): Promise<?string> {
    return this._genericGetter('name');
  }

  async getDescription (): Promise<?string> {
    return this._genericGetter('description');
  }

  async getManager (): Promise<?string> {
    return this._genericGetter('manager');
  }

  /* Setters */
  _genericSetter (property: string, newValue: any) { // eslint-disable-line flowtype/no-weak-types
    if (this.localData[property] !== newValue) {
      this.localData[property] = newValue;
      this.state = 'dirty';
    }
  }

  set name (name: ?string) {
    if (!name) {
      throw new Error('Missing name');
    }
    this._genericSetter('name', name);
  }
  
  set description (description: ?string) {
    if (!description) {
      throw new Error('Missing description');
    }
    this._genericSetter('description', description);
  }

  set manager (manager: ?string) {
    this._genericSetter('manager', manager);
  }

  setLocalData (newData: HotelDataInterface) {
    // TODO deal with nulling the data
    if (!newData.name) {
      throw new Error('Missing name');
    }
    if (!newData.description) {
      throw new Error('Missing description');
    }
    this.name = newData.name;
    this.description = newData.description;
    this.manager = newData.manager;
  }

  /* Network communication */
  async _getDeployedHotel (): Promise<Object> {
    // We cannot use getAddress here because it would get stuck in an infinite loop
    if (!this.address) {
      throw new Error('Cannot get hotel instance without address');
    }
    if (!this.deployedHotel) {
      this.deployedHotel = await Contracts.getHotelInstance(this.address, this.connector.web3.currentProvider);
    }
    return this.deployedHotel;
  }

  async _getHotelIndexInManagerList (): Promise<number> {
    const address = await this.getAddress();
    if (!address) {
      throw new Error('Cannot get hotel index without address');
    }
    const manager = await this.getManager();
    if (!manager) {
      throw new Error('Cannot get hotel index without manager');
    }
    const managersHotels = await this.indexContract.getHotelsByManager(manager);
    const hotelIndex = managersHotels.indexOf(address);
    if (hotelIndex < 0) {
      // TODO improve this
      throw new Error((address || 'unknown') + ' not found in manager ' + (manager || 'unknown') + ' collection');
    }
    return hotelIndex;
  }

  async _fetchFromNetwork (): Promise<HotelDataInterface> {
    const hotelContract = await this._getDeployedHotel();
    const attributes: Array<string> = await (Promise.all([
      hotelContract.name(),
      hotelContract.description(),
      hotelContract.manager(),
    ]): any); // eslint-disable-line flowtype/no-weak-types
    this.state = 'downloaded';
    Object.assign(this.networkData, {
      address: this.address,
      name: attributes[0],
      description: attributes[1],
      manager: attributes[2],
    });
    return this.networkData;
  }

  async _loadFromNetwork (): Promise<?HotelDataProvider> {
    try {
      const networkData = await this._fetchFromNetwork();
      // Copy over data from networkData in the main storage
      Object.assign(this.localData, networkData);
      this.state = 'synced';
      return this;
    } catch (err) {
      // TODO better error handling
      // Address where there is no hotel deployed / any other error
      throw new Error('Cannot call hotel contract on ' + (this.address || '') + ': ' + err.message);
    }
  }

  async createOnNetwork (transactionOptions: Object): Promise<HotelDataProvider> {
    const estimate = await this.indexContract.registerHotel.estimateGas(this.localData.name, this.localData.description, transactionOptions);
    await this.indexContract.registerHotel(this.localData.name, this.localData.description, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO check result
    // TODO simplify as setdata with HotelDataInterface, re-use updateOnNetwork
    this.state = 'synced';
    // TODO pass hotel address into the log event if possible, that will be much more efficient
    const managersHotels = await this.indexContract.getHotelsByManager(this.localData.manager);
    // TODO We expect that no other write happened in the meantime, that's plain wrong
    this.localData.address = managersHotels.pop();
    if (!this.address) {
      this.address = this.localData.address;
    }
    return this;
  }

  async updateOnNetwork (transactionOptions: Object): Promise<HotelDataProvider> {
    const hotelContract = await this._getDeployedHotel();
    // TODO ensure I have all data from network before syncing back, local data is always right if
    // networkdata did not change since last synced block
    // TODO implement smart diffing
    // TODO make update calls smart based on updated fields
    const data = Utils.encodeMethodCall(hotelContract.abi, 'editInfo', [await this.getName(), await this.getDescription()]);
    const hotelIndex = await this._getHotelIndexInManagerList();
    const estimate = await this.indexContract.callHotel.estimateGas(hotelIndex, data, transactionOptions);
    await this.indexContract.callHotel(hotelIndex, data, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO check result
    return this;
  }

  async removeFromNetwork (transactionOptions: Object): Promise<boolean> {
    const hotelIndex = await this._getHotelIndexInManagerList();
    const estimate = await this.indexContract.deleteHotel.estimateGas(hotelIndex, transactionOptions);
    const result = await this.indexContract.deleteHotel(hotelIndex, Object.assign(transactionOptions, {
      gas: this.connector.applyGasCoefficient(estimate),
    }));
    // TODO check result
    return !!result.tx;
  }
}

export default HotelDataProvider;

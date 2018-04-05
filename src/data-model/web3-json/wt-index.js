// @flow

import type { WTIndexInterface, HotelInterface, AddHotelResponse, TxReceipt } from '../../interfaces';
import Web3Connector from './index';
import Contracts from '../../common-web3/contracts';
import HotelDataProvider from './hotel';
import Utils from '../../common-web3/utils';

class WTIndexDataProvider implements WTIndexInterface {
  address: string;
  connector: Web3Connector;
  deployedIndex: Object; // TODO get rid of Object type

  static async createInstance (indexAddress: string, connector: Web3Connector): Promise<WTIndexDataProvider> {
    return new WTIndexDataProvider(indexAddress, connector);
  }

  constructor (indexAddress: string, connector: Web3Connector) {
    this.address = indexAddress;
    this.connector = connector;
  }

  async _getDeployedIndex (): Promise<Object> {
    if (!this.deployedIndex) {
      this.deployedIndex = await Contracts.getIndexInstance(this.address, this.connector.web3.currentProvider);
    }
    return this.deployedIndex;
  }

  async addHotel (hotelData: HotelInterface): Promise<AddHotelResponse> {
    try {
      const hotel = HotelDataProvider.createInstance(this.connector, await this._getDeployedIndex());
      hotel.setLocalData(hotelData);
      const transactionIds = await hotel.createOnNetwork({
        from: hotelData.manager,
        to: this.address,
      });
      return {
        // TODO fix this
        address: '0xaaaa',
        transactionIds: transactionIds,
      };
    } catch (err) {
      // TODO improve error handling
      throw new Error('Cannot add hotel: ' + err.message);
    }
  }

  async updateHotel (hotel: HotelInterface): Promise<Array<string>> {
    try {
      // We need to separate calls to be able to properly catch exceptions
      const updatedHotel = await hotel.updateOnNetwork({
        from: await hotel.manager,
        to: this.address,
      });
      return updatedHotel;
    } catch (err) {
      // TODO improve error handling
      throw new Error('Cannot update hotel:' + err.message);
    }
  }

  async removeHotel (hotel: HotelInterface): Promise<Array<string>> {
    try {
      // We need to separate calls to be able to properly catch exceptions
      const result = ((hotel: any): HotelDataProvider).removeFromNetwork({ // eslint-disable-line flowtype/no-weak-types
        from: await hotel.manager,
        to: this.address,
      });
      return result;
    } catch (err) {
      // TODO improve error handling
      // invalid opcode -> non-existent hotel
      // invalid opcode -> failed check for manager
      throw new Error('Cannot remove hotel: ' + err.message);
    }
  }

  async getHotel (address: string): Promise<?HotelInterface> {
    const index = await this._getDeployedIndex();
    try {
      const hotelIndex = await index.hotelsIndex(address);
      // TODO is this really true? Are we not excluding legal data on zeroth position?
      if (!hotelIndex || hotelIndex.isZero()) {
        throw new Error('Not found in hotel list');
      } else {
        return HotelDataProvider.createInstance(this.connector, index, address);
      }
    } catch (err) {
      // TODO better error handling
      throw new Error('Cannot find hotel at ' + address + ': ' + err.message);
    }
  }

  async getAllHotels (): Promise<Array<HotelInterface>> {
    const index = await this._getDeployedIndex();
    const hotelsAddressList = await index.getHotels();
    let getHotelDetails = hotelsAddressList
      // Filtering null addresses beforehand improves efficiency
      .filter((addr: string): boolean => !Utils.isZeroAddress(addr))
      .map((addr: string): Promise<?HotelInterface> => {
        return this.getHotel(addr) // eslint-disable-line promise/no-nesting
          // We don't really care why the hotel is inaccessible
          // and we need to catch exceptions here on each individual hotel
          .catch((err: Error): null => {
            // TODO optional logging
            if (err) {}
            return null;
          });
      });
    const hotelDetails: Array<?HotelInterface> = await (Promise.all(getHotelDetails): any); // eslint-disable-line flowtype/no-weak-types
    const hotelList: Array<HotelInterface> = (hotelDetails.filter((a: ?HotelInterface): boolean => a != null): any); // eslint-disable-line flowtype/no-weak-types
    return hotelList;
  }

  // TODO fix this with web3
  // TODO maybe group multiple transactions together and do some meta over them
  async getTransactionStatus (txHash: string): Promise<TxReceipt> {
    // getTransactionReceipt - reciept not available when tx is pending
    // truffle-contract can throw errors pretty quickly or throws an error when polling for receipt is not successful
    return null;
  }
}

export default WTIndexDataProvider;

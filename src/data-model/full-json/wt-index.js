// @flow

import type { WTIndexInterface, HotelInterface, AddHotelResponse, TxReceipt } from '../../interfaces';

class WTIndexDataProvider implements WTIndexInterface {
  source: {index: {
    hotels: {}
  }};

  static async createInstance (source: Object): Promise<WTIndexDataProvider> {
    return new WTIndexDataProvider(source);
  }

  constructor (source: Object) {
    if (!source.index) {
      source.index = {
        hotels: {},
      };
    }
    if (!source.index.hotels) {
      source.index.hotels = {};
    }
    this.source = source;
    for (let addr in this.source.index.hotels) {
      let hotel = this.source.index.hotels[addr];
      this.source.index.hotels[addr] = hotel;
    }
  }

  async addHotel (hotelData: HotelInterface): Promise<AddHotelResponse> {
    if (!hotelData.manager) {
      throw new Error('Cannot add hotel without manager');
    }
    const randomId = '0x000' + Object.keys(this.source.index.hotels).length;
    this.source.index.hotels[randomId] = Object.assign(hotelData, { address: randomId });
    return {
      address: randomId,
      transactionIds: ['tx-add-' + randomId],
    };
  }

  async getHotel (address: string): Promise<HotelInterface> {
    let hotel = this.source.index.hotels[address];
    if (!hotel) {
      throw new Error('Cannot find hotel at ' + address);
    }
    return hotel;
  }

  async updateHotel (hotel: HotelInterface): Promise<Array<string>> {
    const hotelAddress: ?string = await hotel.address;
    if (hotelAddress && this.source.index.hotels[hotelAddress]) {
      Object.assign(this.source.index.hotels[hotelAddress], hotel);
      return ['tx-update-' + hotelAddress];
    }
    throw new Error('Cannot update hotel at ' + (hotelAddress || '~unknown~') + ': not found');
  }

  async removeHotel (hotel: HotelInterface): Promise<Array<string>> {
    const address = await hotel.address;
    try {
      if (address && this.source.index.hotels[address] && this.source.index.hotels[address].manager === await hotel.manager) {
        delete this.source.index.hotels[address];
        return ['tx-remove-' + address];
      }
      throw new Error('Hotel does not exist');
    } catch (err) {
      throw new Error('Cannot remove hotel at ' + (address || 'unknown') + ': ' + err.message);
    }
  }

  async getAllHotels (): Promise<Array<HotelInterface>> {
    const hotels: Array<HotelInterface> = (Object.values(this.source.index.hotels): any); // eslint-disable-line flowtype/no-weak-types
    return hotels;
  }

  // TODO fix this
  async getTransactionStatus (txHash: string): Promise<TxReceipt> {
    // getTransactionReceipt - reciept not available when tx is pending
    // truffle-contract can throw errors pretty quickly or throws an error when polling for receipt is not successful
    return null;
  }
}

export default WTIndexDataProvider;

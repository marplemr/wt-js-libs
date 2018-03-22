// @flow

import type { WTIndexDataProviderInterface, HotelInterface, HotelDataInterface } from '../../../interfaces';

class WTIndexDataProvider implements WTIndexDataProviderInterface {
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
      // Initial data might lack data accessors
      this.source.index.hotels[addr] = this._addAsyncGetters(hotel);
    }
  }

  _addAsyncGetters (hotel: Object): HotelInterface {
    if (!hotel.getAddress) {
      hotel.getAddress = async (): Promise<?string> => hotel.address;
    }
    if (!hotel.getName) {
      hotel.getName = async (): Promise<?string> => hotel.name;
    }
    if (!hotel.getDescription) {
      hotel.getDescription = async (): Promise<?string> => hotel.description;
    }
    if (!hotel.getManager) {
      hotel.getManager = async (): Promise<?string> => hotel.manager;
    }
    return hotel;
  }

  async addHotel (hotelData: HotelDataInterface): Promise<HotelInterface> {
    if (!hotelData.name) {
      throw new Error('Cannot add hotel: Missing name');
    }
    if (!hotelData.description) {
      throw new Error('Cannot add hotel: Missing description');
    }
    const randomId = '0x000' + Object.keys(this.source.index.hotels).length;
    this.source.index.hotels[randomId] = this._addAsyncGetters(Object.assign(hotelData, { address: randomId }));
    return this.source.index.hotels[randomId];
  }

  async getHotel (address: string): Promise<HotelInterface> {
    let hotel = this.source.index.hotels[address];
    if (!hotel) {
      throw new Error('Cannot find hotel at ' + address);
    }
    return hotel;
  }

  async updateHotel (hotel: HotelInterface): Promise<HotelInterface> {
    const hotelAddress: ?string = await hotel.getAddress();
    if (hotelAddress && this.source.index.hotels[hotelAddress]) {
      return Object.assign(this.source.index.hotels[hotelAddress], hotel);
    }
    throw new Error('Cannot update hotel at ' + (hotelAddress || '~unknown~') + ': not found');
  }

  async removeHotel (hotel: HotelInterface): Promise<boolean> {
    const address = await hotel.getAddress();
    try {
      if (address && this.source.index.hotels[address] && this.source.index.hotels[address].manager === await hotel.getManager()) {
        delete this.source.index.hotels[address];
        return true;
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
}

export default WTIndexDataProvider;

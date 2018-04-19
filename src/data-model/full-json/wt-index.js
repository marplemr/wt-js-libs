// @flow

import type { WTIndexInterface, HotelInterface, AddHotelResponseInterface } from '../../interfaces';

/**
 * JSON backed implementation of Winding Tree index wrapper.
 */
class JsonWTIndexDataProvider implements WTIndexInterface {
  source: {
    hotels: {}
  };

  /**
   * Creates a new configured instance.
   *
   * @param source of JSON data
   */
  static async createInstance (source: Object): Promise<JsonWTIndexDataProvider> {
    return new JsonWTIndexDataProvider(source);
  }

  constructor (source: Object) {
    if (!source.hotels) {
      source.hotels = {};
    }
    this.source = source;
  }

  /**
   * Adds a new hotel to the JSON storage. Returns
   * a fake address of newly added hotel and a fake list of
   * transaction IDs. Even though they are fake, they can be used
   * in further communication with this instance, i. e. there is a
   * hotel on given address and `getTransactionsStatus` will respond
   * meaningfully to these `transactionIds`.
   *
   * @throws {Error} When no manager is specified
   * @return {address: string, transactionIds: Array<string}
   */
  async addHotel (hotelData: HotelInterface): Promise<AddHotelResponseInterface> {
    if (!hotelData.manager) {
      throw new Error('Cannot add hotel without manager');
    }
    const randomId = '0x000' + Object.keys(this.source.hotels).length;
    this.source.hotels[randomId] = Object.assign(hotelData, { address: randomId });
    return {
      address: randomId,
      transactionIds: ['tx-add-' + randomId],
    };
  }

  /**
   * Get hotel on a given address.
   * @throws {Error} When no hotel is found.
   */
  async getHotel (address: string): Promise<HotelInterface> {
    let hotel = this.source.hotels[address];
    if (!hotel) {
      throw new Error('Cannot find hotel at ' + address);
    }
    return hotel;
  }

  /**
   * Updates a given hotel.
   *
   * @throws {Error} When there is no hotel on a given address.
   * @return {Promise<Array<string>>} List of fake transaction IDs.
   */
  async updateHotel (hotel: HotelInterface): Promise<Array<string>> {
    const hotelAddress: ?string = await hotel.address;
    if (hotelAddress && this.source.hotels[hotelAddress]) {
      Object.assign(this.source.hotels[hotelAddress], hotel);
      return ['tx-update-' + hotelAddress];
    }
    throw new Error('Cannot update hotel at ' + (hotelAddress || '~unknown~') + ': not found');
  }

  /**
   * Deletes a hotel.
   *
   * @throws {Error} When hotel does not exist
   * @throws {Error} When there's another issue
   * @return {Promise<Array<string>>} List of fake transaction IDs.
   *
   */
  async removeHotel (hotel: HotelInterface): Promise<Array<string>> {
    const address = await hotel.address;
    try {
      if (address && this.source.hotels[address] && this.source.hotels[address].manager === await hotel.manager) {
        delete this.source.hotels[address];
        return ['tx-remove-' + address];
      }
      throw new Error('Hotel does not exist');
    } catch (err) {
      throw new Error('Cannot remove hotel at ' + (address || 'unknown') + ': ' + err.message);
    }
  }

  /**
   * Returns all hotels.
   */
  async getAllHotels (): Promise<Array<HotelInterface>> {
    const hotels: Array<HotelInterface> = (Object.values(this.source.hotels): any); // eslint-disable-line flowtype/no-weak-types
    return hotels;
  }
}

export default JsonWTIndexDataProvider;

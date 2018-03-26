// @flow

import type { WTIndexInterface, WTIndexDataProviderInterface, HotelInterface, HotelDataInterface } from '../interfaces';

class WTIndexDataAccessor implements WTIndexInterface {
  dataProvider: WTIndexDataProviderInterface;
  static createInstance (dataProvider: WTIndexDataProviderInterface): WTIndexDataAccessor {
    return new WTIndexDataAccessor(dataProvider);
  }

  constructor (dataProvider: WTIndexDataProviderInterface) {
    this.dataProvider = dataProvider;
  }

  async addHotel (hotelData: HotelDataInterface): Promise<HotelInterface> {
    return this.dataProvider.addHotel(hotelData);
  }

  async getHotel (address: string): Promise<?HotelInterface> {
    return this.dataProvider.getHotel(address);
  }

  async getAllHotels (): Promise<Array<HotelInterface>> {
    return this.dataProvider.getAllHotels();
  }

  async removeHotel (hotel: HotelInterface): Promise<boolean> {
    return this.dataProvider.removeHotel(hotel);
  }

  async updateHotel (hotel: HotelInterface): Promise<HotelInterface> {
    return this.dataProvider.updateHotel(hotel);
  }
}

export default WTIndexDataAccessor;

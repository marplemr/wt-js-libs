// @flow

export interface WTIndexDataProviderInterface {
  addHotel(data: HotelDataInterface): Promise<HotelInterface>;
  getHotel(address: string): Promise<?HotelInterface>;
  getAllHotels(): Promise<Array<HotelInterface>>;
  removeHotel(hotel: HotelInterface): Promise<boolean>;
  updateHotel(hotel: HotelInterface): Promise<HotelInterface>
}

export interface HotelDataInterface extends Object {
  address?: ?string;
  name?: ?string;
  description?: ?string;
  manager?: ?string
}

export interface HotelInterface {
  address: Promise<?string>;
  name: Promise<?string>;
  description: Promise<?string>;
  manager: Promise<?string>;
  createOnNetwork (transactionOptions: Object): Promise<HotelInterface>;
  updateOnNetwork (transactionOptions: Object): Promise<HotelInterface>;
  removeFromNetwork (transactionOptions: Object): Promise<boolean>
}

export interface WTIndexInterface {
  addHotel(data: HotelDataInterface): Promise<HotelInterface>;
  getHotel(address: string): Promise<?HotelInterface>;
  getAllHotels(): Promise<Array<HotelInterface>>;
  removeHotel(hotel: HotelInterface): Promise<boolean>;
  updateHotel(hotel: HotelInterface): Promise<HotelInterface>
}

export interface ConnectorInterface {
  getWindingTreeIndex(address: string): Promise<WTIndexInterface>
}

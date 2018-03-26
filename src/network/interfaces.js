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
  /* lineOne: ?string;
  lineTwo: ?string;
  zip: ?string;
  country: ?string;
  created: ?Date;
  timezone: ?string;
  latitude: ?number;
  longitude: ?number */
}

export interface HotelInterface {
  getAddress(): Promise<?string>;
  getName(): Promise<?string>;
  getDescription(): Promise<?string>;
  getManager(): Promise<?string>;
  // experimental
  updateOnNetwork (transactionOptions: Object): Promise<HotelInterface>
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

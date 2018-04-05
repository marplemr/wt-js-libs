// @flow

export interface AddHotelResponse {
  address: string;
  transactionIds: Array<string>
}

export interface HotelLocation {
  latitude?: ?number;
  longitude?: ?number
}

export interface HotelInterface {
  address: Promise<?string> | ?string;
  manager: Promise<?string> | ?string;
  url: Promise<?string> | ?string;
  location: Promise<?HotelLocation> | ?HotelLocation;
  name: Promise<?string> | ?string;
  description: Promise<?string> | ?string
  // TODO move this methods, drop HotelInterface, it's too web3 specific right now
  // createOnNetwork (transactionOptions: Object): Promise<Array<string>>; // It is possible that this operation generates multiple transactions
  // updateOnNetwork (transactionOptions: Object): Promise<Array<string>>; // It is possible that this operation generates multiple transactions
  // removeFromNetwork (transactionOptions: Object): Promise<Array<string>> // It is possible that this operation generates multiple transactions
}

export interface WTIndexInterface {
  addHotel(data: HotelInterface): Promise<AddHotelResponse>;
  getHotel(address: string): Promise<?HotelInterface>;
  getAllHotels(): Promise<Array<HotelInterface>>;
  updateHotel(hotel: HotelInterface): Promise<Array<string>>; // It is possible that this operation generates multiple transactions
  removeHotel(hotel: HotelInterface): Promise<Array<string>>; // It is possible that this operation generates multiple transactions
  getTransactionStatus (transactionHash: string): Promise<TxReceipt> // TODO subject to change
}

export interface DataModelAccessorInterface {
  getWindingTreeIndex(address: string): Promise<WTIndexInterface>
}

// TODO Subject to change and adaptation into a more friendly shape
export interface LogRecord {
  address: string;
  data: string;
  topics: Array<string>;
  logIndex: number;
  transactionIndex: number;
  transactionHash: number;
  blockHash: number;
  blockNumber: number
}

// TODO Subject to change and adaptation into a more friendly shape
export interface TxReceipt {
  blockHash?: string;
  blockNumber?: number;
  transactionHash?: string;
  transactionIndex?: number;
  from?: string;
  to?: string;
  contractAddress?: string;
  cumulativeGasUsed?: number;
  gasUsed?: number;
  logs?: Array<LogRecord>
}

// @flow

export interface AddHotelResponse {
  address: ?string;
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
}

export interface WTIndexInterface {
  addHotel(data: HotelInterface): Promise<AddHotelResponse>;
  getHotel(address: string): Promise<?HotelInterface>;
  getAllHotels(): Promise<Array<HotelInterface>>;
  updateHotel(hotel: HotelInterface): Promise<Array<string>>; // It is possible that this operation generates multiple transactions
  removeHotel(hotel: HotelInterface): Promise<Array<string>>; // It is possible that this operation generates multiple transactions
  getTransactionsStatus (transactionHashes: Array<string>): Promise<AdaptedTxResults>
}

export interface DataModelAccessorInterface {
  getWindingTreeIndex(address: string): Promise<WTIndexInterface>
}

export interface RawLogRecord {
  address: string;
  data: string;
  topics: Array<string>;
  logIndex: number;
  transactionIndex: number;
  transactionHash: number;
  blockHash: number;
  blockNumber: number
}

export interface DecodedLogRecord {
  address: string,
  event: string,
  attributes: Array<{
    name: string,
    type: string,
    value: string
  }>
}

export interface TxReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  contractAddress: string;
  cumulativeGasUsed: number;
  gasUsed: number;
  logs: Array<RawLogRecord>,
  // https://github.com/ethereum/EIPs/pull/658
  status: number
}

export interface AdaptedTxResult {
  blockAge: number,
  decodedLogs: Array<DecodedLogRecord>,
  raw: TxReceipt
}

export interface AdaptedTxResults {
  meta: {
    total: number,
    processed: number,
    minBlockAge: number,
    maxBlockAge: number,
    allPassed: boolean
  },
  results?: {[string]: AdaptedTxResult}
}

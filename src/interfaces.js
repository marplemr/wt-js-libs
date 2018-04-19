// @flow

/**
 * Response of the addHotel operation.
 *
 *   - `address` holds the projected address of newly created hotel.
 *   - `transactionIds` contains an array of ids of related transactions
 *   that had to be sent to the underlying networks. You can
 *   use these ids to check on the asynchronous operation state.
 */
export interface AddHotelResponseInterface {
  address: ?string;
  transactionIds: Array<string>
}

/**
 * Generic GPS location.
 */
export interface LocationInterface {
  latitude?: ?number;
  longitude?: ?number
}

/**
 * Contains hotel-related data.
 *
 * - `address` is the network address.
 * - `url` holds a pointer to the off-chain storage
 * that is used internally to store data.
 */
export interface HotelInterface {
  address: Promise<?string> | ?string;
  manager: Promise<?string> | ?string;
  url: Promise<?string> | ?string;
  location: Promise<?LocationInterface> | ?LocationInterface;
  name: Promise<?string> | ?string;
  description: Promise<?string> | ?string
}

/**
 * WindingTree index interface that provides all methods
 * necessary for interaction with the hotels. The real
 * implementation might differ in speed and asynchronicity
 * in various `data-model`s.
 */
export interface WTIndexInterface {
  addHotel(data: HotelInterface): Promise<AddHotelResponseInterface>;
  getHotel(address: string): Promise<?HotelInterface>;
  getAllHotels(): Promise<Array<HotelInterface>>;
  // It is possible that this operation generates multiple transactions
  updateHotel(hotel: HotelInterface): Promise<Array<string>>;
  // It is possible that this operation generates multiple transactions
  removeHotel(hotel: HotelInterface): Promise<Array<string>>
}

/**
 * Every `data-model`'s main package should implement this interface
 * and provide the necessary methods.
 */
export interface DataModelAccessorInterface {
  getWindingTreeIndex(address: string): Promise<WTIndexInterface>,
  getTransactionsStatus (transactionHashes: Array<string>): Promise<AdaptedTxResultsInterface>
}

/**
 * This interface represents raw ethereum transaction log object
 * as returned by <a href="http://web3js.readthedocs.io/en/1.0/web3-eth.html#eth-getpastlogs-return">getPastLogs</a>.
 * Sometimes you might need the raw data to do some additional processing.
 */
export interface RawLogRecordInterface {
  address: string;
  data: string;
  topics: Array<string>;
  logIndex: number;
  transactionIndex: number;
  transactionHash: number;
  blockHash: number;
  blockNumber: number
}

/**
 * This interface represents an Ethereum log record
 * with decoded data that are much easier to read
 * and act upon.
 */
export interface DecodedLogRecordInterface {
  address: string,
  event: string,
  attributes: Array<{
    name: string,
    type: string,
    value: string
  }>
}

/**
 * Transaction receipt as returned by
 * <a href="http://web3js.readthedocs.io/en/1.0/web3-eth.html#eth-gettransactionreceipt-return">getTransactionReceipt</a>.
 * This raw data might be sometimes needed for additional processing.
 */
export interface TxReceiptInterface {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  contractAddress: string;
  cumulativeGasUsed: number;
  gasUsed: number;
  logs: Array<RawLogRecordInterface>,
  // https://github.com/ethereum/EIPs/pull/658
  status: number
}

/**
 * A custom transaction result interface that informs
 * about the transaction status, its age and decoded logs.
 */
export interface AdaptedTxResultInterface {
  transactionHash: string;
  blockAge: number,
  decodedLogs: Array<DecodedLogRecordInterface>,
  raw: TxReceiptInterface
}

/**
 * A cummulative result of multiple transactions. We are
 * computing how many of the transactions were already
 * executed, how old are they (which might be useful for making
 * assumptions about confirmations). This also contains the raw data.
 */
export interface AdaptedTxResultsInterface {
  meta: {
    total: number,
    processed: number,
    minBlockAge: number,
    maxBlockAge: number,
    allPassed: boolean
  },
  results?: {[string]: AdaptedTxResultInterface}
}

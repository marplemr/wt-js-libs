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
  description: Promise<?string> | ?string;
  toPlainObject(): Promise<Object>
}

export interface RemoteHotelInterface extends HotelInterface {
  setLocalData(newData: HotelInterface): Promise<void>;
  createOnNetwork(wallet: WalletInterface, transactionOptions: Object): Promise<Array<string>>;
  updateOnNetwork(wallet: WalletInterface, transactionOptions: Object): Promise<Array<string>>;
  removeFromNetwork(wallet: WalletInterface, transactionOptions: Object): Promise<Array<string>>
}

/**
 * WindingTree index interface that provides all methods
 * necessary for interaction with the hotels. The real
 * implementation might differ in speed and asynchronicity
 * in various `data-model`s.
 */
export interface WTIndexInterface {
  addHotel(wallet: WalletInterface, data: HotelInterface): Promise<AddHotelResponseInterface>;
  getHotel(address: string): Promise<?HotelInterface>;
  getAllHotels(): Promise<Array<HotelInterface>>;
  // It is possible that this operation generates multiple transactions
  updateHotel(wallet: WalletInterface, hotel: HotelInterface): Promise<Array<string>>;
  // It is possible that this operation generates multiple transactions
  removeHotel(wallet: WalletInterface, hotel: HotelInterface): Promise<Array<string>>
}

/**
 * Every `data-model`'s main package should implement this interface
 * and provide the necessary methods.
 */
export interface DataModelAccessorInterface {
  getWindingTreeIndex(address: string): Promise<WTIndexInterface>;
  getTransactionsStatus (transactionHashes: Array<string>): Promise<AdaptedTxResultsInterface>;
  createWallet (jsonWallet: Object): Promise<WalletInterface>
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
  address: string;
  event: string;
  attributes: Array<{
    name: string;
    type: string;
    value: string
  }>
}

/**
 * Ethereum transaction data used when creating transaction, see for example
 * https://web3js.readthedocs.io/en/1.0/web3-eth-accounts.html#signtransaction
 */
export interface TransactionDataInterface {
  nonce?: string | number;
  chainId?: string;
  from?: string;
  to: string;
  data: string;
  value?: string;
  gasPrice?: string;
  gas: string | number
}

/**
 * Ethereum transaction data after TX was accepted by the network, see
 * for example http://web3js.readthedocs.io/en/1.0/web3-eth.html#gettransaction
 */
export interface TxInterface {
  hash?: string;
  nonce?: string | number;
  blockHash?: string;
  blockNumber?: number;
  transactionIndex?: number;
  from?: string;
  to?: string;
  value?: string;
  gasPrice?: string;
  gas?: number;
  input?: string
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
  // For some reason ?string does not work here
  contractAddress: any; // eslint-disable-line flowtype/no-weak-types
  cumulativeGasUsed: number;
  gasUsed: number;
  logs: Array<RawLogRecordInterface>;
  // https://github.com/ethereum/EIPs/pull/658
  status: number
}

/**
 * A custom transaction result interface that informs
 * about the transaction status, its age and decoded logs.
 */
export interface AdaptedTxResultInterface {
  transactionHash: string;
  blockAge: number;
  decodedLogs: Array<DecodedLogRecordInterface>;
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
    total: number;
    processed: number;
    minBlockAge: number;
    maxBlockAge: number;
    allPassed: boolean
  };
  results?: {[string]: AdaptedTxResultInterface}
}

/**
 * Wallet abstraction interface. It assumes the following workflow:
 * 1. libs user holds a json wallet
 * 2. libs user unlocks the wallet abstraction with a password
 * 3. libs user calls some business logic which internally uses `signAndSendTransaction`
 * 4. libs user either locks the wallet (if she plans to use it again)
 * 4. OR destroys the wallet object data by calling `destroy`
 *
 * `lock` should not remove the data necessary for unlocking the wallet again.
 * `destroy` on the other hand should clean all data that may be exploited from memory
 */
export interface WalletInterface {
  unlock(password: string): void;
  signAndSendTransaction(transactionData: TransactionDataInterface, onReceipt: ?(receipt: TxReceiptInterface) => void): Promise<string>;
  lock(): void;
  destroy(): void;
  getAddress(): string
}

/**
 * Interface for Ethereum keystore
 *
 * Description: https://medium.com/@julien.m./what-is-an-ethereum-keystore-file-86c8c5917b97
 *
 * Specification: https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
 */
export interface KeystoreV3Interface {
  version: number;
  id: string;
  address: string;
  crypto: {
    ciphertext: string;
    cipherparams: {
      iv: string
    },
    cipher: string;
    kdf: string;
    kdfparams: {
      dklen: number;
      salt: string;
      n: number;
      r: number;
      p: number
    },
    mac: string
  }
}

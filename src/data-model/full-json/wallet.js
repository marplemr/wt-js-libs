// @flow
import ethJsUtil from 'ethereumjs-util';
import type { WalletInterface, TxReceiptInterface, TransactionDataInterface, KeystoreV3Interface } from '../../interfaces';

/**
 * Fake and dummy WalletInterface implementation that does nothing.
 */
class JSONWTWallet implements WalletInterface {
  address: ?string;
  /**
   * Returns a fresh instance of an empty object that does nothing
   */
  static createInstance (keystoreJsonV3: KeystoreV3Interface): JSONWTWallet {
    const wallet = new JSONWTWallet();
    wallet.address = keystoreJsonV3.address;
    return wallet;
  }

  /**
   * Does nothing
   */
  unlock (password: string) {
    // pass
  }

  /**
   * Returns the address passed in `keystoreJsonV3`
   * in a checksummed format, e.g. prefixed with 0x
   * and case-sensitive.
   */
  getAddress (): string {
    return ethJsUtil.toChecksumAddress(this.address);
  }
  
  /**
   * Does nothing. Always returns `tx-hash-signed-by-fake-wallet`.
   * `onReceipt` is always called with some fake data.
   */
  async signAndSendTransaction (transactionData: TransactionDataInterface, onReceipt: ?(receipt: TxReceiptInterface) => void): Promise<string> {
    const transactionHash = 'tx-hash-signed-by-fake-wallet';
    if (onReceipt) {
      onReceipt({
        transactionHash: transactionHash,
        blockNumber: 0,
        blockHash: 'random-block-hash',
        transactionIndex: 0,
        from: this.getAddress(),
        to: transactionData.to,
        logs: [],
        contractAddress: null,
        cumulativeGasUsed: 123,
        gasUsed: 123,
        status: 1,
      });
    }
    return Promise.resolve(transactionHash);
  }

  /**
   * Does nothing
   */
  lock () {
    // pass
  }
  
  /**
   * Does nothing
   */
  destroy () {
    this.address = null;
    delete this.address;
  }
}

export default JSONWTWallet;

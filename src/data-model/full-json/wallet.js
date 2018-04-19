// @flow

import type { WalletInterface, TxReceiptInterface } from '../../interfaces';

class JSONWTWallet implements WalletInterface {
  jsonWallet: Object;

  static createInstance (keystoreJsonV3: Object): WalletInterface {
    return new JSONWTWallet(keystoreJsonV3);
  }

  constructor (keystoreJsonV3: Object) {
    this.jsonWallet = keystoreJsonV3;
  }

  async unlock (password: string): Promise<void> {}
  
  async signAndSendTransaction (transactionData: Object, onReceipt: ?(receipt: TxReceiptInterface) => void): Promise<string> {
    return Promise.resolve('random-string');
  }

  lock () { }

  destroy () {
    delete this.jsonWallet;
    // TODO destroy the whole instance
  }
}

export default JSONWTWallet;

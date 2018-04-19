// @flow
import Web3 from 'web3';
import type { WalletInterface, TxReceiptInterface } from '../../interfaces';

class Web3WTWallet implements WalletInterface {
  jsonWallet: Object;
  web3: Web3;
  account: Object;

  static createInstance (keystoreJsonV3: Object): Web3WTWallet {
    return new Web3WTWallet(keystoreJsonV3);
  }

  setWeb3 (web3: Web3) {
    this.web3 = web3;
  }

  constructor (keystoreJsonV3: Object) {
    this.jsonWallet = keystoreJsonV3;
  }

  async unlock (password: string): Promise<void> {
    this.account = await this.web3.eth.accounts.decrypt(this.jsonWallet, password);
  }
  
  async signAndSendTransaction (transactionData: Object, onReceipt: ?(receipt: TxReceiptInterface) => void): Promise<string> {
    const signedTx = await this.account.signTransaction(transactionData);
    return new Promise(async (resolve, reject) => {
      return this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        .on('transactionHash', (hash) => {
          resolve(hash);
        }).on('receipt', (receipt) => {
          if (onReceipt) {
            onReceipt(receipt);
          }
        }).on('error', (err) => {
          reject(new Error('Cannot send transaction: ' + err));
        }).catch((err) => {
          reject(new Error('Cannot send transaction: ' + err));
        });
    });
  }

  lock () {
    delete this.account;
  }

  destroy () {
    this.lock();
    delete this.jsonWallet;
    // TODO destroy the whole instance
  }
}

export default Web3WTWallet;

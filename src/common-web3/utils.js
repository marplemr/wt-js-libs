// @flow

import type { TxReceiptInterface } from '../interfaces';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import web3Abi from 'web3-eth-abi';
import ethJsUtil from 'ethereumjs-util';

/**
 * Collection of utility methods useful during
 * communication with Ethereum network.
 */
class Utils {
  gasCoefficient: number;
  web3: Web3;

  /**
   * Returns an initialized instance
   * @parameters {number} gasCoefficient is a constant that can be applied to any
   * ethereum transaction to ensure it will be mined.
   * @param  {Web3} web3 instance created by `new Web3(provider)`
   * @return {Contracts}
   */
  static createInstance (gasCoefficient: number, web3: Web3): Utils {
    return new Utils(gasCoefficient, web3);
  }

  constructor (gasCoefficient: number, web3: Web3) {
    this.gasCoefficient = gasCoefficient;
    this.web3 = web3;
  }

  /**
   * Is address a zero address? Uses a bignumber.js test
   *
   * @return {boolean}
   */
  isZeroAddress (address: string): boolean {
    if (!address) { return true; }
    try {
      const addrAsBn = new BigNumber(address);
      return addrAsBn.isZero();
    } catch (e) {
      return true;
    }
  }

  applyGasCoefficient (gas: number): number {
    if (this.gasCoefficient) {
      return Math.ceil(gas * this.gasCoefficient);
    }
    return gas;
  }

  getCurrentWeb3Provider (): Object {
    return this.web3.currentProvider;
  }

  determineDeployedContractFutureAddress (sender: string, nonce: number): string {
    // web3js stores checksummed addresses by default
    // (@see https://github.com/ethereum/EIPs/blob/master/EIPS/eip-55.md)
    return ethJsUtil.toChecksumAddress(ethJsUtil.bufferToHex(ethJsUtil.generateAddress(
      sender,
      nonce
    )));
  }

  async getCurrentBlockNumber (): Promise<number> {
    return this.web3.eth.getBlockNumber();
  }

  async determineCurrentAddressNonce (address: string): Promise<number> {
    return this.web3.eth.getTransactionCount(address);
  }

  async getTransactionReceipt (txHash: string): Promise<TxReceiptInterface> {
    return this.web3.eth.getTransactionReceipt(txHash);
  }
}

export default Utils;

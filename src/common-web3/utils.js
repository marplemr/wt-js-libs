// @flow

import type { TxReceipt } from '../interfaces';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import web3Abi from 'web3-eth-abi';
import ethJsUtil from 'ethereumjs-util';

class Utils {
  gasCoefficient: number;
  web3: Web3;

  static createInstance (gasCoefficient: number, web3: Web3): Utils {
    return new Utils(gasCoefficient, web3);
  }

  constructor (gasCoefficient: number, web3: Web3) {
    this.gasCoefficient = gasCoefficient;
    this.web3 = web3;
  }

  isZeroAddress (address: string): boolean {
    if (!address) { return true; }
    try {
      const addrAsBn = new BigNumber(address);
      return addrAsBn.isZero();
    } catch (e) {
      return true;
    }
  }

  encodeMethodCall (contractAbi: Object, methodName: string, parameters: Array<mixed>): string {
    // TODO type checking of parameters
    const methodAbi = contractAbi.filter((n: Object): boolean => n.name === methodName && n.inputs.length === parameters.length).pop();
    if (!methodAbi) {
      throw Error('Method not found, maybe you are using an invalid signature?');
    }
    return web3Abi.encodeFunctionCall(methodAbi, parameters);
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

  async getTransactionReceipt (txHash: string): Promise<TxReceipt> {
    return this.web3.eth.getTransactionReceipt(txHash);
  }
}

export default Utils;

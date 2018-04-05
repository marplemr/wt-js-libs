// @flow

import BigNumber from 'bignumber.js';
import web3Abi from 'web3-eth-abi';

class Utils {
  static isZeroAddress (address: string): boolean {
    if (!address) { return true; }
    try {
      const addrAsBn = new BigNumber(address);
      return addrAsBn.isZero();
    } catch (e) {
      return true;
    }
  }

  static encodeMethodCall (contractAbi: Object, methodName: string, parameters: Array<mixed>): string {
    // todo type checking of parameters
    const methodAbi = contractAbi.filter((n: Object): boolean => n.name === methodName && n.inputs.length === parameters.length).pop();
    if (!methodAbi) {
      throw Error('Method not found, maybe you are using an invalid signature?');
    }
    return web3Abi.encodeFunctionCall(methodAbi, parameters);
  }
}

export default Utils;

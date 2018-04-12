import abiDecoder from 'abi-decoder';
import WTIndexContractMetadata from '@windingtree/wt-contracts/build/contracts/WTIndex';
import HotelContractMetadata from '@windingtree/wt-contracts/build/contracts/Hotel';

abiDecoder.addABI(WTIndexContractMetadata.abi);
abiDecoder.addABI(HotelContractMetadata.abi);

class Contracts {
  static createInstance (web3) {
    return new Contracts(web3);
  }

  constructor (web3) {
    this.web3 = web3;
  }

  async _getInstance (name, abi, address) {
    if (!this.web3.utils.isAddress(address)) {
      throw new Error('Cannot get ' + name + ' instance at an invalid address ' + address);
    }
    const deployedCode = await this.web3.eth.getCode(address);
    if (deployedCode === '0x0') {
      throw new Error('Cannot get ' + name + ' instance at an address with no code ' + address);
    }
    return new this.web3.eth.Contract(abi, address);
  }

  async getIndexInstance (address) {
    return this._getInstance('index', WTIndexContractMetadata.abi, address);
  }

  async getHotelInstance (address) {
    return this._getInstance('hotel', HotelContractMetadata.abi, address);
  }

  decodeLogs (logs) {
    return abiDecoder.decodeLogs(logs);
  }
}
export default Contracts;

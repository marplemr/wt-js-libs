import abiDecoder from 'abi-decoder';
import WTIndexContractMetadata from '@windingtree/wt-contracts/build/contracts/WTIndex';
import HotelContractMetadata from '@windingtree/wt-contracts/build/contracts/Hotel';

/**
 * Wrapper class for work with Winding Tree's Ethereum
 * smart contracts.
 */
class Contracts {
  /**
   * Returns an initialized instance
   *
   * @param  {Web3} web3 instance created by `new Web3(provider)`
   * @return {Contracts}
   */
  static createInstance (web3) {
    return new Contracts(web3);
  }

  constructor (web3) {
    this.web3 = web3;
  }

  /**
   * Generic method for getting an instance of `web3.eth.Contract`
   *
   * @param  {string} name of contract, used in errors
   * @param  {Object} abi specification of contract
   * @param  {string} address on which we should look for the contract
   * @throws {Error} When address is invalid
   * @throws {Error} When no code is deployed on given address
   * @return {web3.eth.Contract} Resulting wrapper contract
   */
  async __getInstance (name, abi, address) {
    if (!this.web3.utils.isAddress(address)) {
      throw new Error('Cannot get ' + name + ' instance at an invalid address ' + address);
    }
    const deployedCode = await this.web3.eth.getCode(address);
    if (deployedCode === '0x0') {
      throw new Error('Cannot get ' + name + ' instance at an address with no code ' + address);
    }
    return new this.web3.eth.Contract(abi, address);
  }

  /**
   * Returns a representation of <a href="https://github.com/windingtree/wt-contracts/blob/v0.2.0/contracts/WTIndex.sol">WTIndex.sol</a>.
   *
   * @param  {string} address
   * @return {web3.eth.Contract} Instance of an Index
   */
  async getIndexInstance (address) {
    return this.__getInstance('index', WTIndexContractMetadata.abi, address);
  }

  /**
   * Returns a representation of <a href="https://github.com/windingtree/wt-contracts/blob/v0.2.0/contracts/hotel/Hotel.sol">Hotel.sol</a>.
   *
   * @param  {string} address
   * @return {web3.eth.Contract} Instance of a Hotel
   */
  async getHotelInstance (address) {
    return this.__getInstance('hotel', HotelContractMetadata.abi, address);
  }

  __initAbiDecoder () {
    const existingAbis = abiDecoder.getABIs();
    if (existingAbis.length === 0) {
      abiDecoder.addABI(WTIndexContractMetadata.abi);
      abiDecoder.addABI(HotelContractMetadata.abi);
    }
  }

  /**
   * Decodes ethereum transaction log values. Currently supports
   * events from Index and Hotel smart contracts.
   *
   * @param  {Array<RawLogRecordInterface>} logs in a raw format
   * @return {Array<DecodedLogRecordInterface>} Decoded logs
   */
  decodeLogs (logs) {
    this.__initAbiDecoder();
    return abiDecoder.decodeLogs(logs);
  }
}
export default Contracts;

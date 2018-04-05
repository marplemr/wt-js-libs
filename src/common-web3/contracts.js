import TruffleContract from 'truffle-contract';
import WTIndexContractMetadata from '@windingtree/wt-contracts/build/contracts/WTIndex';
import HotelContractMetadata from '@windingtree/wt-contracts/build/contracts/Hotel';

// dirty hack for web3@1.0.0 support for localhost testrpc, see
// https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
function hackInSendAsync (instance) {
  if (typeof instance.currentProvider.sendAsync !== 'function') {
    instance.currentProvider.sendAsync = function () {
      return instance.currentProvider.send.apply(
        instance.currentProvider, arguments
      );
    };
  }
  return instance;
}

function getContractWithProvider (metadata, provider) {
  let contract = new TruffleContract(metadata);
  contract.setProvider(provider);
  contract = hackInSendAsync(contract);
  return contract;
}

class Contracts {
  static async getIndexInstance (address, web3Provider) {
    // This does not support await syntax
    return getContractWithProvider(WTIndexContractMetadata, web3Provider).at(address)
      .then((instance) => {
        return instance;
      })
      .catch((err) => {
        // TODO better error handling
        // No code at address
        throw new Error('Cannot get index instance at ' + address + ': ' + err.message);
      });
  }
  static async getHotelInstance (address, web3Provider) {
    // This does not support await syntax
    return getContractWithProvider(HotelContractMetadata, web3Provider).at(address)
      .then((instance) => {
        return instance;
      })
      .catch((err) => {
        // TODO better error handling
        // No code at address
        throw new Error('Cannot get hotel instance at ' + address + ': ' + err.message);
      });
  }
}
export default Contracts;

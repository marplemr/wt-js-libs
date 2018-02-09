const _ = require('lodash');
const abiDecoder = require('abi-decoder');

const WTIndexContract = require('../../build/contracts/WTIndex.json');
const HotelContract = require('../../build/contracts/Hotel.json');
const UnitTypeContract = require('../../build/contracts/UnitType.json');
const UnitContract = require('../../build/contracts/Unit.json');
const AsyncCallContract = require('../../build/contracts/AsyncCall.json');
const LifTokenContract = require('../../build/contracts/LifToken.json');

abiDecoder.addABI(AsyncCallContract.abi);
abiDecoder.addABI(LifTokenContract.abi);
abiDecoder.addABI(HotelContract.abi);
abiDecoder.addABI(WTIndexContract.abi);
abiDecoder.addABI(UnitTypeContract.abi);
abiDecoder.addABI(UnitContract.abi);

const abis = {
  WTIndex: WTIndexContract.abi,
  Hotel: HotelContract.abi,
  LifToken: LifTokenContract.abi,
  HotelUnit: UnitContract.abi,
  HotelUnitType: UnitTypeContract.abi
};

const binaries = {
  WTIndex: WTIndexContract.bytecode,
  Hotel: HotelContract.bytecode,
  LifToken: LifTokenContract.bytecode,
  HotelUnit: UnitContract.bytecode,
  HotelUnitType: UnitTypeContract.bytecode
}

const getContractInstance = function (web3, name, address) {
  const abi = abis[name];
  const contract = new web3.eth.Contract(abi, address);
  contract.setProvider(web3.currentProvider);
  return contract;
};


module.exports = function (web3) {
  return {
    abiDecoder: abiDecoder,
    abis: abis,
    binaries: binaries,
    getContractInstance: _.partial(getContractInstance, web3),
  }
};
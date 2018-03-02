const _ = require('lodash');

/**
 * Deploys an arbitary contract
 * @param  {Address} owner
 * @param  {Instance} instance      web3 1.0 contract instance
 * @param  {Object}   deployOptions options passed the web3 deployment method
 * @param  {Number}   gasMargin
 * @return {Promievent}
 */
async function _deployContract (web3, utils, owner, instance, deployOptions, gasMargin) {
  const data = await instance
    .deploy(deployOptions)
    .encodeABI();

  const options = {
    from: owner,
    data: data,
  };

  const estimate = await web3.eth.estimateGas(options);
  options.gas = await utils.addGasMargin(estimate, gasMargin);

  return web3.eth.sendTransaction(options);
}

// Prepared in init function
let deployContract;

/**
 * Deploys an Index contract that functions as a registry and transaction entry
 * point for the contract system's Hotels.
 * system's Hotels
 * @param  {Address}  owner
 * @return {Instance}         WTIndex instance
 */
async function deployIndex (web3, contracts, owner, gasMargin) {
  const abi = contracts.abis.WTIndex;
  const instance = new web3.eth.Contract(abi);

  const deployOptions = {
    data: contracts.binaries.WTIndex,
    arguments: [],
  };

  const tx = await deployContract(owner, instance, deployOptions, gasMargin);
  return contracts.getContractInstance('WTIndex', tx.contractAddress);
}

/**
 * Deploys a Unit contract which will subsequently be added to a Hotel's list of units
 * @param  {String}  unitType     name of this unit's UnitType, ex: `BASIC_ROOM`
 * @param  {Address} hotelAddress address of the Hotel instance that will own this contract
 * @param  {Address}  owner
 * @param  {Number}   gasMargin
 * @return {Promievent}           web3 deployment result
 */
async function deployUnit (web3, contracts, unitType, hotelAddress, owner, gasMargin) {
  const typeHex = web3.utils.toHex(unitType);
  const abi = contracts.abis.HotelUnit;
  const instance = new web3.eth.Contract(abi);

  const deployOptions = {
    data: contracts.binaries.HotelUnit,
    arguments: [hotelAddress, typeHex],
  };

  const tx = await deployContract(owner, instance, deployOptions, gasMargin);
  return contracts.getContractInstance('HotelUnitType', tx.contractAddress);
}

/**
 * Deploys a UnitType contract which will subsequently be added to a Hotel's list of unit types
 * @param  {String}  unitType     name of UnitType, ex: `BASIC_ROOM`
 * @param  {Address} hotelAddress address of the Hotel instance that will own this contract
 * @param  {Address}  owner
 * @param  {Number}   gasMargin
 * @return {Instance}             UnitType contract instance
 */
async function deployUnitType (web3, contracts, unitType, hotelAddress, owner, gasMargin) {
  const typeHex = web3.utils.toHex(unitType);
  const abi = contracts.abis.HotelUnitType;
  const instance = await new web3.eth.Contract(abi);

  const deployOptions = {
    data: contracts.binaries.HotelUnitType,
    arguments: [hotelAddress, typeHex],
  };

  const tx = await deployContract(owner, instance, deployOptions, gasMargin);
  return contracts.getContractInstance('HotelUnitType', tx.contractAddress);
}

module.exports = function (web3, utils, contracts) {
  deployContract = _.partial(_deployContract, web3, utils);
  return {
    deployContract: deployContract, // TODO needs to be public?
    deployIndex: _.partial(deployIndex, web3, contracts),
    deployUnit: _.partial(deployUnit, web3, contracts),
    deployUnitType: _.partial(deployUnitType, web3, contracts),
  };
};

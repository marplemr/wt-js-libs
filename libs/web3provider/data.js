const _ = require('lodash');
const request = require('superagent');


/**
 * Async method that gets the index of a unit type the user intends to work with
 * @param  {Instance} hotel    Hotel
 * @param  {String}   unitType ex: 'BASIC_ROOM'
 * @return {Number}
 */
async function getUnitTypeIndex(web3, hotel, unitType) {
  const typeHex = web3.utils.toHex(unitType);
  const typeBytes32 = web3.utils.padRight(typeHex, 64);
  const typeNames = await hotel.methods.getUnitTypeNames().call();
  return typeNames.indexOf(typeBytes32);
}

/**
 * Async method that gets a hotel instance and its index number in the WTIndex parent contract
 * @param  {Address}  hotelAddress  contract address of Hotel instance
 * @param  {Address}  indexAddress
 * @param  {Address}  hotel owner
 * @return {Object}  { hotel: <instance>, index: <number> }
 */
async function getHotelAndIndex(contracts, hotelAddress, indexAddress, owner) {
  let wtIndex = contracts.getIndexInstance(indexAddress);

  const addresses = await wtIndex.methods.getHotelsByManager(owner).call();
  const index = await addresses.indexOf(hotelAddress);
  const hotel = contracts.getHotelInstance(hotelAddress);
  return {
    hotel: hotel,
    index: index
  }
}

/**
 * Async method which gets all info associated with hotel, its unit types and units. Zero
 * elements in the solidity arrays are filtered out and data types are converted from
 * their solidity form to JS, i.e. bytes32 --> utf8.
 * @param  {Instance} wtHotel   Hotel contract instance
 * @return {Object}   data
 */
async function getHotelInfo(web3, utils, contracts, wtHotel) {

  // UnitTypes & Amenities
  const unitTypes = {};
  let unitTypeNames = await wtHotel.methods.getUnitTypeNames().call();
  unitTypeNames = unitTypeNames.filter(name => !utils.isZeroBytes32(name))

  if (unitTypeNames.length) {
    for (let typeName of unitTypeNames) {
      const unitType = await wtHotel.methods.getUnitType(typeName).call();
      const instance = contracts.getHotelUnitTypeInstance(unitType);

      const name = web3.utils.toUtf8(typeName);
      unitTypes[name] = {};
      unitTypes[name].address = instance._address;

      // UnitType Amenities
      const amenities = await instance.methods.getAmenities().call();
      unitTypes[name].amenities = amenities.filter(item => !utils.isZeroUint(item))
                                           .map(item => parseInt(item));

      const info = await instance.methods.getInfo().call();

      unitTypes[name].info = {
        description: utils.isZeroString(info[0]) ? null : info[0],
        minGuests: utils.isZeroUint(info[1]) ? null : parseInt(info[1]),
        maxGuests: utils.isZeroUint(info[2]) ? null : parseInt(info[2]),
        price: utils.isZeroString(info[3]) ? null : info[3],
      }

      // UnitType Images
      const length = await instance.methods.getImagesLength().call();
      const images = await utils.jsArrayFromSolidityArray(
        instance.methods.images,
        parseInt(length)
      );
      unitTypes[name].images = images;
    };
  }

  // Hotel Images
  const imagesLength = await wtHotel.methods.getImagesLength().call();
  const images = await utils.jsArrayFromSolidityArray(
    wtHotel.methods.images,
    parseInt(imagesLength)
  );

  // Hotel Units
  const units = {};
  const unitsLength = await wtHotel.methods.getUnitsLength().call();
  const unitAddresses = await utils.jsArrayFromSolidityArray(
    wtHotel.methods.units,
    parseInt(unitsLength),
    utils.isZeroAddress
  );

  if(unitAddresses.length) {
    for (let address of unitAddresses) {
      const instance = contracts.getHotelUnitInstance(address);
      units[address] = {};
      units[address].active = await instance.methods.active().call();

      const unitType = await instance.methods.unitType().call();
      units[address].unitType = utils.bytes32ToString(unitType);

      const code = await instance.methods.currencyCode().call();
      units[address].currencyCode = utils.isZeroBytes8(code) ? null : utils.currencyCodes.number(web3.utils.hexToNumber(code)).code;

      const defaultPrice = await instance.methods.defaultPrice().call();
      units[address].defaultPrice = utils.isZeroUint(defaultPrice) ? null : utils.bnToPrice(defaultPrice);

      let lifWei = await instance.methods.defaultLifPrice().call();
      lifWei = utils.lifWei2Lif(lifWei);
      units[address].defaultLifPrice = utils.isZeroUint(lifWei) ? null : parseInt(lifWei);
    }
  }

  // Hotel Info
  const name =             await wtHotel.methods.name().call();
  const description =      await wtHotel.methods.description().call();
  const manager =          await wtHotel.methods.manager().call();
  const lineOne =          await wtHotel.methods.lineOne().call();
  const lineTwo =          await wtHotel.methods.lineTwo().call();
  const zip =              await wtHotel.methods.zip().call();
  const country =          await wtHotel.methods.country().call();
  const created =          await wtHotel.methods.created().call();
  const timezone =         await wtHotel.methods.timezone().call();
  const latitude =         await wtHotel.methods.latitude().call();
  const longitude =        await wtHotel.methods.longitude().call();
  const waitConfirmation = await wtHotel.methods.waitConfirmation().call();

  return {
    name: name,
    description: description,
    manager: manager,
    lineOne: lineOne,
    lineTwo: lineTwo,
    zip: zip,
    country: country,
    created: parseInt(created),
    timezone: parseInt(timezone),
    latitude: utils.locationFromUint(longitude, latitude).lat,
    longitude: utils.locationFromUint(longitude, latitude).long,
    waitConfirmation: waitConfirmation,
    images: images,
    unitTypeNames: unitTypeNames.map(name => utils.bytes32ToString(name)),
    unitTypes: unitTypes,
    units: units,
    unitAddresses: unitAddresses,
  }
}

//modified version of https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
async function _getTransactionsByAccount(web3, myaccount, startBlockNumber, endBlockNumber) {
  if (endBlockNumber == null) {
    endBlockNumber = await web3.eth.getBlockNumber();
  }
  if (startBlockNumber == null) {
    startBlockNumber = endBlockNumber - 1000;
  }
  let txs = [];
  for (var i = startBlockNumber; i <= endBlockNumber; i++) {
    var block = await web3.eth.getBlock(i, true);
    if (block != null && block.transactions != null) {
      block.transactions.forEach( function(e) {
        if (myaccount == e.from) {
          e.timeStamp = block.timestamp;
          txs.push(e);
        }
      })
    }
  }
  return txs;
}

// Populated during init
let getTransactionsByAccount;

function _beginCall(abiDecoder, _method, _txData, _tx) {
  const newMethod = abiDecoder.decodeMethod(_method.params.find(call => call.name === 'publicCallData').value);
  if(newMethod.name == 'book') {
    newMethod.name = 'requestToBook';
  }
  if(newMethod.name == 'bookWithLif') {
    newMethod.name = 'requestToBookWithLif';
  }
  if (!_txData.hotel) {
    _txData.hotel = _tx.to;
  }
  return newMethod
}

async function _callHotel(web3, contracts, hotelInstances, _method, _txData, _hotelsAddrs){
  let hotelIndex = _method.params.find(call => call.name === 'index').value;
  _txData.hotel = _hotelsAddrs[hotelIndex];
  let newMethod = contracts.abiDecoder.decodeMethod(_method.params.find(call => call.name === 'data').value);
  if(newMethod.name == 'callUnitType' || newMethod.name == 'callUnit') {
    newMethod = contracts.abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
  }
  if(newMethod.name == 'continueCall') {
    let msgDataHash = newMethod.params.find(call => call.name === 'msgDataHash').value;
    if(!hotelInstances[txData.hotel]) {
      hotelInstances[txData.hotel] = await contracts.getHotelInstance(txData.hotel);
    }
    let publicCallData = await hotelInstances[txData.hotel].methods.getPublicCallData(msgDataHash).call();
    newMethod = contracts.abiDecoder.decodeMethod(publicCallData);
    if(newMethod.name == 'bookWithLif') {
      newMethod.name = 'confirmLifBooking';
      let receipt = await web3.eth.getTransactionReceipt(tx.hash);
      txData.lifAmount = contracts.abiDecoder.decodeLogs(receipt.logs).find(log => log.name == 'Transfer').events.find(e => e.name == 'value').value;
    }
    if(newMethod.name == 'book') {
      newMethod.name = 'confirmBooking';
    }
  }
  return newMethod;
}

async function _getRawTxs(networkName, walletAddress, startBlock) {
  if(networkName === 'test') {
    return getTransactionsByAccount(walletAddress, 0, null);
  }
  rawTxs = await request.get('http://' + networkName + '.etherscan.io/api')
    .query({
      module: 'account',
      action: 'txlist',
      address: walletAddress,
      startBlock: startBlock,
      endBlock: 'latest',
      apikey: '6I7UFMJTUXG6XWXN8BBP86DWNHC9MI893F'
    });
  return rawTxs.body.result;
}


/**
  Decodes the method called for a single TX
*/
async function decodeTxInput(web3, utils, contracts, txHash, indexAddress, walletAddress) {
  let wtIndex = contracts.getIndexInstance(indexAddress);
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let hotelInstances = [];

  let tx = await web3.eth.getTransaction(txHash);
  let txData = {hash: txHash};
  txData.status = tx.blockNumber ? 'mined' : 'pending';
  let method = contracts.abiDecoder.decodeMethod(tx.input);
  if(method.name == 'callHotel') {
    method = await _callHotel(web3, contracts, hotelInstances, method, txData, hotelsAddrs);
  }
  if(method.name == 'beginCall') {
    method = _beginCall(contracts.abiDecoder, method, txData, tx);
  }
  method.name = utils.splitCamelCaseToString(method.name);
  txData.method = method;
  return txData;
}


/**
  Returns all transactions between a hotel manager and WTIndex.
  Uses the etherscan API (unless running a local blockchain).
  @param {Address} walletAddress Manager's address
  @param {Address} indexAddress  WTIndex address
  @param {Number}  startBlock    Block number to start searching from
  @param {String}  networkName   Name of the ethereum network ('api' for main, 'test' for local)
*/
async function getDecodedTransactions(web3, utils, contracts, walletAddress, indexAddress, startBlock, networkName) {
  let txs = [];

  //Get manager's hotel addresses
  let wtIndex = contracts.getIndexInstance(indexAddress);
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let hotelInstances = [];
  let wtAddresses = [indexAddress].concat(hotelsAddrs);
  let rawTxs = await _getRawTxs(networkName, walletAddress, startBlock);

  //Decode the TXs
  const start = async () => {
    await Promise.all(rawTxs.map(async tx => {
      if(tx.to && wtAddresses.includes(web3.utils.toChecksumAddress(tx.to))) {
        let txData = {};
        txData.hash = tx.hash;
        txData.timeStamp = tx.timeStamp;
        let method = contracts.abiDecoder.decodeMethod(tx.input);
        if(method.name == 'callHotel') {
          method = await _callHotel(web3, contracts, hotelInstances, method, txData, hotelsAddrs);
        }
        //Only called when requesting to book a unit
        if(method.name == 'beginCall') {
          method = _beginCall(contracts.abiDecoder, method, txData, tx);
        }
        method.name = utils.splitCamelCaseToString(method.name);
        txData.method = method;
        txs.push(txData);
      }
    }));
  }
  await start();

  return txs;
}

/**
  Returns all booking made by one address.
  Uses the etherscan API (unless running a local blockchain).
  @param {Address} walletAddress Booker's address
  @param {Address} indexAddress  WTIndex address
  @param {Number}  startBlock    Block number to start searching from
  @param {String}  networkName   Name of the ethereum network ('api' for main, 'test' for local)
*/
async function getBookingTransactions(web3, utils, contracts, walletAddress, indexAddress, startBlock, networkName) {
  let txs = [];

  //Get manager's hotel addresses
  let wtIndex = contracts.getIndexInstance(indexAddress);
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let lifTokenAddr = await wtIndex.methods.LifToken().call();
  let hotelInstances = [];
  let wtAddresses = [lifTokenAddr].concat(hotelsAddrs);
  let rawTxs = await _getRawTxs(networkName, walletAddress, startBlock);

  //Decode the TXs
  const start = async () => {
    await Promise.all(rawTxs.map(async tx => {
      if(tx.to && wtAddresses.includes(web3.utils.toChecksumAddress(tx.to))) {
        let txData = {};
        txData.hash = tx.hash;
        txData.timeStamp = tx.timeStamp;
        let method = contracts.abiDecoder.decodeMethod(tx.input);
        if(!method) return;
        if(method.name == 'approveData') {
          txData.hotel = method.params.find(param => param.name === 'spender').value;
          method = contracts.abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
        }
        //Only called when requesting to book a unit
        if(method.name == 'beginCall') {
          method = _beginCall(contracts.abiDecoder, method, txData, tx);
          //Get Hotel info
          if(!hotelInstances[txData.hotel]) {
            hotelInstances[txData.hotel] = await contracts.getContractInstance('Hotel', txData.hotel);
          }
          txData.hotelName = await hotelInstances[txData.hotel].methods.name().call();
          //Parse to and from dates
          txData.fromDate = new Date();
          txData.fromDate.setTime(method.params.find(param => param.name === 'fromDay').value * 86400000);
          txData.toDate = new Date();
          txData.toDate.setTime((Number(method.params.find(param => param.name === 'fromDay').value) + Number(method.params.find(param => param.name === 'daysAmount').value)) * 86400000);
          //Get Unit info
          txData.unit = method.params.find(param => param.name === 'unitAddress').value;
          let unitInstance = await contracts.getContractInstance('HotelUnit', txData.unit);
          txData.unitType = utils.bytes32ToString(await unitInstance.methods.unitType().call());
          //Get booking status
          let receipt = await web3.eth.getTransactionReceipt(tx.hash);
          let logs = contracts.abiDecoder.decodeLogs(receipt.logs);
          let dataHash = (logs.find(log => log.name === "CallStarted").events).find(event => event.name === 'dataHash').value;
          let bookingStatus = (await hotelInstances[txData.hotel].methods.pendingCalls(dataHash).call())[2];
          txData.status = bookingStatus;
          txData.logs = logs;
          method.name = utils.splitCamelCaseToString(method.name);
          txData.method = method;
          txs.push(txData);
        }
      }
    }));
  }
  await start();
  return txs;
}

/**
 * Extracts the guest data from an instant payment Booking initiated by
 * a `token.approveData` transaction.
 * @param  {String} hash    transaction hash, available on the `CallStarted` event
 * @return {String}      plain text guest data. If this is JSON it will need to be parsed.
 */
async function getGuestData(web3, abiDecoder, hash) {
  let guestData;
  let tx = await web3.eth.getTransaction(hash);
  let method = abiDecoder.decodeMethod(tx.input);

  if (method.name === 'approveData'){
    const paramData = method.params.filter(call => call.name === 'data')[0].value;
    method = abiDecoder.decodeMethod(paramData);
  }

  guestData = method.params.filter(call => call.name === 'privateData')[0].value;
  return web3.utils.toUtf8(guestData);
}

module.exports = function (web3, utils, contracts) {
  getTransactionsByAccount = _.partial(_getTransactionsByAccount, web3);
  return {
      decodeTxInput: _.partial(decodeTxInput, web3, utils, contracts),
      getGuestData: _.partial(getGuestData, web3, contracts.abiDecoder),
      getUnitTypeIndex: _.partial(getUnitTypeIndex, web3),
      getHotelInfo: _.partial(getHotelInfo, web3, utils, contracts),
      getHotelAndIndex: _.partial(getHotelAndIndex, contracts),
      getTransactionsByAccount: getTransactionsByAccount,
      getBookingTransactions: _.partial(getBookingTransactions, web3, utils, contracts),
      getDecodedTransactions: _.partial(getDecodedTransactions, web3, utils, contracts),
  }
}

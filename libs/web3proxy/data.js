const _ = require('lodash');

/**
 * Async method that gets the index of a unit type the user intends to remove
 * @param  {Instance} hotel    Hotel
 * @param  {String}   unitType ex: 'BASIC_ROOM'
 * @param  {Object}   context  ex: context.web3
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
 * @param  {Address}  address  contract address of Hotel instance
 * @param  {Object}   context  {WTIndex: <Instance>, owner: <address>, web3: <web3>}
 * @return {Promise}  { hotel: <instance>, index: <number> }
 */
async function getHotelAndIndex(contracts, hotelAddress, indexAddress, owner) {
  let wtIndex = contracts.getContractInstance('WTIndex', indexAddress);

  const addresses = await wtIndex.methods.getHotelsByManager(owner).call();
  const index = await addresses.indexOf(hotelAddress);
  const hotel = contracts.getContractInstance('Hotel', hotelAddress);
  return {
    hotel: hotel,
    index: index
  }
}

/**
 * Async method which gets all info associated with hotel, its unit types and units. Zero
 * elements in the solidity arrays are filtered out and data types are converted from
 * their solidity form to JS, i.e. bytes32 --> utf8.
 * @param  {Object}   web3
 * @param  {Object}   utils
 * @param  {Object}   contracts
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
      const instance = contracts.getContractInstance('HotelUnitType', unitType);

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
      const instance = contracts.getContractInstance('HotelUnit', address);
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

/**
  Returns all transactions between a hotel manager and WTIndex.
  Uses the etherscan API (unless running a local blockchain).
  @param {Address} walletAddress Manager's address
  @param {Address} indexAddress  WTIndex address
  @param {Number}  startBlock    Block number to start searching from
  @param {Object}  web3          Web3 instance
  @param {String}  networkName   Name of the ethereum network ('api' for main, 'test' for local)
*/
// TODO tests
async function getDecodedTransactions(walletAddress, indexAddress, startBlock, web3, networkName) {
  let txs = [];
  let rawTxs = [];

  //Get manager's hotel addresses
  let wtIndex = getInstance('WTIndex', indexAddress, {web3: web3});
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let hotelInstances = [];
  let wtAddresses = [indexAddress].concat(hotelsAddrs);

  //Obtain TX data, either from etherscan or from local chain
  if(networkName != 'test') {
    rawTxs = await request.get('http://'+networkName+'.etherscan.io/api')
      .query({
        module: 'account',
        action: 'txlist',
        address: walletAddress,
        startBlock: startBlock,
        endBlock: 'latest',
        apikey: '6I7UFMJTUXG6XWXN8BBP86DWNHC9MI893F'
      });
    rawTxs = rawTxs.body.result;
    indexAddress = indexAddress.toLowerCase();
  } else {
    rawTxs = await getTransactionsByAccount(walletAddress, 0, null, web3);
  }

  //Decode the TXs
  const start = async () => {
    await Promise.all(rawTxs.map(async tx => {
      if(tx.to && wtAddresses.includes(web3.utils.toChecksumAddress(tx.to))) {
        let txData = {};
        txData.hash = tx.hash;
        txData.timeStamp = tx.timeStamp;
        let method = abiDecoder.decodeMethod(tx.input);
        if(method.name == 'callHotel') {
          let hotelIndex = method.params.find(call => call.name === 'index').value;
          txData.hotel = hotelsAddrs[hotelIndex];
          method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
          if(method.name == 'callUnitType' || method.name == 'callUnit') {
            method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
          }
          if(method.name == 'continueCall') {
            let msgDataHash = method.params.find(call => call.name === 'msgDataHash').value;
            if(!hotelInstances[txData.hotel]) {
              hotelInstances[txData.hotel] = await getInstance('Hotel', txData.hotel, {web3: web3});
            }
            let publicCallData = await hotelInstances[txData.hotel].methods.getPublicCallData(msgDataHash).call();
            method = abiDecoder.decodeMethod(publicCallData);
            if(method.name == 'bookWithLif') {
              method.name = 'confirmLifBooking';
              let receipt = await web3.eth.getTransactionReceipt(tx.hash);
              txData.lifAmount = abiDecoder.decodeLogs(receipt.logs).find(log => log.name == 'Transfer').events.find(e => e.name == 'value').value;
            }
            if(method.name == 'book') {
              method.name = 'confirmBooking';
            }
          }
        }
        //Only called when requesting to book a unit
        if(method.name == 'beginCall') {
          method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'publicCallData').value);
          if(method.name == 'book') method.name = 'requestToBook';
          if(method.name == 'bookWithLif') method.name = 'requestToBookWithLif';
          txData.hotel = tx.to;
        }
        method.name = splitCamelCaseToString(method.name);
        txData.method = method;
        txs.push(txData);
      }
    }))
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
  @param {Object}  web3          Web3 instance
  @param {String}  networkName   Name of the ethereum network ('api' for main, 'test' for local)
*/
// TODO tests
async function getBookingTransactions(walletAddress, indexAddress, startBlock, web3, networkName) {
  let txs = [];
  let rawTxs = [];

  //Get manager's hotel addresses
  let wtIndex = getInstance('WTIndex', indexAddress, {web3: web3});
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let lifTokenAddr = await wtIndex.methods.LifToken().call();
  let hotelInstances = [];
  let wtAddresses = [lifTokenAddr].concat(hotelsAddrs);


  //Obtain TX data, either from etherscan or from local chain
  if(networkName != 'test') {
    rawTxs = await request.get('http://'+networkName+'.etherscan.io/api')
      .query({
        module: 'account',
        action: 'txlist',
        address: walletAddress,
        startBlock: startBlock,
        endBlock: 'latest',
        apikey: '6I7UFMJTUXG6XWXN8BBP86DWNHC9MI893F'
      });
    rawTxs = rawTxs.body.result;
    indexAddress = indexAddress.toLowerCase();
  } else {
    rawTxs = await getTransactionsByAccount(walletAddress, 0, null, web3);
  }

  //Decode the TXs
  const start = async () => {
    await Promise.all(rawTxs.map(async tx => {
      if(tx.to && wtAddresses.includes(web3.utils.toChecksumAddress(tx.to))) {
        let txData = {};
        txData.hash = tx.hash;
        txData.timeStamp = tx.timeStamp;
        let method = abiDecoder.decodeMethod(tx.input);
        if(!method) return;
        if(method.name == 'approveData') {
          txData.hotel = method.params.find(param => param.name === 'spender').value;
          method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
        }
        //Only called when requesting to book a unit
        if(method.name == 'beginCall') {
          method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'publicCallData').value);
          if(method.name == 'book') method.name = 'requestToBook';
          if(method.name == 'bookWithLif') method.name = 'requestToBookWithLif';
          if(!txData.hotel) txData.hotel = tx.to;
          //Get Hotel info
          if(!hotelInstances[txData.hotel]) {
            hotelInstances[txData.hotel] = await getInstance('Hotel', txData.hotel, {web3: web3});
          }
          txData.hotelName = await hotelInstances[txData.hotel].methods.name().call();
          //Parse to and from dates
          txData.fromDate = new Date();
          txData.fromDate.setTime(method.params.find(param => param.name === 'fromDay').value * 86400000);
          txData.toDate = new Date();
          txData.toDate.setTime((Number(method.params.find(param => param.name === 'fromDay').value) + Number(method.params.find(param => param.name === 'daysAmount').value)) * 86400000);
          //Get Unit info
          txData.unit = method.params.find(param => param.name === 'unitAddress').value;
          let unitInstance = await getInstance('HotelUnit', txData.unit, {web3: web3});
          txData.unitType = bytes32ToString(await unitInstance.methods.unitType().call());
          //Get booking status
          let receipt = await web3.eth.getTransactionReceipt(tx.hash);
          let logs = abiDecoder.decodeLogs(receipt.logs);
          let dataHash = (logs.find(log => log.name === "CallStarted").events).find(event => event.name === 'dataHash').value;
          let bookingStatus = (await hotelInstances[txData.hotel].methods.pendingCalls(dataHash).call())[2];
          txData.status = bookingStatus;
          txData.logs = logs;
          method.name = splitCamelCaseToString(method.name);
          txData.method = method;
          txs.push(txData);
        }

      }
    }))
  }
  await start();

  return txs;
}

/**
 * Extracts the guest data from an instant payment Booking initiated by
 * a `token.approveData` transaction.
 * @param  {String} hash    transaction hash, available on the `CallStarted` event
 * @param  {Object} context execution context of the class ()
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
    return {
        getGuestData: _.partial(getGuestData, web3, contracts.abiDecoder),
        getUnitTypeIndex: _.partial(getUnitTypeIndex, web3),
        getHotelInfo: _.partial(getHotelInfo, web3, utils, contracts),
        getHotelAndIndex: _.partial(getHotelAndIndex, contracts),
    }
}
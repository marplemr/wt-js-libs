const _ = require('lodash');
const help = require('./misc.js');
const HotelManager = require('../../dist/node/wt-js-libs').HotelManager;

/**
 * Generates a randomly named hotel with a single 'BASIC_ROOM' UnitType and a single Unit
 * @param  {Address} indexAddress WTIndex contract address to register this hotel with
 * @param  {Address} ownerAccount Owner account
 * @param  {Number}  gasMargin    Floating point number to multiply gas estimates by
 * @param  {Object}  web3         Instantiated web3 provider
 * @return {Object}
 * @example
 *   const {
 *     Manager,       // HotelManager class instance
 *     hotelAddress,  // Address of deployed hotel
 *     unitAddress    // Address of deployed unit
 *   } = await generateCompleteHotel(indexAddress, ownerAccount, 1.5, web3);
 */
async function generateCompleteHotel(
  indexAddress,
  ownerAccount,
  gasMargin,
  web3provider,
  sync=true
){
  const hotelName = help.randomString(10);
  const hotelDescription = help.randomString(15);
  const typeName = 'BASIC_ROOM';

  const manager = new HotelManager({
    indexAddress: indexAddress,
    owner: ownerAccount,
    gasMargin: gasMargin,
    web3provider: web3provider
  })

  await manager.createHotel(hotelName, hotelDescription, sync);
  const hotels = await manager.getHotels();

  const hotelsArray = Object.keys(hotels);
  const latest = hotelsArray.length - 1;
  hotelAddress = hotelsArray[latest];

  await manager.addUnitType(hotelAddress, typeName, sync);
  await manager.addUnit(hotelAddress, typeName, sync);
  hotel = await manager.getHotel(hotelAddress);
  unitAddress = hotel.unitAddresses[0];

  return {
    Manager: manager,
    hotelAddress: hotelAddress,
    unitAddress: unitAddress
  }
}

module.exports = {
  generateCompleteHotel: generateCompleteHotel
}

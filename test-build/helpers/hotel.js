const help = require('./misc.js');

/**
 * Generates a randomly named hotel with a single 'BASIC_ROOM' UnitType and a single Unit
 * @param  {Object}  hotelManager         Instantiated HotelManager
 * @return {Object}
 * @example
 *   const {
 *     hotelAddress,  // Address of deployed hotel
 *     unitAddress,   // Address of deployed unit
 *     typeName,      // Name of deployed unit type
 *   } = await generateCompleteHotel(hotelManager);
 */
async function generateCompleteHotel (
  hotelManager
) {
  const hotelName = help.randomString(10);
  const hotelDescription = help.randomString(15);
  const typeName = 'BASIC_ROOM';

  await hotelManager.createHotel(hotelName, hotelDescription);
  const hotels = await hotelManager.getHotels();

  const hotelsArray = Object.keys(hotels);
  const latest = hotelsArray.length - 1;
  const hotelAddress = hotelsArray[latest];

  await hotelManager.addUnitType(hotelAddress, typeName);
  await hotelManager.addUnit(hotelAddress, typeName);
  const hotel = await hotelManager.getHotel(hotelAddress);
  const unitAddress = hotel.unitAddresses[0];

  return {
    hotelAddress: hotelAddress,
    unitAddress: unitAddress,
    typeName: typeName,
  };
}

module.exports = {
  generateCompleteHotel: generateCompleteHotel,
};

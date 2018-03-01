const BookingData = require('./BookingData.js');
const HotelEvents = require('./HotelEvents.js');
const HotelManager = require('./HotelManager.js');
const User = require('./User.js');
const web3providerFactory = require('./web3provider/index.js');

module.exports = {
    BookingData: BookingData,
    HotelEvents: HotelEvents,
    HotelManager: HotelManager,
    User: User,
    web3providerFactory: web3providerFactory,
};
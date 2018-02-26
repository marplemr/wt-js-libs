const BookingData = require('./BookingData.js');
const HotelEvents = require('./HotelEvents.js');
const HotelManager = require('./HotelManager.js');
const User = require('./User.js');
const Web3Proxy = require('./web3proxy/index.js');
const errors = require('./utils/errors.js');

module.exports = {
    BookingData: BookingData,
    HotelEvents: HotelEvents,
    HotelManager: HotelManager,
    User: User,
    Web3Proxy: Web3Proxy,
    errors: errors,
};
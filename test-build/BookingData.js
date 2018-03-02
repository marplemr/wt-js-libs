var chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const _ = require('lodash');
const moment = require('moment');
const Web3 = require('web3');

const help = require('./helpers/index');
const library = require('../dist/node/wt-js-libs');
const User = library.User;
const BookingData = library.BookingData;
const web3providerFactory = library.web3providerFactory;

const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

describe('BookingData', function() {
  let Manager;
  let token;
  let index;
  let accounts;
  let ownerAccount;
  let augusto;
  let jakub;
  let hotelAddress;
  let unitAddress;
  let web3provider;
  let typeName;

  before(async function() {
    web3provider = web3providerFactory.getInstance(web3);
    accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet
    } = await help.createWindingTreeEconomy(accounts, web3provider));

    ownerAccount = wallet["1"].address;
    augusto = wallet["2"].address;
    jakub = wallet["3"].address;
  })

  beforeEach( async function() {
    ({
      Manager,
      hotelAddress,
      unitAddress,
      typeName
    } = await help.generateCompleteHotel(index.options.address, ownerAccount, 1.5, web3provider));

    userOptions = {
      account: augusto,
      gasMargin: 1.5,
      tokenAddress: token.options.address,
      web3provider: web3provider,
    }

    user = new User(userOptions);
    data = new BookingData({web3provider: web3provider});
    hotel = web3provider.contracts.getHotelInstance(hotelAddress);
  });

  describe('getCost | getLifCost', function(){

    it('getCost: gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 100.00;
      const expectedCost = price * daysAmount;
      await Manager.setDefaultPrice(hotelAddress, typeName, price);
      const actualCost = await data.getCost(hotelAddress, unitAddress, fromDate, daysAmount);

      assert.equal(expectedCost, actualCost);
    })

    it('getLifCost gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 20;
      const expectedCost = price * daysAmount;

      await Manager.setDefaultLifPrice(hotelAddress, typeName, price);
      const actualCost = await data.getLifCost(hotelAddress, unitAddress, fromDate, daysAmount);

      assert.equal(expectedCost, actualCost);
    })
  });

  describe('unit availability', () => {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 100.00;
    const lifPrice = 1;
    const specialPrice = 200.00;
    const specialLifPrice = 2;

    it('returns a unit\'s price and availability for a range of dates', async () => {
      await Manager.setDefaultPrice(hotelAddress, typeName, price);
      await Manager.setDefaultLifPrice(hotelAddress, typeName, lifPrice);
      await Manager.setUnitSpecialPrice(hotelAddress, unitAddress, specialPrice, fromDate, 1);
      await Manager.setUnitSpecialLifPrice(hotelAddress, unitAddress, specialLifPrice, fromDate, 1);

      let availability = await data.unitAvailability(hotelAddress, unitAddress, fromDate, daysAmount);
      for(let date of availability) {
        if (date.day == web3provider.utils.formatDate(fromDate)) {
          assert.equal(date.price, specialPrice);
          assert.equal(date.lifPrice, specialLifPrice);
        } else {
          assert.equal(date.price, price);
          assert.equal(date.lifPrice, lifPrice);
        }
      }
    })

    it('given a single moment date, returns units price and availability for that month', async() => {
      await Manager.setDefaultPrice(hotelAddress, typeName, price);
      await Manager.setDefaultLifPrice(hotelAddress, typeName, lifPrice);
      await Manager.setUnitSpecialPrice(hotelAddress, unitAddress, specialPrice, fromDate, 1);
      await Manager.setUnitSpecialLifPrice(hotelAddress, unitAddress, specialLifPrice, fromDate, 1);

      let fromDateMoment = moment(fromDate);
      let availability = await data.unitMonthlyAvailability(hotelAddress, unitAddress, fromDateMoment);
      assert.equal(Object.keys(availability).length, 30);
      assert.equal(availability[web3provider.utils.formatDate(fromDate)].price, specialPrice);
    })
  })

  describe('getBookings', function() {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';

    it('gets a booking for a hotel', async() => {
      const aa = await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const bookings = await data.getBookings(hotelAddress);

      const booking = bookings[0];

      assert.equal(bookings.length, 1);
      assert.isString(booking.transactionHash);
      assert.isNumber(booking.blockNumber);
      assert.isString(booking.id);

      assert.equal(booking.guestData, guestData);
      assert.equal(booking.from, user.account);
      assert.equal(booking.fromDate.toString(), fromDate.toString());
      assert.equal(booking.unit, unitAddress);
      assert.equal(booking.daysAmount, daysAmount);
    });

    it('gets bookings for two hotels', async() => {
      const hotelTwo = await help.generateCompleteHotel(
        index.options.address,
        ownerAccount,
        1.5,
        web3provider
      );
      const hotelAddressTwo = hotelTwo.hotelAddress;
      const unitAddressTwo = hotelTwo.unitAddress;

      jakubOptions = {
        account: jakub,
        gasMargin: 1.5,
        tokenAddress: token.options.address,
        web3provider: web3provider
      }

      const jakubUser = new User(jakubOptions);

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      await jakubUser.bookWithLif(
        hotelAddressTwo,
        unitAddressTwo,
        fromDate,
        daysAmount,
        guestData
      );

      const bookings = await data.getBookings([hotelAddress, hotelAddressTwo]);
      assert.equal(bookings.length, 2);
      const augustoBooking = bookings.filter(item => item.from === augusto)[0];
      const jakubBooking = bookings.filter(item => item.from === jakub)[0];

      assert.isDefined(augustoBooking);
      assert.isDefined(jakubBooking);
    });

    it('gets bookings for a hotel starting from a specific block number', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      let bookings = await data.getBookings(hotelAddress);
      const firstBooking = bookings[0];

      assert.equal(bookings.length, 1);

      blockNumber = await web3.eth.getBlockNumber();
      blockNumber += 1;

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        new Date('10/10/2021'),
        daysAmount,
        guestData
      );

      bookings = await data.getBookings(hotelAddress, blockNumber);
      const secondBooking = bookings[0];

      assert.isDefined(firstBooking);
      assert.isDefined(secondBooking);
      assert.notDeepEqual(firstBooking, secondBooking);
    });

    it('returns an empty array if there are no bookings', async() => {
      const bookings = await data.getBookings(hotelAddress);
      assert.isArray(bookings);
      assert.equal(bookings.length, 0);
    });

    it('gets a booking for a hotel that requires confirmation', async() => {
      await Manager.setRequireConfirmation(hotelAddress, true);

      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      let requests = await data.getBookingRequests(hotelAddress);
      assert.equal(requests.length, 1);
      const firstRequest = requests[0];
      await Manager.confirmBooking(hotelAddress, firstRequest.dataHash);

      const bookings = await data.getBookings(hotelAddress);

      const booking = bookings[0];

      assert.equal(bookings.length, 1);
      assert.isString(booking.transactionHash);
      assert.isNumber(booking.blockNumber);
      assert.isString(booking.id);

      assert.equal(booking.guestData, guestData);
      assert.equal(booking.from, user.account);
      assert.equal(booking.fromDate.toString(), fromDate.toString());
      assert.equal(booking.unit, unitAddress);
      assert.equal(booking.daysAmount, daysAmount);
    });
  });

  describe('getBookingRequests', function(){
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';

    beforeEach(async () => await Manager.setRequireConfirmation(hotelAddress, true));

    it('gets pending booking requests for a hotel', async() => {
      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const requests = await data.getBookingRequests(hotelAddress);
      const request = requests[0];

      assert.equal(requests.length, 1);
      assert.isString(request.transactionHash);
      assert.isNumber(request.blockNumber);
      assert.isString(request.id);
      assert.isString(request.dataHash);

      assert.equal(request.guestData, guestData);
      assert.equal(request.from, user.account);

      assert.equalIgnoreCase(request.hotel, hotelAddress);
      assert.equalIgnoreCase(request.unit, unitAddress);
      assert.equal(request.fromDate.toString(), fromDate.toString());
      assert.equal(request.daysAmount, daysAmount);
    });

    it('gets booking requests for two hotels', async() => {

      const hotelTwo = await help.generateCompleteHotel(
        index.options.address,
        ownerAccount,
        1.5,
        web3provider
      );
      const managerTwo = hotelTwo.Manager;
      const hotelAddressTwo = hotelTwo.hotelAddress;
      const unitAddressTwo = hotelTwo.unitAddress;

      await managerTwo.setRequireConfirmation(hotelAddressTwo, true);

      jakubOptions = {
        account: jakub,
        gasMargin: 1.5,
        tokenAddress: token.options.address,
        web3provider: web3provider
      }

      const jakubUser = new User(jakubOptions);

      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      await jakubUser.book(
        hotelAddressTwo,
        unitAddressTwo,
        fromDate,
        daysAmount,
        guestData
      );

      const requests = await data.getBookingRequests([hotelAddress, hotelAddressTwo]);
      assert.equal(requests.length, 2);
      const augustoBooking = requests.filter(item => item.from === augusto)[0];
      const jakubBooking = requests.filter(item => item.from === jakub)[0];

      assert.isDefined(augustoBooking);
      assert.isDefined(jakubBooking);

      assert.equalIgnoreCase(augustoBooking.hotel, hotelAddress);
      assert.equalIgnoreCase(augustoBooking.unit, unitAddress);
      assert.equal(augustoBooking.fromDate.toString(), fromDate.toString());
      assert.equal(augustoBooking.daysAmount, daysAmount);

      assert.equalIgnoreCase(jakubBooking.hotel, hotelAddressTwo);
      assert.equalIgnoreCase(jakubBooking.unit, unitAddressTwo);
      assert.equal(jakubBooking.fromDate.toString(), fromDate.toString());
      assert.equal(jakubBooking.daysAmount, daysAmount);
    });

    it('gets booking requests for a hotel starting from a specific block number', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      let requests = await data.getBookingRequests(hotelAddress);
      const firstRequest = requests[0];

      assert.equal(requests.length, 1);

      blockNumber = await web3.eth.getBlockNumber();
      blockNumber += 1;

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        new Date('10/10/2021'),
        daysAmount,
        guestData
      );

      requests = await data.getBookingRequests(hotelAddress, blockNumber);
      const secondRequest = requests[0];

      assert.isDefined(firstRequest);
      assert.isDefined(secondRequest);
      assert.notDeepEqual(firstRequest, secondRequest);
    });

    it('filters out completed booking requests', async() => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      let requests = await data.getBookingRequests(hotelAddress);
      assert.equal(requests.length, 1);
      const firstRequest = requests[0];

      await Manager.confirmBooking(hotelAddress, firstRequest.dataHash);

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        new Date('10/10/2021'),
        daysAmount,
        guestData
      );

      requests = await data.getBookingRequests(hotelAddress);
      assert.equal(requests.length, 1);
      const secondRequest = requests[0];

      assert.isDefined(firstRequest);
      assert.isDefined(secondRequest);
      assert.notDeepEqual(firstRequest, secondRequest);
    });

    it('returns an empty array if there are no bookings', async() => {
      const requests = await data.getBookingRequests(hotelAddress);
      assert.isArray(requests);
      assert.equal(requests.length, 0);
    });
  })
});

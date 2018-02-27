var chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const sinon = require('sinon');

const _ = require('lodash');
const moment = require('moment');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);
const Web3Proxy = require('../libs/web3proxy');

const User = require('../libs/User');
const BookingData = require('../libs/BookingData');
const help = require('./helpers/index');

describe('BookingData', function() {
  const augusto = '0x8a33BA3429680B31383Fc46f4Ff22f7ac838511F';
  const jakub = '0xA38c43e02a680d21c58e2CcdD7504E55F79889b8';
  const hotelAddress = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
  const unitAddress = '0xdf3b7a20D5A08957AbE8d9366efcC38cfF00aea6';
  let web3proxy;
  let bookingData;

  beforeEach(async function() {
    web3proxy = Web3Proxy.getInstance(web3);
    bookingData = new BookingData({web3proxy: web3proxy});
  });

  describe('getCost | getLifCost', function() {

    it('getCost: gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 100.00;
      const expectedCost = price * daysAmount;

      sinon.stub(web3proxy.contracts, 'getHotelUnitInstance').returns({
        methods: {
          getCost: help.stubContractMethodResult(price * daysAmount * 100),
        }
      });

      const actualCost = await bookingData.getCost(unitAddress, fromDate, daysAmount);
      assert.equal(expectedCost, actualCost);
    });

    it('getLifCost gets the total cost for a booking over a range of days', async () => {
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const price = 20;
      const expectedCost = price * daysAmount;

      sinon.stub(web3proxy.contracts, 'getHotelUnitInstance').returns({
        methods: {
          getLifCost: help.stubContractMethodResult('' + price * daysAmount * web3proxy.utils.weiInLif),
        }
      });

      const actualCost = await bookingData.getLifCost(unitAddress, fromDate, daysAmount);
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

    beforeEach(() => {
      sinon.stub(web3proxy.contracts, 'getHotelUnitInstance').returns({
        methods: {
          defaultPrice: help.stubContractMethodResult(price  * 100),
          defaultLifPrice: help.stubContractMethodResult('' + lifPrice * web3proxy.utils.weiInLif),
          unitSpecialPrice: help.stubContractMethodResult(specialPrice * 100),
          unitSpecialLifPrice: help.stubContractMethodResult('' + specialLifPrice * web3proxy.utils.weiInLif),
          getReservation: help.stubContractMethodResult((args) => {
            // behave accordingly to date
            if (web3proxy.utils.formatDate(fromDate) == args.methodParams[0]) {
              return [specialPrice * 100, '' + specialLifPrice * web3proxy.utils.weiInLif, jakub];
            }
            return [0, '0', jakub];
          }),
        }
      });
    });

    afterEach(() => {
      web3proxy.contracts.getHotelUnitInstance.restore();
    });

    it('returns a unit\'s price and availability for a range of dates', async () => {
      let availability = await bookingData.unitAvailability(unitAddress, fromDate, daysAmount);
      for(let date of availability) {
        if (date.day == web3proxy.utils.formatDate(fromDate)) {
          assert.equal(date.price, specialPrice);
          assert.equal(date.lifPrice, specialLifPrice);
        } else {
          assert.equal(date.price, price);
          assert.equal(date.lifPrice, lifPrice);
        }
      }
    })

    it('given a single moment date, returns units price and availability for that month', async() => {
      let fromDateMoment = moment(fromDate);
      let availability = await bookingData.unitMonthlyAvailability(unitAddress, fromDateMoment);
      assert.equal(Object.keys(availability).length, 30);
      assert.equal(availability[web3proxy.utils.formatDate(fromDate)].price, specialPrice);
    })
  });

  describe('getBookings', function() {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';
    const hotelTwoAddress = '0x61a19c2cf1c761f4a4f5e1cfb129177d4afe893b';
    const unitTwoAddress = '0x7080e2142dbecb98818c29b1e20bbdb3fd82575c';
    let getPastEventsSpy1, getPastEventsSpy2, getHotelInstanceStub;

    beforeEach(() => {
      getPastEventsSpy1 = sinon.spy((type, options) => {
        let data = [];
        if (type == 'Book') {
          data.push({
            transactionHash: 'hash',
            blockNumber: 12,
            id: '123',
            returnValues: {
              from: augusto,
              unit: unitAddress,
              fromDay: web3proxy.utils.formatDate(fromDate),
              daysAmount: daysAmount,
            }
          });
        } else if (type == 'CallStarted') {
          data.push({
            returnValues: {
              dataHash: 'startedfinishedhash',
            },
            transactionHash: 'startedhash',
          });
        } else if (type == 'CallFinish') {
          data.push({
            returnValues: {
              dataHash: 'startedfinishedhash',
            },
            transactionHash: 'hash',
          });
        }
        return data;
      });
      getPastEventsSpy2 = sinon.spy((type, options) => {
        let data = [];
        if (type == 'Book') {
          data.push({
            transactionHash: 'hash2',
            blockNumber: 13,
            id: '1234',
            returnValues: {
              from: jakub,
              unit: unitTwoAddress,
              fromDay: web3proxy.utils.formatDate(fromDate),
              daysAmount: daysAmount,
            }
          });
        }
        return data;
      });
      getHotelInstanceStub = sinon.stub(web3proxy.contracts, 'getHotelInstance');
      getHotelInstanceStub.withArgs(hotelAddress).returns({
        getPastEvents: getPastEventsSpy1,
        methods: {
          waitConfirmation: help.stubContractMethodResult(false),
        }
      });
      getHotelInstanceStub.withArgs(hotelTwoAddress).returns({
        getPastEvents: getPastEventsSpy2,
        methods: {
          waitConfirmation: help.stubContractMethodResult(false),
        }
      });
      sinon.stub(web3proxy.data, 'getGuestData').returns(guestData);
    });

    afterEach(() => {
      getHotelInstanceStub.restore();
      web3proxy.data.getGuestData.restore();
    });

    it('gets a booking for a hotel', async() => {
      const bookings = await bookingData.getBookings(hotelAddress);
      const booking = bookings[0];
      assert.equal(bookings.length, 1);
      assert.isString(booking.transactionHash);
      assert.isNumber(booking.blockNumber);
      assert.isString(booking.id);
      assert.equal(web3proxy.data.getGuestData.firstCall.args[0], 'hash');

      assert.equal(booking.guestData, guestData);
      assert.equal(booking.from, augusto);
      assert.equal(booking.fromDate.toString(), fromDate.toString());
      assert.equal(booking.unit, unitAddress);
      assert.equal(booking.daysAmount, daysAmount);
    });

    it('gets bookings for two hotels', async() => {
      const bookings = await bookingData.getBookings([hotelAddress, hotelTwoAddress]);
      assert.equal(bookings.length, 2);
      const augustoBooking = bookings.filter(item => item.from === augusto)[0];
      const jakubBooking = bookings.filter(item => item.from === jakub)[0];

      assert.isDefined(augustoBooking);
      assert.isDefined(jakubBooking);
    });

    it('gets bookings for a hotel starting from a specific block number', async() => {
      let bookings = await bookingData.getBookings(hotelAddress, '1234');
      assert.equal(getPastEventsSpy1.callCount, 3);
      assert.equal(getPastEventsSpy1.firstCall.args[0], 'Book');
      assert.isDefined(getPastEventsSpy1.firstCall.args[1]);
      assert.isDefined(getPastEventsSpy1.firstCall.args[1].fromBlock);
      assert.equal(getPastEventsSpy1.firstCall.args[1].fromBlock, '1234');
    });

    it('returns an empty array if there are no bookings', async() => {
      web3proxy.contracts.getHotelInstance.restore();
      sinon.stub(web3proxy.contracts, 'getHotelInstance').returns({
        getPastEvents: () => [],
      });
      const bookings = await bookingData.getBookings(hotelAddress);
      assert.isArray(bookings);
      assert.equal(bookings.length, 0);
    });

    it('gets a booking for a hotel that requires confirmation', async() => {
      getHotelInstanceStub.restore();
      getHotelInstanceStub = sinon.stub(web3proxy.contracts, 'getHotelInstance');
      getHotelInstanceStub.withArgs(hotelAddress).returns({
        getPastEvents: getPastEventsSpy1,
        methods: {
          waitConfirmation: help.stubContractMethodResult(true),
        }
      });
      const bookings = await bookingData.getBookings(hotelAddress);
      const booking = bookings[0];
      assert.equal(web3proxy.data.getGuestData.firstCall.args[0], 'startedhash');
      assert.equal(bookings.length, 1);
      assert.isString(booking.transactionHash);
      assert.isNumber(booking.blockNumber);
      assert.isString(booking.id);

      assert.equal(booking.guestData, guestData);
      assert.equal(booking.from, augusto);
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
    const hotelTwoAddress = '0x61a19c2cf1c761f4a4f5e1cfb129177d4afe893b';
    const unitTwoAddress = '0x7080e2142dbecb98818c29b1e20bbdb3fd82575c';
    let getPastEventsSpy1, getPastEventsSpy2, getHotelInstanceStub;

    beforeEach(() => {
      getPastEventsSpy1 = sinon.spy((type, options) => {
        let data = [];
        if (type == 'CallStarted') {
          data.push({
            returnValues: {
              dataHash: 'startedfinishedhash',
              from: augusto,
            },
            transactionHash: 'startedhash',
            blockNumber: 13,
            id: '1234',
          });
        } else if (type == 'CallFinish') {
          data.push({
            returnValues: {
              dataHash: 'anotherstartedfinishedhash',
              from: augusto,
            },
            transactionHash: 'finishedhash',
            blockNumber: 13,
            id: '1235',
          });
        }
        return data;
      });
      getPastEventsSpy2 = sinon.spy((type, options) => {
        let data = [];
        if (type == 'CallStarted') {
          data.push({
            returnValues: {
              dataHash: 'startedfinishedhash2',
              from: jakub,
            },
            transactionHash: 'startedhash2',
            blockNumber: 13,
            id: '1236',
          });
        } else if (type == 'CallFinish') {
          data.push({
            returnValues: {
              dataHash: 'anotherstartedfinishedhash2',
              from: jakub,
            },
            transactionHash: 'finishedhash2',
            blockNumber: 13,
            id: '1237',
          });
        }
        return data;
      });
      getHotelInstanceStub = sinon.stub(web3proxy.contracts, 'getHotelInstance');
      getHotelInstanceStub.withArgs(hotelAddress).returns({
        getPastEvents: getPastEventsSpy1,
        methods: {
          waitConfirmation: help.stubContractMethodResult(true),
          getPublicCallData: help.stubContractMethodResult({
            unitAddress: unitAddress,
            fromDay: web3proxy.utils.formatDate(fromDate),
            daysAmount: daysAmount,
          }),
        }
      });
      getHotelInstanceStub.withArgs(hotelTwoAddress).returns({
        getPastEvents: getPastEventsSpy2,
        methods: {
          waitConfirmation: help.stubContractMethodResult(true),
          getPublicCallData: help.stubContractMethodResult({
            unitAddress: unitTwoAddress,
            fromDay: web3proxy.utils.formatDate(fromDate),
            daysAmount: daysAmount,
          }),
        }
      });
      sinon.stub(web3proxy.data, 'getGuestData').returns(guestData);
      sinon.stub(web3proxy.contracts.abiDecoder, 'decodeMethod').callsFake((arg0) => {
        return {
          params: _.map(arg0, (v, k) => {return {name: k, value: v}}),
        };
      });
    });

    afterEach(() => {
      getHotelInstanceStub.restore();
      web3proxy.data.getGuestData.restore();
      web3proxy.contracts.abiDecoder.decodeMethod.restore();
    });

    it('gets pending booking requests for a hotel', async() => {
      const requests = await bookingData.getBookingRequests(hotelAddress);
      const request = requests[0];

      assert.equal(requests.length, 1);
      assert.isString(request.transactionHash);
      assert.isNumber(request.blockNumber);
      assert.isString(request.id);
      assert.isString(request.dataHash);

      assert.equal(request.guestData, guestData);
      assert.equal(request.from, augusto);

      assert.equalIgnoreCase(request.hotel, hotelAddress);
      assert.equalIgnoreCase(request.unit, unitAddress);
      assert.equal(request.fromDate.toString(), fromDate.toString());
      assert.equal(request.daysAmount, daysAmount);
    });

    it('gets booking requests for two hotels', async() => {
      const requests = await bookingData.getBookingRequests([hotelAddress, hotelTwoAddress]);
      assert.equal(requests.length, 2);
      const augustoBooking = requests.filter(item => item.from === augusto)[0];
      const jakubBooking = requests.filter(item => item.from === jakub)[0];

      assert.isDefined(augustoBooking);
      assert.isDefined(jakubBooking);

      assert.equalIgnoreCase(augustoBooking.hotel, hotelAddress);
      assert.equalIgnoreCase(augustoBooking.unit, unitAddress);
      assert.equal(augustoBooking.fromDate.toString(), fromDate.toString());
      assert.equal(augustoBooking.daysAmount, daysAmount);

      assert.equalIgnoreCase(jakubBooking.hotel, hotelTwoAddress);
      assert.equalIgnoreCase(jakubBooking.unit, unitTwoAddress);
      assert.equal(jakubBooking.fromDate.toString(), fromDate.toString());
      assert.equal(jakubBooking.daysAmount, daysAmount);
    });

    it('gets booking requests for a hotel starting from a specific block number', async() => {
      await bookingData.getBookingRequests(hotelAddress, 123456);
      assert.equal(getPastEventsSpy1.callCount, 2);
      assert.equal(getPastEventsSpy1.firstCall.args[0], 'CallStarted');
      assert.isDefined(getPastEventsSpy1.firstCall.args[1]);
      assert.equal(getPastEventsSpy1.firstCall.args[1].fromBlock, 123456);
    });

    it('filters out completed booking requests', async() => {
      getHotelInstanceStub.restore();
      getHotelInstanceStub = sinon.stub(web3proxy.contracts, 'getHotelInstance');
      getHotelInstanceStub.withArgs(hotelAddress).returns({
        getPastEvents: (type, options) => {
          let data = [];
          if (type == 'CallStarted') {
            data.push({
              returnValues: {
                dataHash: 'startedfinishedhash',
                from: augusto,
              },
              transactionHash: 'startedhash',
              blockNumber: 13,
              id: '1234',
            });
            data.push({
              returnValues: {
                dataHash: 'startedfinishedhash2',
                from: augusto,
              },
              transactionHash: 'startedhash2',
              blockNumber: 13,
              id: '1234',
            });
          } else if (type == 'CallFinish') {
            data.push({
              returnValues: {
                dataHash: 'anotherstartedfinishedhash',
                from: augusto,
              },
              transactionHash: 'finishedhash',
              blockNumber: 13,
              id: '1235',
            });
            data.push({
              returnValues: {
                dataHash: 'startedfinishedhash',
                from: augusto,
              },
              transactionHash: 'finishedhash',
              blockNumber: 13,
              id: '1235',
            });
          }
          return data;
        },
        methods: {
          waitConfirmation: help.stubContractMethodResult(true),
          getPublicCallData: help.stubContractMethodResult({
            unitAddress: unitAddress,
            fromDay: web3proxy.utils.formatDate(fromDate),
            daysAmount: daysAmount,
          }),
        }
      });
      requests = await bookingData.getBookingRequests(hotelAddress);
      assert.equal(requests.length, 1);
    });

    it('returns an empty array if there are no bookings', async() => {
      getHotelInstanceStub.restore();
      getHotelInstanceStub = sinon.stub(web3proxy.contracts, 'getHotelInstance');
      getHotelInstanceStub.withArgs(hotelAddress).returns({
        getPastEvents: () => [],
      });
      const requests = await bookingData.getBookingRequests(hotelAddress);
      assert.isArray(requests);
      assert.equal(requests.length, 0);
    });
  })
});

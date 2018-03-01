const _ = require('lodash');
const moment = require('moment');
const validate = require('./utils/validators');
/**
 * Methods that let managers and clients query the blockchain about hotel booking costs, history,
 * and status.
 * @example
 *   const data = new BookingData(web3)
 */
class BookingData {

  /**
   * Instantiates with a web3 object whose provider has been set
   * @param  {Object} { web3provider: <web3provider> }
   * @return {BookingData}
   */
  constructor(options) {
    this.web3provider = options.web3provider;
  }

  getHotelUnitInstance(unitAddress) {
    return this.web3provider.contracts.getHotelUnitInstance(unitAddress);
  }

  getHotelInstance(hotelAddress) {
    return this.web3provider.contracts.getHotelInstance(hotelAddress);
  }

  addressToChecksum(address) {
    return this.web3provider.web3.utils.toChecksumAddress(address);
  }

  /**
   * Gets the national currency cost of a booking for a range of days. Check-in is on the
   * first day, check-out on the last.
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {Date}            fromDate     check-in date
   * @param  {Number}           daysAmount   integer number of days to book.
   * @return {Number}           Floating point cost ex: 100.00
   * @example
      const cost = await lib.getCost('0xab3..cd', new Date('5/31/2020'), 5);
   */
  async getCost(unitAddress, fromDate, daysAmount = 0){
    validate.addressAndRange({unitAddress, fromDate, daysAmount});

    const fromDay = this.web3provider.utils.formatDate(fromDate);
    const unit = this.web3provider.contracts.getHotelUnitInstance(unitAddress);
    const cost = await unit.methods.getCost(fromDay, daysAmount).call();
    return this.web3provider.utils.bnToPrice(cost);
  }

  /**
   * Gets the LifToken cost of a booking for a range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {Date }            fromDate     check-in date
   * @param  {Number}           daysAmount   integer number of days to book.
   * @return {Number}           Lif
   * @example
      const cost = await lib.getCost('0xab3..cd', new Date('5/31/2020'), 5);
   */
  async getLifCost(unitAddress, fromDate, daysAmount = 0){
    validate.addressAndRange({unitAddress, fromDate, daysAmount});

    const fromDay = this.web3provider.utils.formatDate(fromDate);
    const unit = this.getHotelUnitInstance(unitAddress);
    const wei = await unit.methods.getLifCost(fromDay, daysAmount).call();

    return this.web3provider.utils.lifWei2Lif(wei);
  }

  /**
   * Checks the availability of a unit for a range of days
   * @param  {Address} unitAddress Unit contract address
   * @param  {Date}    fromDate    check-in date
   * @param  {Number}  daysAmount  number of days
   * @return {Boolean}
   */
  async unitAvailability(unitAddress, fromDate, daysAmount = 0) {
    validate.addressAndRange({unitAddress, fromDate, daysAmount});

    const unit = this.getHotelUnitInstance(unitAddress);
    const fromDay = this.web3provider.utils.formatDate(fromDate);
    const isActive = await unit.methods.active().call();
    if (!isActive) {
      return false;
    }

    const range = _.range(fromDay, fromDay + daysAmount);
    const defaultPrice = (await unit.methods.defaultPrice().call()) / 100;
    const defaultLifPrice = this.web3provider.utils.lifWei2Lif(await unit.methods.defaultLifPrice().call());
    let availability = [];

    for (let day of range) {
      const reservationResult = await unit.methods.getReservation(day).call();
      const specialPrice = this.web3provider.utils.bnToPrice(reservationResult[0]);
      const specialLifPrice = this.web3provider.utils.lifWei2Lif(reservationResult[1], this.context);
      const bookedBy = reservationResult[2];

      availability.push({
        day: day,
        price: (specialPrice > 0) ? specialPrice : defaultPrice,
        lifPrice: (specialLifPrice > 0) ? specialLifPrice : defaultLifPrice,
        available: this.web3provider.utils.isZeroAddress(bookedBy) ? true : false
      });
    }
    return availability;
  }

  /**
   * Checks the availability of a unit for a range of days
   * @param  {Address} unitAddress Unit contract address
   * @param  {Date}    fromDate    check-in date
   * @param  {Number}  daysAmount  number of days
   * @return {Boolean}
   */
  async unitIsAvailable(unitAddress, fromDate, daysAmount=0) {
    validate.addressAndRange({unitAddress, fromDate, daysAmount});

    const availability = await this.unitAvailability(unitAddress, fromDate, daysAmount);
    return _.every(availability, (dayAvailability) => {
      return dayAvailability.available;
    });
  }

  /**
   * Returns a unit's availability for a single month
   * @param  {Address} unitAddress Unit contract address
   * @param  {Moment}  date        Moment object
   * @return {Object}  Mapping of number of days since epoch to unit's price and availability for that day
   */
  async unitMonthlyAvailability(unitAddress, date) {
    validate.addressAndDate({unitAddress, date});

    let fromDate = moment().year(date.year()).month(date.month()).date(1);
    let toDate = moment(fromDate).endOf('month');
    let daysAmount = toDate.diff(fromDate, 'days');
    const availability = await this.unitAvailability(unitAddress, fromDate, daysAmount);
    return _.keyBy(availability, 'day');
  }

  /**
   * Gets the bookings history for hotel(s). If `fromBlock` is ommitted, method will search from the
   * creation block of each Hotel contract.
   * @param  {Address|Address[]} _addresses  Hotel contract address(es) to fetch bookings for
   * @param  {Number}            fromBlock   Optional: block to begin searching from.
   * @return {Promise}                       Array of bookings objects
   * @example
   * [
   *   {
   *     "transactionHash": "0x0ed3a16220e3b0cab...6ab8225ed0b6bad6ffc9640694d",
   *     "blockNumber": 25,
   *     "id": "log_f72920af",
   *     "from": "0xc9F805a42837E78D5566f6A04Dba7167F8c6A830",
   *     "unit": "0xcE85f98D04B25deaa27406492B6d6B747B837741",
   *     "fromDate": "2020-10-10T07:00:00.000Z",
   *     "daysAmount": "5"
   *    }
   * ]
   */
  async getBookings(_addresses, fromBlock = 0){
    validate.addressesAndBlock({_addresses, fromBlock});
    let hotelsToQuery = [];
    let bookings = [];

    (Array.isArray(_addresses))
      ? hotelsToQuery = _addresses
      : hotelsToQuery.push(_addresses);

    if (!hotelsToQuery.length) return [];

    let startedEvents;
    let finishEvents;
    let bookEvents;
    let finished;
    //TX hashes of CallStarted events indexed by corresponding hashes of CallFinished events
    let startedMappedByFinished = [];
    for (let address of hotelsToQuery) {
      const hotel = this.getHotelInstance(address);

      bookEvents = await hotel.getPastEvents('Book', {
        fromBlock: fromBlock,
      });

      startedEvents = await hotel.getPastEvents('CallStarted', {
        fromBlock: fromBlock
      });

      finishEvents = await hotel.getPastEvents('CallFinish', {
        fromBlock: fromBlock
      });

      // Filter out started events with a corresponding Book event
      // and map finish events -> started events
      finished = startedEvents.filter(event => {
        let found = finishEvents
          .findIndex(item => item.returnValues.dataHash === event.returnValues.dataHash);
        if(found !== -1) {
          startedMappedByFinished[finishEvents[found].transactionHash] = event.transactionHash;
        }
        return found !== -1;
      })

      for (let event of bookEvents) {
        let guestData;

        //If guest data can't be retreived, it means the booking required a
        //confirmation, so the guestData can be found in the CallStarted tx
        if (await hotel.methods.waitConfirmation().call() == true) {
          guestData = await this.web3provider.data.getGuestData(startedMappedByFinished[event.transactionHash]);
        } else {
          guestData = await this.web3provider.data.getGuestData(event.transactionHash);
        }

        bookings.push({
          guestData: guestData,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          id: event.id,
          from: event.returnValues.from,
          unit: event.returnValues.unit,
          fromDate: this.web3provider.utils.parseDate(event.returnValues.fromDay),
          daysAmount: event.returnValues.daysAmount
        })
      };
    }
    return bookings;
  };

  /**
   * Gets pending bookings requests for hotel(s). This is the set of all requests that have not
   * yet been confirmed by a hotel manager. If `fromBlock` is ommitted, method will search from
   * the creation block of each Hotel contract.
   * @param  {Address|Address[]}  _addresses  Hotel contract address(es) to fetch bookings for
   * @param  {Number}             fromBlock   Optional: block to begin searching from.
   * @return {Promise}            Array of bookings objects
   * @example
   *  [
   *    {
   *     "transactionHash": "0x18c59c3f570d4013e0...470ead6560fdcc738a194d0",
   *     "blockNumber": 26,
   *     "id": "log_9b3eb752",
   *     "from": "0x522701D427e1C2e039fdC32Db41972A46dFD7755",
   *     "dataHash": "0x4077e0fee8018bb3dd7...ea91b3d7ced260761c73fa",
   *     "hotel": '0xC9c4DdF85995dCB15377Cf8A262E0e2F19eA7011',
   *     "unit": '0xcf0a860c363d7acd449be319a94d9abfae9dd3eb',
   *     "fromDate": 2020-10-10T07:00:00.000Z,
   *     "daysAmount": '5'
   *    }
   *   ]
   */
  async getBookingRequests(_addresses, fromBlock=0){
    validate.addressesAndBlock({_addresses, fromBlock})

    let hotelsToQuery = [];
    let requests = [];

    (Array.isArray(_addresses))
      ? hotelsToQuery = _addresses
      : hotelsToQuery.push(_addresses);

    if (!hotelsToQuery.length) return [];

    let startedEvents;
    let finishEvents;
    let unfinished;

    for (let address of hotelsToQuery) {
      const hotel = this.getHotelInstance(address);

      startedEvents = await hotel.getPastEvents('CallStarted', {
        fromBlock: fromBlock
      });

      finishEvents = await hotel.getPastEvents('CallFinish', {
        fromBlock: fromBlock
      })

      // Filter out started events without a corresponding finishing event
      unfinished = startedEvents.filter(event => {
        let found = finishEvents
          .findIndex(item => item.returnValues.dataHash === event.returnValues.dataHash);

        return found === -1;
      })

      for(let event of unfinished) {
        const guestData = await this.web3provider.data.getGuestData(event.transactionHash);

        //get calldata and decode it for booking data
        let publicCallData = await hotel.methods.getPublicCallData(event.returnValues.dataHash).call();
        let bookData = {};
        this.web3provider.contracts.abiDecoder.decodeMethod(publicCallData).params.forEach((param) => {
          bookData[param.name] = param.value;
        });

        requests.push({
          guestData: guestData,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          id: event.id,
          from: event.returnValues.from,
          dataHash: event.returnValues.dataHash,
          hotel: address,
          unit: this.addressToChecksum(bookData.unitAddress),
          fromDate: this.web3provider.utils.parseDate(bookData.fromDay),
          daysAmount: bookData.daysAmount
        })
      };
    }

    return requests;
  }
}

module.exports = BookingData;

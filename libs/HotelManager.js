const validate = require('./utils/validators');

/**
 * Methods that allow a manager to create / administrate hotels
 * @example
 *   const hotel = new HotelManager({
 *     indexAddress: '0x75a3...b', // Address of the WTIndex contract that lists this hotel
 *     owner: '0xab3...cd',        // Payer of lib tx fees, registered as owner the WTIndex
 *     web3: web3,                 // Instantiated web3 object with its provider set.
 *   });
 */
class HotelManager {

  /**
   * Instantiates a HotelManager with a web3 object, an owner account address, and the address of
   * the Index contract that has registered hotel assets.
   * @param  {Object} options {web3provider: <web3provider>, owner: <Address>, gasMargin: <number>, indexAddress: <Address>, hotels: <Object>}
   * @return {HotelManager}
   */
  constructor(options) {
    this.web3provider = options.web3provider;
    this.indexAddress = options.indexAddress;
    this.hotels = options.hotels || {};
    this.hotelsAddrs = [];
    this.owner = options.owner || null;
    this.gasMargin = options.gasMargin || 1;
  }

  getIndexInstance() {
    if (! this.WTIndex) {
      this.WTIndex = this.web3provider.contracts.getIndexInstance(this.indexAddress);
    }
    return this.WTIndex;
  }

  getHotelInstance(hotelAddress) {
    return this.web3provider.contracts.getHotelInstance(hotelAddress);
  }

  getHotelUnitInstance(unitAddress) {
    return this.web3provider.contracts.getHotelUnitInstance(unitAddress);
  }

  getHotelUnitTypeInstance(unitTypeAddress) {
    return this.web3provider.contracts.getHotelUnitTypeInstance(unitTypeAddress);
  }


  /**
   * Gets non-bookings data for a Hotel contract (e.g info about its location, unit types
   * and units).
   * @param  {Address} hotelAddress address of Hotel contract
   * @return {Object}
   * @example
   *  (we should have a doc link to JSON output here)
   */
  async getHotel(hotelAddress) {
    validate.hotelAddress({hotelAddress});

    const hotel = this.getHotelInstance(hotelAddress);
    this.hotels[hotelAddress] = await this.web3provider.data.getHotelInfo(hotel);
    return this.hotels[hotelAddress];
  }

  /**
   * Gets non-bookings data for all the hotels managed by the HotelManager (e.g info about their
   * location, unit types and units).
   * @return {Object}
   * @example
   * (we should have a doc link to JSON output here)
   */
  async getHotels() {
    this.hotelsAddrs = await this.getIndexInstance().methods
      .getHotelsByManager(this.owner)
      .call();

    this.hotelsAddrs = this.hotelsAddrs.filter( addr => !this.web3provider.utils.isZeroAddress(addr));

    if (!this.hotelsAddrs.length) {
      return null;
    }

    this.hotels = {};

    for (let address of this.hotelsAddrs) {
      await this.getHotel(address);
    }

    return this.hotels;
  }

  /**
   * Gets a unit's reservation data for a specific UTC day or date.
   * @param  {Address}        unitAddress contract address of Unit
   * @param  {Date | Number}  day         Date | UTC day since 1970
   * @return {Promievent}
   * @example
   *   const {
   *     specialPrice,    // Price: 200.00
   *     specialLifPrice, // LifPrice (ether): 20
   *     bookedBy         // Address: e.g. '0x39a...2b'
   *   } = await lib.getReservation('0xab3..cd', new Date('5/31/2020'));
   */
  async getReservation(unitAddress, day) {
    validate.addressAndDay({unitAddress, day});

    if (day instanceof Date)
      day = this.web3provider.utils.formatDate(day);

    const unit = this.getHotelUnitInstance(unitAddress);
    const result = await unit.methods.getReservation(day).call();

    const specialPrice = this.web3provider.utils.bnToPrice(result[0]);
    const specialLifPrice = this.web3provider.utils.lifWei2Lif(result[1]);
    const bookedBy = result[2];

    return {
      specialPrice: specialPrice,
      specialLifPrice: specialLifPrice,
      bookedBy: bookedBy
    }
  }

  /**
   * Gets the hotel data previously retrieved by a `getHotel` call
   * @return {Object}
   * @example
   *   (we should have a doc link to JSON output here)
   */
  getCachedHotel(hotelAddress) {
    return this.hotels[hotelAddress];
  }

  /**
   * Gets hotel data previously retrieved by a `getHotels` call (see above)
   * @return {Object}
   * @example
   *   (we should have a doc link to JSON output here)
   */
  getCachedHotels() {
    return this.hotels;
  }

  /**
   * Gets the contract addresses of all hotels previously retrieved by a `getHotels` call
   * @return {Array}
   * @example
   *  const [Hotel1, Hotel2] = lib.getHotelsAddrs();
   */
  getCachedHotelsAddrs() {
    return this.hotelsAddrs;
  }

  /**
   * Creates a Hotel contract instance and registers it with the HotelManager's WTIndex contract
   * @param  {String}  name         name
   * @param  {String}  description  description
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async createHotel(name, description, callbacks) {
    validate.nameAndDescription({name, description});

    const estimate = await this.getIndexInstance().methods
      .registerHotel(name, description)
      .estimateGas();
    const data = await this.getIndexInstance().methods
      .registerHotel(name, description)
      .encodeABI();

    const options = {
      from: this.owner,
      to: this.getIndexInstance().options.address,
      gas: await this.web3provider.utils.addGasMargin(estimate, this.gasMargin),
      nonce: await this.web3provider.web3.eth.getTransactionCount(this.owner, 'pending'),
      data: data,
    }

    if (callbacks) {
      return this.web3provider.web3.eth.sendTransaction(options)
        .once('transactionHash', callbacks.transactionHash)
        .once('receipt', callbacks.receipt)
        .on('error', callbacks.error);
    }

    return await this.web3provider.web3.eth.sendTransaction(options);
  }

  /**
   * Removes a hotel from the WTIndex registry
   * @param  {Address} hotelAddress address of Hotel contract to de-list
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async removeHotel(hotelAddress, callbacks) {
    validate.hotelAddress({hotelAddress});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await this.getIndexInstance().methods
      .removeHotel(index)
      .encodeABI();

    const options = {
      from: this.owner,
      to: this.getIndexInstance().options.address,
      data: data,
      nonce: await this.web3provider.web3.eth.getTransactionCount(this.owner, 'pending')
    };

    const estimate = await this.web3provider.web3.eth.estimateGas(options);
    options.gas = await this.web3provider.utils.addGasMargin(estimate, this.gasMargin);

    if (callbacks) {
      return this.web3provider.web3.eth.sendTransaction(options)
        .once('transactionHash', callbacks.transactionHash)
        .once('receipt', callbacks.receipt)
        .on('error', callbacks.error);
    }

    return await this.web3provider.web3.eth.sendTransaction(options);
  }

  /**
   * Sets a boolean flag in a Hotel contract that determines whether bookings
   * can happen instantly or require confirmation by a manager before they
   * proceed.
   * @param {Address} hotelAddress  Contract address of the hotel to edit.
   * @param {Boolean} value         t/f: require confirmation
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async setRequireConfirmation(hotelAddress, value, callbacks) {
    validate.hotelAddressAndValue({hotelAddress, value});
    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await hotel.methods
      .changeConfirmation(value)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Edits a hotel's name and description.
   * @param  {Address} hotelAddress contract address
   * @param  {String}  name         hotel name
   * @param  {String}  description  hotel description
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async changeHotelInfo(hotelAddress, name, description, callbacks) {
    validate.hotelAddress({hotelAddress});
    validate.nameAndDescription({name, description});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await hotel.methods
      .editInfo(name, description)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Edits a hotel's physical address data.
   * @param  {Address} hotelAddress contract address
   * @param  {String} lineOne       physical address data
   * @param  {String} lineTwo       physical address data
   * @param  {String} zipCode       physical address data
   * @param  {String} country       physical address data
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async changeHotelAddress(hotelAddress, lineOne, lineTwo, zipCode, country, callbacks) {
    validate.physicalAddress({hotelAddress, lineOne, lineTwo, zipCode, country});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await hotel.methods
      .editAddress(lineOne, lineTwo, zipCode, country)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Edits a hotel's coordinate location and timezone data.
   * @param  {Address} hotelAddress contract address
   * @param  {Number} timezone      positive integer timezone relative to GMT
   * @param  {Number} latitude      GPS latitude location data e.g `-3.703578`
   * @param  {Number} longitude     GPS longitude location data e.g `40.426371`
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async changeHotelLocation(hotelAddress, timezone, latitude, longitude, callbacks) {
    validate.hotelCoordinatesAndTimezone({hotelAddress, timezone, latitude, longitude});
    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const {long, lat} = this.web3provider.utils.locationToUint(longitude, latitude);

    const data = await hotel.methods
      .editLocation(timezone, long, lat)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Adds an image to a hotel
   * @param  {Address} hotelAddress contract address
   * @param  {String} url           url of the image to add
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async addImageHotel(hotelAddress, url, callbacks) {
    validate.hotelAddressAndUrl({hotelAddress, url});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await hotel.methods
      .addImage(url)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Removes an image from a hotel
   * @param  {Address} hotelAddress contract address
   * @param  {Number}  imageIndex   index of the image to remove
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async removeImageHotel(hotelAddress, imageIndex, callbacks) {
    validate.hotelAddressAndImageIndex({hotelAddress, imageIndex});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await hotel.methods
      .removeImage(imageIndex)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Confirms a pending booking request. `reservationId` is the value of the `dataHash` field
   * from the `CallStarted` event fired when a booking that requires confirmation is initiated.
   * @param  {Address} hotelAddress  Hotel contract address that controls unit requested
   * @param  {String}  reservationId data hash.
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async confirmBooking(hotelAddress, reservationId, callbacks) {
    validate.hotelAddressAndreservationId({hotelAddress, reservationId});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = await hotel.methods
      .continueCall(reservationId)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Deploys a UnitType contract and registers it to an existing Hotel contract
   * @param  {Address} hotelAddress Hotel contract that will control created UnitType contract
   * @param  {String} unitType      unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async addUnitType(hotelAddress, unitType, callbacks) {
    validate.hotelAddressAndUnitType({hotelAddress, unitType});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const unitTypeInstance = await this.web3provider.deploy.deployUnitType(unitType, hotelAddress, this.owner, this.gasMargin);

    const data = hotel.methods
      .addUnitType(unitTypeInstance.options.address)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Unregisters a UnitType contract from an existing Hotel contract
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to remove
   * @param  {String}  unitType     unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async removeUnitType(hotelAddress, unitType, callbacks) {
    validate.hotelAddressAndUnitType({hotelAddress, unitType});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const typeIndex = await this.web3provider.data.getUnitTypeIndex(hotel, unitType);
    const typeHex = this.web3provider.web3.utils.toHex(unitType);

    const data = hotel.methods
      .removeUnitType(typeHex, typeIndex)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Edits a unit type's basic info data.
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to edit
   * @param  {String} unitType      unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {String} description   description: e.g. 'Simple. Clean.'
   * @param  {Number} minGuests     minimum number of guests that can stay in UnitType
   * @param  {Number} maxGuests     maximum number of guests that can stay in UnitType
   * @param  {String} price         price of UnitType: e.g '50 euros'
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async editUnitType(hotelAddress, unitType, description, minGuests, maxGuests, price, callbacks) {
    validate.unitTypeInfo({hotelAddress, unitType, description, minGuests, maxGuests, price});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const typeHex = this.web3provider.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = this.getHotelUnitTypeInstance(address);

    const editData = instance.methods
      .edit(description, minGuests, maxGuests, price)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, editData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Adds an amenity to a unit type
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to edit
   * @param  {String} unitType      unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Number} amenity       integer code of amenity to add: ex: 23
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async addAmenity(hotelAddress, unitType, amenity, callbacks) {
    validate.unitTypeAmenity({hotelAddress, unitType, amenity});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const typeHex = this.web3provider.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = this.getHotelUnitTypeInstance(address);

    const amenityData = instance.methods
      .addAmenity(amenity)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, amenityData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Removes an amenity from a unit type.
   * @param  {Address} hotelAddress   Hotel contract that controls the UnitType contract to edit
   * @param  {String}  unitType       unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Number}  amenity        integer code of amenity to remove: ex: 23
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async removeAmenity(hotelAddress, unitType, amenity, callbacks) {
    validate.unitTypeAmenity({hotelAddress, unitType, amenity});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const typeHex = this.web3provider.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = this.getHotelUnitTypeInstance(address);

    const amenityData = instance.methods
      .removeAmenity(amenity)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, amenityData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Adds an image to a unit type
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to edit
   * @param  {String} unitType      unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {String} url           url of the image to add
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async addImageUnitType(hotelAddress, unitType, url, callbacks) {
    validate.addImageUnitType({hotelAddress, unitType, url});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const typeHex = this.web3provider.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = this.getHotelUnitTypeInstance(address);

    const imageData = instance.methods
      .addImage(url)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, imageData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Removes an image to a unit type
   * @param  {Address} hotelAddress Hotel contract that controls the UnitType contract to edit
   * @param  {String} unitType      unique plain text id of UnitType, ex: 'BASIC_ROOM'
   * @param  {Number} imageIndex    index of the image to remove
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async removeImageUnitType(hotelAddress, unitType, imageIndex, callbacks) {
    validate.removeImageUnitType({hotelAddress, unitType, imageIndex});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const typeHex = this.web3provider.web3.utils.toHex(unitType);
    const address = await hotel.methods.getUnitType(typeHex).call();
    const instance = this.getHotelUnitTypeInstance(address);

    const imageData = instance.methods
      .removeImage(imageIndex)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnitType(typeHex, imageData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Deploys a Unit contract and registers it to an existing Hotel contract
   * @param {Address} hotelAddress  Hotel contract that will control created Unit contract
   * @param {String}  unitType      unique plain text id of this units UnitType, ex: 'BASIC_ROOM'
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async addUnit(hotelAddress, unitType, callbacks) {
    validate.hotelAddressAndUnitType({hotelAddress, unitType});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const instance = await this.web3provider.deploy.deployUnit(unitType, hotelAddress, this.owner, this.gasMargin)

    const data = hotel.methods
      .addUnit(instance.options.address)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Unregisters a Unit contract from an existing Hotel contract
   * @param  {Address} hotelAddress   Hotel contract that controls the Unit contract to remove
   * @param  {Address} unitAddress    Unit contract to remove
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async removeUnit(hotelAddress, unitAddress, callbacks) {
    validate.hotelAddressAndUnitAddress({hotelAddress, unitAddress});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const data = hotel.methods
      .removeUnit(unitAddress)
      .encodeABI();

    return this.web3provider.transactions.execute(data, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Sets a Unit contracts `active` status. This determines whether or not it can be booked.
   * @param {Address} hotelAddress  Hotel contract that controls the Unit contract to edit
   * @param {Address} unitAddress   Unit contract to edit
   * @param {Boolean} active        Unit is locked when false.
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async setUnitActive(hotelAddress, unitAddress, active, callbacks) {
    validate.unitActive({hotelAddress, unitAddress, active});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const unit = this.getHotelUnitInstance(unitAddress);

    const unitData = unit.methods
      .setActive(active)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Sets the default price for a unit
   * @param {Address}   hotelAddress  Hotel contract that controls the Unit being edited
   * @param {Address}   unitAddress   Unit contract to edit
   * @param {Number}    price         Integer or floating point price
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async setDefaultPrice(hotelAddress, unitAddress, price, callbacks) {
    validate.unitPrice({hotelAddress, unitAddress, price});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const uintPrice = this.web3provider.utils.priceToUint(price);
    const unit = this.getHotelUnitInstance(unitAddress);

    const unitData = unit.methods
      .setDefaultPrice(uintPrice)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Sets the default LifPrice for this unit
   * @param  {Address}          hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {String|Number|BN} price        Lif 'ether' (converted to wei by web3.utils.toWei)
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
  */
  async setDefaultLifPrice(hotelAddress, unitAddress, price, callbacks) {
    validate.unitLifPrice({hotelAddress, unitAddress, price});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const weiPrice = this.web3provider.utils.lif2LifWei(price);
    const unit = this.getHotelUnitInstance(unitAddress);

    const unitData = unit.methods
      .setDefaultLifPrice(weiPrice)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Changes the default currency code
   * @param {Address}   hotelAddress  Hotel contract that controls the Unit being edited
   * @param {Address}   unitAddress   Unit contract to edit
   * @param {Number}    code          Integer currency code btw 0 and 255
   * @param {Function}  converter     ex `euro = kroneToEuro(krone)`
   * @param {Date}      convertStart  date to begin search of specialPrices
   * @param {Date}      convertEnd    date (inclusive) to end search of specialPrices
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async setCurrencyCode(hotelAddress, unitAddress, code, callbacks, converter, convertStart, convertEnd) {
    validate.currencyCode({hotelAddress, unitAddress, code});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    if(! this.web3provider.utils.currencyCodes.number(code)) {
      throw new Error('Invalid currency code');
    }

    code = this.web3provider.utils.currencyCodeToHex(code);
    const unit = this.getHotelUnitInstance(unitAddress);

    const unitData = unit.methods
      .setCurrencyCode(code)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);

    // -------------------------------- NB ----------------------------------------
    // We probably need to iterate through a range of dates and
    // convert special prices from old to new denomination. We probably also need
    // to estimate how many we can do at once.
  }

  /**
   * Sets a unit's national currency booking price for range of days. Check-in is on
   * the first day, check-out on the last.
   * @param  {Address} hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Addres}  unitAddress  Unit contract to edit
   * @param  {Number}  price        integer or floating point price
   * @param  {Date}    fromDate     check-in date
   * @param  {Number}  daysAmount   integer number of days to book.
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async setUnitSpecialPrice(hotelAddress, unitAddress, price, fromDate, daysAmount, callbacks) {
    validate.unitSpecialPrice({hotelAddress, unitAddress, price, fromDate, daysAmount});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const fromDay = this.web3provider.utils.formatDate(fromDate);
    const uintPrice = this.web3provider.utils.priceToUint(price);

    const unit = this.getHotelUnitInstance(unitAddress);

    const unitData = unit.methods
      .setSpecialPrice(uintPrice, fromDay, daysAmount)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Sets a unit's booking price for range of days. Check-in is on the first day,
   * check-out on the last.
   * @param  {Address}          hotelAddress Hotel contract that controls the Unit contract to edit
   * @param  {Address}          unitAddress  Unit contract to edit
   * @param  {String|Number|BN} price        Lif 'ether' (converted to wei by web3.utils.toWei)
   * @param  {Date}             fromDate     check-in date
   * @param  {Number}           daysAmount   integer number of days to book.
   * @param  {Boolean} callbacks    object with callback functions
   * @return {Promievent}
   */
  async setUnitSpecialLifPrice(hotelAddress, unitAddress, price, fromDate, daysAmount, callbacks) {
    validate.unitSpecialLifPrice({hotelAddress, unitAddress, price, fromDate, daysAmount});

    const {
      hotel,
      index
    } = await this.web3provider.data.getHotelAndIndex(hotelAddress, this.getIndexInstance().options.address, this.owner);

    const lifPrice = this.web3provider.utils.lif2LifWei(price);
    const fromDay = this.web3provider.utils.formatDate(fromDate);
    const unit = this.getHotelUnitInstance(unitAddress);

    const unitData = unit.methods
      .setSpecialLifPrice(lifPrice, fromDay, daysAmount)
      .encodeABI();

    const hotelData = hotel.methods
      .callUnit(unit.options.address, unitData)
      .encodeABI();

    return this.web3provider.transactions.execute(hotelData, this.getIndexInstance(), this.owner, index, this.gasMargin, callbacks);
  }

  /**
   * Deploy a complete hotel.
   * @param  {Object}  txHash  Transaction hash.
   * @return {Promise}         Transaction object
   * @example
   *   {
   *     name: 'WTHotel',
   *     description: 'Winding Tree Hotel',
   *     lineOne: 'Address line One',
   *     lineTwo: 'Address line two',
   *     zip: 'C1414',
   *     country: 'Argentina',
   *     timezone: 3,
   *     latitude: 38.002281,
   *     longitude: 57.557541,
   *     waitConfirmation: true,
   *     images: ['image.url0', 'image.url1'],
   *     unitTypes:{
   *       BASIC_ROOM:{
   *         amenities: [22, 11],
   *         info: {
   *           description: 'Best unit type ever',
   *           minGuests: 1,
   *           maxGuests: 8,
   *           price: '10'
   *         },
   *         images: ['image.url2', 'image.url3']
   *       },
   *       FAMILY_CABIN: {
   *         amenities: [22, 33],
   *         info: {
   *           description: 'Best family cabin ever',
   *           minGuests: 2,
   *           maxGuests: 7,
   *           price: '11'
   *         },
   *         images: ['image.url22', 'image.url33']
   *       }
   *     },
   *   units: [
   *       {
   *         active: true,
   *         unitType: 'BASIC_ROOM',
   *         currencyCode: 948,
   *         defaultPrice: 78.00,
   *         defaultLifPrice: 1
   *       },
   *       {
   *         active: true,
   *         unitType: 'FAMILY_CABIN',
   *         currencyCode: 948,
   *         defaultPrice: 78.00,
   *         defaultLifPrice: 2
   *       },
   *       {
   *         active: false,
   *         unitType: 'BASIC_ROOM',
   *         currencyCode: 948,
   *         defaultPrice: 79.00,
   *         defaultLifPrice: 3
   *       }
   *     ]
   *   }
   */
  async createFullHotel(hotelToCreate) {
    let workingHotel = {};
    let hotelAddress;
    try {
      await this.createHotel(hotelToCreate.name, hotelToCreate.description);
      const hotels = await this.getHotels();
      const hotelsArray = Object.keys(hotels);
      const latest = hotelsArray.length - 1;
      hotelAddress = hotelsArray[latest];

      await this.setRequireConfirmation(hotelAddress, hotelToCreate.waitConfirmation)
      await this.changeHotelAddress(hotelAddress, hotelToCreate.lineOne, hotelToCreate.lineTwo, hotelToCreate.zip, hotelToCreate.country)
      await this.changeHotelLocation(hotelAddress, hotelToCreate.timezone, hotelToCreate.latitude, hotelToCreate.longitude)

      for(let imageUrl of hotelToCreate.images) {
        await this.addImageHotel(hotelAddress, imageUrl)
      }

      const unitTypes = Object.keys(hotelToCreate.unitTypes)
      for(let unitType of unitTypes){
        await this.addUnitType(hotelAddress, unitType)
      }

      for(let unitType of unitTypes){
        await this.editUnitType(hotelAddress,
                                unitType,
                                hotelToCreate.unitTypes[unitType].info.description,
                                hotelToCreate.unitTypes[unitType].info.minGuests,
                                hotelToCreate.unitTypes[unitType].info.maxGuests,
                                hotelToCreate.unitTypes[unitType].info.price)
      }

      for(let unitType of unitTypes){
        for(let imageUrl of hotelToCreate.unitTypes[unitType].images){
          await this.addImageUnitType(hotelAddress, unitType, imageUrl)
        }
      }

      for(let unitType of unitTypes){
        for(let amenity of hotelToCreate.unitTypes[unitType].amenities){
          await this.addAmenity(hotelAddress, unitType, amenity)
        }
      }

      for(let unit of hotelToCreate.units){
        await this.addUnit(hotelAddress, unit.unitType)
      }

      workingHotel = await this.getHotel(hotelAddress);
      const addressesByType = workingHotel.unitAddresses ? workingHotel.unitAddresses.sort(
        (a,b) => workingHotel.units[a].unitType < workingHotel.units[b].unitType) : [];
      const sortedUnits = hotelToCreate.units.sort(
        (a,b) => a.unitType < b.unitType);
      
      for (let i = 0; i < sortedUnits.length; i++) {
        await this.setCurrencyCode(hotelAddress,addressesByType[i], sortedUnits[i].currencyCode )
        await this.setDefaultPrice(hotelAddress,addressesByType[i], sortedUnits[i].defaultPrice )
        await this.setDefaultLifPrice(hotelAddress,addressesByType[i], sortedUnits[i].defaultLifPrice )
        await this.setUnitActive(hotelAddress,addressesByType[i], sortedUnits[i].active )
      }
      workingHotel = await this.getHotel(hotelAddress);
      return {hotel: workingHotel, hotelAddress};
    } catch (err) {
      workingHotel = await this.getHotel(hotelAddress);
      return {hotel: workingHotel, hotelAddress, err};
    }
  }
};

module.exports = HotelManager;

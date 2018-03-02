const assert = require('chai').assert;
const _ = require('lodash');
const Web3 = require('web3');

const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

const library = require('../dist/node/wt-js-libs');
const web3providerFactory = library.web3providerFactory;
const HotelManager = library.HotelManager;

describe('HotelManager', function() {
  const hotelName = 'WTHotel';
  const hotelDescription = 'Winding Tree Hotel';
  const gasMargin = 1.5;

  let lib;
  let index;
  let fundingSource;
  let daoAccount;
  let ownerAccount;
  let web3provider;

  before(async function(){
    web3provider = web3providerFactory.getInstance(web3);
    const wallet = await web3.eth.accounts.wallet.create(2);
    const accounts = await web3.eth.getAccounts();

    fundingSource = accounts[0];
    ownerAccount = wallet["0"].address;
    daoAccount = wallet["1"].address;

    await web3provider.accounts.fundAccount(fundingSource, ownerAccount, '50');
    await web3provider.accounts.fundAccount(fundingSource, daoAccount, '50');
  })

  beforeEach(async function() {
    index = await web3provider.deploy.deployIndex(daoAccount, gasMargin);

    lib = new HotelManager({
      indexAddress: index.options.address,
      owner: ownerAccount,
      gasMargin: gasMargin,
      web3provider: web3provider
    });
  });

  describe('Index', function(){

    it('createHotel: should create a hotel', async function() {
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      const address = Object.keys(hotels)[0];
      const hotel = hotels[address];

      assert.equal(hotel.name, hotelName);
      assert.equal(hotel.description, hotelDescription);
    });

    it('removeHotel: should remove a hotel', async function(){
      await lib.createHotel(hotelName, hotelDescription);
      let hotels = await lib.getHotels();
      const address = lib.hotelsAddrs[0];

      assert.isDefined(hotels[address]);

      await lib.removeHotel(address);
      hotels = await lib.getHotels();

      assert.isNull(hotels);
    });

    it('should make multiple hotels manageable', async function(){
      const nameA = 'a';
      const nameB = 'b';
      const descA = 'desc a';
      const descB = 'desc b';
      const typeName = "BASIC_ROOM";

      // Create Hotels
      await lib.createHotel(nameA, descA);
      await lib.createHotel(nameB, descB);

      let hotels = await lib.getHotels();

      assert.equal(lib.hotelsAddrs.length, 2);

      // Add unit types and units
      let addressA = lib.hotelsAddrs[0];
      let addressB = lib.hotelsAddrs[1];

      await lib.addUnitType(addressA, typeName);
      await lib.addUnit(addressA, typeName);
      await lib.addUnitType(addressB, typeName);
      await lib.addUnit(addressB, typeName);

      hotels = await lib.getHotels();

      assert.isDefined(hotels[addressA].unitTypes[typeName]);
      assert.isDefined(hotels[addressB].unitTypes[typeName]);

      assert.isDefined(hotels[addressA].unitAddresses[0]);
      assert.isDefined(hotels[addressB].unitAddresses[0]);

      // Unregister a hotel
      await lib.removeHotel(addressA);
      hotels = await lib.getHotels();

      assert.isUndefined(hotels[addressA]);
      assert.isDefined(hotels[addressB]);
    });
  });

  describe('Hotel', function(){
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      address = Object.keys(hotels)[0];
    });

    it('setRequireConfirmation: sets the confirmation requirement status', async function(){
      let hotel = await lib.getHotel(address);
      assert.isFalse(hotel.waitConfirmation);

      await lib.setRequireConfirmation(address, true);
      hotel = await lib.getHotel(address);
      assert.isTrue(hotel.waitConfirmation);
    });

    it('changeHotelInfo: edits the hotel info', async function(){
      const newName = 'Awesome WTHotel';
      const newDescription = 'Awesome Winding Tree Hotel';

      let callBacks = {};
      callBacks.transactionHash = (hash) => {
        console.log('got transactionHash');
        console.log(hash);
      };
      callBacks.error = (error) => {
        console.log('got error');
        console.log(error);
      };
      callBacks.receipt = (receipt) => {
        console.log('got receipt');
        console.log(receipt);
      };

      await lib.changeHotelInfo(address, newName, newDescription, true);
      const hotel = await lib.getHotel(address);

      assert.equal(hotel.name, newName);
      assert.equal(hotel.description, newDescription);
    });

    it('changeHotelLocation: edits the hotel address', async function(){
      const lineOne = 'Address one';
      const lineTwo = 'Address two';
      const zip = '57575';
      const country = 'SP';
      const timezone = 'Europe/Madrid';
      const longitude = 50;
      const latitude = 15;

      await lib.changeHotelLocation(address, lineOne, lineTwo, zip, country, timezone, longitude, latitude);
      const hotel = await lib.getHotel(address);

      assert.equal(hotel.lineOne, lineOne);
      assert.equal(hotel.lineTwo, lineTwo);
      assert.equal(hotel.zip, zip);
      assert.equal(hotel.country, country);
      assert.equal(hotel.longitude, longitude);
      assert.equal(hotel.latitude, latitude);
    });

    it('addImageHotel: adds an image to the hotel', async function() {
      const url = "image.jpeg";

      await lib.addImageHotel(address, url);
      const hotel = await lib.getHotel(address);

      assert.equal(hotel.images.length, 1);
      assert.equal(hotel.images[0], url);
    });

    it('removeImageHotel: removes an image from the hotel', async function() {
      const url = "image.jpeg";

      await lib.addImageHotel(address, url);
      let hotel = await lib.getHotel(address);

      assert.equal(hotel.images.length, 1);
      assert.equal(hotel.images[0], url);

      await lib.removeImageHotel(address, 0);
      hotel = await lib.getHotel(address);

      assert.equal(hotel.images.length, 1);
      assert.equal(hotel.images[0], '');
    })
  });

  describe('UnitTypes', () => {
    const typeName = 'BASIC_ROOM'
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      address = Object.keys(hotels)[0];
    });

    it('addUnitType: adds a unit type to the hotel', async () => {
      await lib.addUnitType(address, typeName);
      const hotel = await lib.getHotel(address);

      assert(hotel.unitTypeNames.includes(typeName));
      assert.isDefined(hotel.unitTypes[typeName]);
      assert.isDefined(hotel.unitTypes[typeName].address);
    });

    it('addUnitType: initializes info correctly', async() => {
      await lib.addUnitType(address, typeName);
      let hotel = await lib.getHotel(address);

      assert.isNull(hotel.unitTypes[typeName].info.description);
      assert.equal(hotel.unitTypes[typeName].info.defaultPrice, 0);
      assert.isNull(hotel.unitTypes[typeName].info.minGuests);
      assert.isNull(hotel.unitTypes[typeName].info.maxGuests);
    });

    it('removeUnitType: removes a UnitType from the hotel', async() => {
      await lib.addUnitType(address, typeName);
      let hotel = await lib.getHotel(address);

      assert(hotel.unitTypeNames.includes(typeName));
      assert.isDefined(hotel.unitTypes[typeName]);

      await lib.removeUnitType(address, typeName);
      hotel = await lib.getHotel(address);

      assert.isFalse(hotel.unitTypeNames.includes(typeName));
      assert.isUndefined(hotel.unitTypes[typeName]);
    });

    it('editUnitType: edits UnitType info correctly', async() => {
      const description = 'Adobe';
      const minGuests = 1;
      const maxGuests = 2;

      await lib.addUnitType(address, typeName);
      await lib.editUnitType(
        address,
        typeName,
        description,
        minGuests,
        maxGuests
      );
      let hotel = await lib.getHotel(address);

      assert.equal(hotel.unitTypes[typeName].info.description, description);
      assert.equal(hotel.unitTypes[typeName].info.defaultPrice, 0);
      assert.equal(hotel.unitTypes[typeName].info.minGuests, minGuests);
      assert.equal(hotel.unitTypes[typeName].info.maxGuests, maxGuests);
    });

    it('addAmenity: adds an amenity to the UnitType', async () => {
      const amenity = 10;
      await lib.addUnitType(address, typeName);
      await lib.addAmenity(address, typeName, amenity);
      let hotel = await lib.getHotel(address);

      assert.isTrue(hotel.unitTypes[typeName].amenities.includes(amenity));
    });

    it('removeAmenity: removes an amenity from the UnitType', async () => {
      const amenity = 10;
      await lib.addUnitType(address, typeName);
      await lib.addAmenity(address, typeName, amenity);
      let hotel = await lib.getHotel(address);

      assert.isTrue(hotel.unitTypes[typeName].amenities.includes(amenity));

      await lib.removeAmenity(address, typeName, amenity);
      hotel = await lib.getHotel(address);

      assert.isFalse(hotel.unitTypes[typeName].amenities.includes(amenity));
    });

    it('addImageUnitType: adds an image to the UnitType', async function() {
      const url = "image.jpeg";
      await lib.addUnitType(address, typeName);
      await lib.addImageUnitType(address, typeName, url);
      let hotel = await lib.getHotel(address);

      assert.equal(hotel.unitTypes[typeName].images.length, 1);
      assert.equal(hotel.unitTypes[typeName].images[0], url);
    });

    it('removeImageUnitType: removes an image from the UnitType', async function() {
      const url = "image.jpeg";
      await lib.addUnitType(address, typeName);
      await lib.addImageUnitType(address, typeName, url);
      let hotel = await lib.getHotel(address);

      assert.equal(hotel.unitTypes[typeName].images.length, 1);
      assert.equal(hotel.unitTypes[typeName].images[0], url);

      await lib.removeImageUnitType(address, typeName, 0);
      hotel = await lib.getHotel(address);

      assert.equal(hotel.unitTypes[typeName].images.length, 1);
      assert.equal(hotel.unitTypes[typeName].images[0], '');
    });


    it('setDefaultPrice: set / get the default price', async() => {
      const price = 100.00
      await lib.addUnitType(address, typeName);
      await lib.setDefaultPrice(address, typeName, price);
      hotel = await lib.getHotel(address)
      const priceSet = hotel.unitTypes[typeName].defaultPrice;
      assert.equal(priceSet, price);
    })

    it('setDefaultLifPrice: set / get the default Lif price', async() => {
      const lifPrice = 20
      await lib.addUnitType(address, typeName);
      await lib.setDefaultLifPrice(address, typeName, lifPrice);
      hotel = await lib.getHotel(address);
      const lifPriceSet = await hotel.unitTypes[typeName].defaultLifPrice;

      assert.equal(lifPriceSet, lifPrice);
    })

    
    it('setCurrencyCode: sets the setCurrencyCode', async() => {
      const currencyCode = 948;
      await lib.addUnitType(address, typeName);
      let hotel = await lib.getHotel(address);
      assert.isNull(hotel.unitTypes[typeName].currencyCode);

      await lib.setCurrencyCode(address, typeName, currencyCode);
      hotel = await lib.getHotel(address);

      const setCurrencyCode = hotel.unitTypes[typeName].currencyCode;
      assert.equal(setCurrencyCode, 'CHW');
    });

    it('setCurrencyCode: throws on invalid currencyCode', async() => {
      try {
        await lib.setCurrencyCode(hotelAddress, unitAddress, 256);
        assert(false);
      } catch(e){}

      try {
        await lib.setCurrencyCode(hotelAddress, unitAddress, -5);
        assert(false);
      } catch(e){}

      try {
        await lib.setCurrencyCode(hotelAddress, unitAddress, 'EUR');
        assert(false);
      } catch(e){}
    });

  });

  describe('Units: Adding and Removing', () => {
    const typeName = 'BASIC_ROOM'
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      address = Object.keys(hotels)[0];
      await lib.addUnitType(address, typeName);
    });

    it('addUnit: adds a unit to the hotel', async () => {
      await lib.addUnit(address, typeName);
      const hotel = await lib.getHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isDefined(hotel.units[unitAddress]);
      assert.isTrue(hotel.units[unitAddress].active);
      assert.equal(hotel.units[unitAddress].unitType, typeName);
    });

    it('removeUnit: removes a unit from the hotel', async () => {
      await lib.addUnit(address, typeName);
      let hotel = await lib.getHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isDefined(hotel.units[unitAddress]);

      await lib.removeUnit(address, unitAddress);
      hotel = await lib.getHotel(address);

      assert.isUndefined(hotel.units[unitAddress]);
    });
  });

  describe('Units: Attributes and Prices', function(){
    const typeName = 'BASIC_ROOM'
    let hotelAddress;
    let unitAddress;
    let hotel;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      hotelAddress = Object.keys(hotels)[0];

      await lib.addUnitType(hotelAddress, typeName);
      await lib.addUnit(hotelAddress, typeName);
      hotel = await lib.getHotel(hotelAddress);
      unitAddress = hotel.unitAddresses[0];
    });

    it('setUnitActive: sets the units active status', async () => {
      assert.isTrue(hotel.units[unitAddress].active);

      await lib.setUnitActive(hotelAddress, unitAddress, false);
      hotel = await lib.getHotel(hotelAddress);
      assert.isFalse(hotel.units[unitAddress].active);
    })

    it('setUnitSpecialPrice: sets the units price across a range of dates', async () => {
      const price =  100.00;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;

      await lib.setUnitSpecialPrice(
        hotelAddress,
        unitAddress,
        price,
        fromDate,
        daysAmount
      )

      const fromDay = web3provider.utils.formatDate(fromDate);
      const range = _.range(fromDay, fromDay + daysAmount);

      for (let day of range) {
        const {
          specialPrice,
          specialLifPrice,
          bookedBy
        } = await lib.getReservation(unitAddress, day);

        assert.equal(specialPrice, price);
      }
    });

    it('setUnitSpecialLifPrice: sets the units price across a range of dates', async () => {
      const price =  100;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;

      await lib.setUnitSpecialLifPrice(
        hotelAddress,
        unitAddress,
        price,
        fromDate,
        daysAmount
      )

      const fromDay = web3provider.utils.formatDate(fromDate);
      const range = _.range(fromDay, fromDay + daysAmount);

      for (let day of range) {
        const {
          specialPrice,
          specialLifPrice,
          bookedBy
        } = await lib.getReservation(unitAddress, day);

        assert.equal(specialLifPrice, price);
      }
    });

  });

  describe('Asynchronous calls', () => {

    it('should perform TX asynchronously when passing callbacks object', (done) => {
      let callbacks = {
        transactionHash: (hash) => {
          assert(true);
        },
        receipt: async (receipt) => {
          let hotels = await lib.getHotels();
          assert.equal(lib.hotelsAddrs.length, 1);
          done();
        },
        error: (error) => {
          assert(false);
        }
      }
      let txPromise = lib.createHotel(hotelName, hotelDescription, callbacks);
      assert(txPromise.then);
    });

  });

  describe('Create full hotel', () => {
    it('Should create a complete hotel', async() => {
      const hotelToCreate = {
        name: 'Test Hotel',
        description: 'Test Hotel desccription',
        lineOne: 'line One',
        lineTwo: 'line two',
        zip: 'C1414',
        country: 'AR',
        timezone: 'ART',
        latitude: 38.002281,
        longitude: 57.557541,
        waitConfirmation: true,
        images: ['image.url0', 'image.url1'],
        unitTypes:{
          BASIC_ROOM:{
            amenities: [22, 11],
            info: {
              description: 'Best unit type ever',
              minGuests: 1,
              maxGuests: 8
            },
            currencyCode: 948,
            defaultPrice: 78.00,
            defaultLifPrice: 1,
            images: ['image.url2', 'image.url3']
          },
          FAMILY_CABIN: {
            amenities: [22, 33],
            info: {
              description: 'Best family cabin type ever',
              minGuests: 2,
              maxGuests: 7
            },
            currencyCode: 948,
            defaultPrice: 79.00,
            defaultLifPrice: 3,
            images: ['image.url22', 'image.url33']
          }
        },
        units: [
          {
            active: true,
            unitType: 'BASIC_ROOM',
          },
          {
            active: true,
            unitType: 'FAMILY_CABIN',
          },
          {
            active: false,
            unitType: 'BASIC_ROOM',
          }
        ]
      }
      const {hotel} = await lib.createFullHotel(hotelToCreate);

      assert.equal(hotelToCreate.name, hotel.name);
      assert.equal(hotelToCreate.description, hotel.description);
      assert.equal(hotelToCreate.lineOne, hotel.lineOne);
      assert.equal(hotelToCreate.lineTwo, hotel.lineTwo);
      assert.equal(hotelToCreate.zip, hotel.zip);
      assert.equal(hotelToCreate.country, hotel.country);
      assert.equal(hotelToCreate.timezone, hotel.timezone);
      assert.equal(hotelToCreate.latitude, hotel.latitude);
      assert.equal(hotelToCreate.longitude, hotel.longitude);
      assert.equal(hotelToCreate.waitConfirmation, hotel.waitConfirmation);
      assert.sameMembers(hotelToCreate.images, hotel.images);

      const unitTypesToCreate = hotelToCreate.unitTypes;
      const unitTypes = hotel.unitTypes;

      assert.sameMembers(unitTypesToCreate['BASIC_ROOM'].amenities, unitTypes['BASIC_ROOM'].amenities);
      assert.sameMembers(unitTypesToCreate['BASIC_ROOM'].images, unitTypes['BASIC_ROOM'].images);
      assert.equal(unitTypesToCreate['BASIC_ROOM'].description, unitTypes['BASIC_ROOM'].description);
      assert.equal(unitTypesToCreate['BASIC_ROOM'].minGuests, unitTypes['BASIC_ROOM'].minGuests);
      assert.equal(unitTypesToCreate['BASIC_ROOM'].maxGuests, unitTypes['BASIC_ROOM'].maxGuests);
      assert.equal(unitTypesToCreate['BASIC_ROOM'].defaultPrice, unitTypes['BASIC_ROOM'].defaultPrice);

      assert.sameMembers(unitTypesToCreate['FAMILY_CABIN'].amenities, unitTypes['FAMILY_CABIN'].amenities);
      assert.sameMembers(unitTypesToCreate['FAMILY_CABIN'].images, unitTypes['FAMILY_CABIN'].images);
      assert.equal(unitTypesToCreate['FAMILY_CABIN'].description, unitTypes['FAMILY_CABIN'].description);
      assert.equal(unitTypesToCreate['FAMILY_CABIN'].minGuests, unitTypes['FAMILY_CABIN'].minGuests);
      assert.equal(unitTypesToCreate['FAMILY_CABIN'].maxGuests, unitTypes['FAMILY_CABIN'].maxGuests);
      assert.equal(unitTypesToCreate['FAMILY_CABIN'].defaultPrice, unitTypes['FAMILY_CABIN'].defaultPrice);

      const unitsToCreate = hotelToCreate.units.sort((a,b) => a.unitType < b.unitType)
      const units = Object.values(hotel.units).sort((a,b) => a.unitType < b.unitType)

      for (let i = 0; i < units.length; i++) {
        assert.equal(units[i].active, unitsToCreate[i].active)
        assert.equal(units[i].unitType, unitsToCreate[i].unitType)
        assert.equal(units[i].defaultPrice, unitsToCreate[i].defaultPrice)
        assert.equal(units[i].defaultLifPrice, unitsToCreate[i].defaultLifPrice)
      }
    });
  });
});

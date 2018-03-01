const assert = require('chai').assert;
const _ = require('lodash');
const sinon = require('sinon');
const Web3PromiEvent = require('web3-core-promievent');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);
const web3providerFactory = require('../libs/web3provider');

const HotelManager = require('../libs/HotelManager.js');
const help = require('./helpers/index');

describe('HotelManager', function() {
  const hotelName = 'WTHotel';
  const hotelDescription = 'Winding Tree Hotel';
  const gasMargin = 1.5;
  const estimatedGas = 38;
  const indexAddress = '0xe91036d59eAd8b654eE2F5b354245f6D7eD2487e';
  const ownerAccount = '0x8a33BA3429680B31383Fc46f4Ff22f7ac838511F';
  const hotelAddress = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
  const existingHotelIndex = 17;
  const unitIndex = 3;
  const toHexResult = '0xaa5';

  const unitAddress = '0xdf3b7a20D5A08957AbE8d9366efcC38cfF00aea6';
  const unitTypeAddress = '0x9de34468b0057B77A9C896e74Cb30ed05425D52A';

  let hotelManager;
  let web3provider;
  let sendTransactionStub, deployUnitTypeStub, deployUnitStub;

  beforeEach(async function() {
    web3provider = web3providerFactory.getInstance(web3);
    sinon.stub(web3provider.contracts, 'getIndexInstance').returns({
      options: {
        address: indexAddress,
      },
      methods: {
        callHotel: help.stubContractMethodResult({}, (args) => {return 'encoded-call-hotel-' + Object.values(args.methodParams).join(':')}, 37),
        registerHotel: help.stubContractMethodResult({}, (args) => {return 'encoded-register-hotel-' + args.methodParams[0]}, 37),
        deleteHotel: help.stubContractMethodResult({}, (args) => {return 'encoded-remove-hotel-' + args.methodParams[0]}, 37),
        getHotelsByManager: help.stubContractMethodResult([hotelAddress], (args) => {return 'encoded-hotelsbymanager-' + args.methodParams[0]}, 37),
      }
    });
    sinon.stub(web3provider.data, 'getHotelAndIndex').returns({hotel: {
      methods: {
        changeConfirmation: help.stubContractMethodResult({}, (args) => {return 'encoded-changeconfirmation-' + args.methodParams[0]}, 37),
        editInfo: help.stubContractMethodResult({}, (args) => {return 'encoded-editinfo-' + Object.values(args.methodParams).join(':')}, 37),
        editAddress: help.stubContractMethodResult({}, (args) => {return 'encoded-editaddress-' + Object.values(args.methodParams).join(':')}, 37),
        editLocation: help.stubContractMethodResult({}, (args) => {return 'encoded-editlocation-' + Object.values(args.methodParams).join(':')}, 37),
        addImage: help.stubContractMethodResult({}, (args) => {return 'encoded-addimage-' + Object.values(args.methodParams).join(':')}, 37),
        removeImage: help.stubContractMethodResult({}, (args) => {return 'encoded-removeimage-' + Object.values(args.methodParams).join(':')}, 37),
        addUnitType: help.stubContractMethodResult({}, (args) => {return 'encoded-addunittype-' + Object.values(args.methodParams).join(':')}, 37),
        deleteUnitType: help.stubContractMethodResult({}, (args) => {return 'encoded-removeunittype-' + Object.values(args.methodParams).join(':')}, 37),
        getUnitType: help.stubContractMethodResult(unitTypeAddress, {}, 37),
        callUnitType: help.stubContractMethodResult({}, (args) => {return 'encoded-callunittype-' + Object.values(args.methodParams).join(':')}, 37),
        callUnit: help.stubContractMethodResult({}, (args) => {return 'encoded-callunit-ut-' + Object.values(args.methodParams).join(':')}, 37),
        addUnit: help.stubContractMethodResult({}, (args) => {return 'encoded-addunit-ut-' + Object.values(args.methodParams).join(':')}, 37),
        deleteUnit: help.stubContractMethodResult({}, (args) => {return 'encoded-removeunit-ut-' + Object.values(args.methodParams).join(':')}, 37),
      }
    }, index: existingHotelIndex});
    sinon.stub(web3provider.contracts, 'getHotelUnitTypeInstance').returns({
      methods: {
        edit: help.stubContractMethodResult({}, (args) => {return 'encoded-edit-ut-' + Object.values(args.methodParams).join(':')}, 37),
        addAmenity: help.stubContractMethodResult({}, (args) => {return 'encoded-addamenity-ut-' + Object.values(args.methodParams).join(':')}, 37),
        removeAmenity: help.stubContractMethodResult({}, (args) => {return 'encoded-removeamenity-ut-' + Object.values(args.methodParams).join(':')}, 37),
        addImage: help.stubContractMethodResult({}, (args) => {return 'encoded-addimage-ut-' + Object.values(args.methodParams).join(':')}, 37),
        removeImage: help.stubContractMethodResult({}, (args) => {return 'encoded-removeimage-ut-' + Object.values(args.methodParams).join(':')}, 37),
        setDefaultPrice: help.stubContractMethodResult({}, (args) => {return 'encoded-setdefaultprice-ut-' + Object.values(args.methodParams).join(':')}, 37),
        setDefaultLifPrice: help.stubContractMethodResult({}, (args) => {return 'encoded-setdefaultlifprice-ut-' + Object.values(args.methodParams).join(':')}, 37),
        setCurrencyCode: help.stubContractMethodResult({}, (args) => {return 'encoded-setcurrencycode-ut-' + Object.values(args.methodParams).join(':')}, 37),
      }
    });
    sinon.stub(web3provider.contracts, 'getHotelUnitInstance').returns({
      options: {
        address: unitAddress,
      },
      methods: {
        setActive: help.stubContractMethodResult({}, (args) => {return 'encoded-setactive-u-' + Object.values(args.methodParams).join(':')}, 37),
        setSpecialPrice: help.stubContractMethodResult({}, (args) => {return 'encoded-setspecialprice-u-' + Object.values(args.methodParams).join(':')}, 37),
        setSpecialLifPrice: help.stubContractMethodResult({}, (args) => {return 'encoded-setspeciallifprice-u-' + Object.values(args.methodParams).join(':')}, 37),
      }
    });
    sendTransactionStub = sinon.stub(web3provider.web3.eth, 'sendTransaction').callsFake(() => {
      let promiEvent = new Web3PromiEvent();
      setTimeout(() => {
        promiEvent.eventEmitter.emit('transactionHash', '0x12345');
        promiEvent.eventEmitter.emit('receipt', {});
        promiEvent.resolve({});
      }, 0);
      return promiEvent.eventEmitter;
    });
    sinon.stub(web3provider.web3.eth, 'getTransactionCount').returns(31);
    sinon.stub(web3provider.web3.eth, 'estimateGas').returns(estimatedGas);
    sinon.stub(web3provider.web3.utils, 'toHex').returns(toHexResult);
    sinon.stub(web3provider.data, 'getUnitTypeIndex').returns(unitIndex);
    sinon.stub(web3provider.utils, 'addGasMargin').returns(654);
    deployUnitTypeStub = sinon.stub(web3provider.deploy, 'deployUnitType').returns({
      options: {
        address: unitTypeAddress,
      },
    });
    deployUnitStub = sinon.stub(web3provider.deploy, 'deployUnit').returns({
      options: {
        address: unitAddress,
      },
    });
    
    hotelManager = new HotelManager({
      indexAddress: indexAddress,
      owner: ownerAccount,
      gasMargin: gasMargin,
      web3provider: web3provider
    });
  });

  afterEach(() => {
    web3provider.contracts.getIndexInstance.restore();
    web3provider.contracts.getHotelUnitTypeInstance.restore();
    web3provider.web3.eth.sendTransaction.restore();
    web3provider.web3.eth.getTransactionCount.restore();
    web3provider.web3.eth.estimateGas.restore();
    web3provider.data.getHotelAndIndex.restore();
    web3provider.data.getUnitTypeIndex.restore();
    web3provider.deploy.deployUnitType.restore();
    web3provider.deploy.deployUnit.restore();
    web3provider.web3.utils.toHex.restore();
    web3provider.utils.addGasMargin.restore();
    sendTransactionStub.restore();
  });

  describe('Index', function() {
    it('createHotel: should create a transaction with a new hotel', async function() {
      await hotelManager.createHotel(hotelName, hotelDescription);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-register-hotel-' + hotelName);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].nonce, 31);
    });

    it('createHotel: should perform TX asynchronously when passing callbacks object', (done) => {
      let callbacks = {
        transactionHash: (hash) => {
          assert(true);
        },
        receipt: async (receipt) => {
          done();
        },
        error: (error) => {
          assert(false);
        }
      }
      let txPromise = hotelManager.createHotel(hotelName, hotelDescription, callbacks).then(() => {
        assert.equal(sendTransactionStub.callCount, 1);
        assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-register-hotel-' + hotelName);
        assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
        assert.equal(sendTransactionStub.firstCall.args[0].nonce, 31);
      }).catch((e) => {
        assert(false);
      })
    });


    it('removeHotel: should create a transaction that will remove a hotel', async function() {
      await hotelManager.removeHotel(hotelAddress);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-remove-hotel-' + existingHotelIndex);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].nonce, 31);
    });

    it('should make multiple hotels', async function() {
      const nameA = 'a';
      const nameB = 'b';
      const descA = 'desc a';
      const descB = 'desc b';
      const typeName = "BASIC_ROOM";

      // Create Hotels
      await hotelManager.createHotel(nameA, descA);
      await hotelManager.createHotel(nameB, descB);
      assert.equal(sendTransactionStub.callCount, 2);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-register-hotel-' + nameA);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].nonce, 31);
      assert.equal(sendTransactionStub.secondCall.args[0].data, 'encoded-register-hotel-' + nameB);
      assert.equal(sendTransactionStub.secondCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.secondCall.args[0].nonce, 31);
    });
  });

  describe('Hotel', function() {
    it('should create a transaction that changes requireConfirmation flag', async function() {
      await hotelManager.setRequireConfirmation(hotelAddress, true);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-changeconfirmation-true');
    });

    it('should create a transaction that changes the hotel info', async function() {
      const newName = 'Awesome WTHotel';
      const newDescription = 'Awesome Winding Tree Hotel';
      await hotelManager.changeHotelInfo(hotelAddress, newName, newDescription);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-editinfo-' + newName + ':' + newDescription);
    });

    it('changeHotelLocation: edits the hotel address', async function(){
      const lineOne = 'Common street 123';
      const lineTwo = '';
      const zip = '6655';
      const country = 'ES';
      const timezone = 'Europe/Madrid';
      const longitude = 40.426371;
      const latitude = -3.703578;

      await hotelManager.changeHotelLocation(hotelAddress, lineOne, lineTwo, zip, country, timezone, longitude, latitude);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      const {long, lat} = web3provider.utils.locationToUint(longitude, latitude);;
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-editlocation-' +
        [lineOne, lineTwo, zip, toHexResult, timezone, long, lat].join(':')
      );
    });

    it('should create a transaction that adds an image to the hotel', async function() {
      const url = "image.jpeg";

      await hotelManager.addImageHotel(hotelAddress, url);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-addimage-' + url);
    });

    it('removeImageHotel: removes an image from the hotel', async function() {
      const imageIndex = 0;
      await hotelManager.removeImageHotel(hotelAddress, imageIndex);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-removeimage-' + imageIndex);
    })
  });

  describe('UnitTypes', function() {
    const typeName = 'BASIC_ROOM';

    it('should generate a transaction that adds a UnitType into a hotel', async () => {
      await hotelManager.addUnitType(hotelAddress, typeName);
      assert.equal(deployUnitTypeStub.callCount, 1);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-addunittype-' + unitTypeAddress);
    });

    it('should generate a transaction that removes a UnitType from a hotel', async() => {
      await hotelManager.removeUnitType(hotelAddress, typeName);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':' + 'encoded-removeunittype-' + [toHexResult, unitIndex].join(':'));
    });

    it('addUnitType: initializes info correctly', async() => {
      await hotelManager.addUnitType(hotelAddress, typeName);
      assert.equal(deployUnitTypeStub.callCount, 1);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':'
        + 'encoded-addunittype-' + [unitTypeAddress].join(':'));
    });

    it('should generate a transaction that updates a UnitType', async() => {
      const description = 'Adobe';
      const minGuests = 1;
      const maxGuests = 2;

      await hotelManager.editUnitType(
        hotelAddress,
        typeName,
        description,
        minGuests,
        maxGuests
      );
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') +
        ':encoded-edit-ut-' + [description, minGuests, maxGuests].join(':'));
    });

    it('should generate a transaction to add amenity to UnitType', async () => {
      const amenity = 10;
      await hotelManager.addAmenity(hotelAddress, typeName, amenity);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') +
        ':encoded-addamenity-ut-' + [amenity].join(':'));
    });

    it('should generate a transaction to remove amenity from UnitType', async () => {
      const amenity = 10;
      await hotelManager.removeAmenity(hotelAddress, typeName, amenity);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') +
        ':encoded-removeamenity-ut-' + [amenity].join(':'));
    });

    it('should generate a transaction to add an image to UnitType', async function() {
      const url = "image.jpeg";
      await hotelManager.addImageUnitType(hotelAddress, typeName, url);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') +
        ':encoded-addimage-ut-' + [url].join(':'));
    });

    it('should generate a transaction to remove an image from UnitType', async function() {
      const imageIndex = 3;
      await hotelManager.removeImageUnitType(hotelAddress, typeName, imageIndex);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') +
        ':encoded-removeimage-ut-' + [imageIndex].join(':'));
    });

  });

  describe('Units', () => {
    const typeName = 'BASIC_ROOM';
    const toHexResult = '0x4568';
    const unitIndex = 4;
    
    it('should generate a transaction to add a unit', async () => {
      await hotelManager.addUnit(hotelAddress, typeName);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-addunit-ut-' + [unitAddress].join(':'));
    });

    it('should generate a transaction to remove a unit', async () => {
      await hotelManager.removeUnit(hotelAddress, unitAddress);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-removeunit-ut-' + [unitAddress].join(':'));
    });

    it('setUnitActive: sets the units active status', async () => {
      await hotelManager.setUnitActive(hotelAddress, unitAddress, false);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunit-ut-' + [unitAddress].join(':') +
        ':encoded-setactive-u-' + [false].join(':'));
    })

    it('setUnitSpecialPrice: sets the units price across a range of dates', async () => {
      const price =  100.00;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const fromDay = web3provider.utils.formatDate(fromDate);

      await hotelManager.setUnitSpecialPrice(
        hotelAddress,
        unitAddress,
        price,
        fromDate,
        daysAmount
      );
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunit-ut-' + [unitAddress].join(':') +
        ':encoded-setspecialprice-u-' + [price * 100, fromDay, daysAmount].join(':'));
    });

    it('setUnitSpecialLifPrice: sets the units price across a range of dates', async () => {
      const price =  3;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const fromDay = web3provider.utils.formatDate(fromDate);

      await hotelManager.setUnitSpecialLifPrice(
        hotelAddress,
        unitAddress,
        price,
        fromDate,
        daysAmount
      );
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunit-ut-' + [unitAddress].join(':') +
        ':encoded-setspeciallifprice-u-' + [web3provider.utils.lif2LifWei(price), fromDay, daysAmount].join(':'));
    });
  });

  describe('UnitType', () => {

    it('setDefaultPrice: set / get the default price', async() => {
      const price = 100.00
      await hotelManager.setDefaultPrice(hotelAddress, unitAddress, price);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') + 
        ':encoded-setdefaultprice-ut-' + [web3provider.utils.priceToUint(price)].join(':')
        );
    })

    it('setDefaultLifPrice: set / get the default Lif price', async() => {
      const lifPrice = 20
      await hotelManager.setDefaultLifPrice(hotelAddress, unitAddress, lifPrice);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') + 
        ':encoded-setdefaultlifprice-ut-' + [web3provider.utils.lif2LifWei(lifPrice)].join(':')
        );
    })

    it('setCurrencyCode: sets the setCurrencyCode', async() => {
      const currencyCode = 948;
      const currencyHex = web3provider.utils.currencyCodeToHex(currencyCode);
      await hotelManager.setCurrencyCode(hotelAddress, unitAddress, currencyCode);
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].from, ownerAccount);
      assert.equal(sendTransactionStub.firstCall.args[0].to, indexAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'encoded-call-hotel-' + existingHotelIndex +
        ':encoded-callunittype-' + [toHexResult].join(':') +
        ':encoded-setcurrencycode-ut-' + [currencyHex].join(':'));
    });

    it('should throw on invalid currencyCode', async() => {
      try {
        await hotelManager.setCurrencyCode(hotelAddress, unitAddress, 256);
        assert(false);
      } catch(e) {
        assert.match(e.toString(), /Invalid currency code/);
      }

      try {
        await hotelManager.setCurrencyCode(hotelAddress, unitAddress, -5);
        assert(false);
      } catch(e) {
        assert.match(e.toString(), /Invalid currency code/);
      }

      try {
        await hotelManager.setCurrencyCode(hotelAddress, unitAddress, 'EUR');
        assert(false);
      } catch(e) {
        assert.match(e.toString(), /Invalid currency code/);
      }
    });
  });

  describe('Create full hotel', () => {
    const hotelToCreate = {
      name: 'Test Hotel',
      description: 'Test Hotel desccription',
      lineOne: 'line One',
      lineTwo: 'line two',
      zip: 'C1414',
      country: 'Argentina',
      timezone: 3,
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
            maxGuests: 8,
            price: '10'
          },
          currencyCode: 948,
          defaultPrice: 78.00,
          defaultLifPrice: 2,
          images: ['image.url2', 'image.url3']
        },
        FAMILY_CABIN: {
          amenities: [22, 33],
          info: {
            description: 'Best family cabin type ever',
            minGuests: 2,
            maxGuests: 7,
            price: '11'
          },
          currencyCode: 951,
          defaultPrice: 79.00,
          defaultLifPrice: 3,
          images: ['image.url22', 'image.url33']
        }
      },
      units: [
        {
          active: true,
          unitType: 'BASIC_ROOM',
          _addr: 'a',
        },
        {
          active: true,
          unitType: 'FAMILY_CABIN',
          _addr: 'b',
        },
        {
          active: false,
          unitType: 'BASIC_ROOM',
          _addr: 'c',
        }
      ]
    };
    let getHotelInfoStub;
    beforeEach(() => {
      getHotelInfoStub = sinon.stub(web3provider.data, 'getHotelInfo');
      getHotelInfoStub.onCall(0).returns({
        name: hotelToCreate.name,
        description: hotelToCreate.description,
      });
      getHotelInfoStub.onCall(1).returns({
        units: _.keyBy(hotelToCreate.units, '_addr'),
        unitAddresses: ['a', 'b', 'c'],
      });
    });

    afterEach(() => {
      web3provider.data.getHotelInfo.restore();
    });

    it('Should create a complete hotel', async() =>{
      const {hotel} = await hotelManager.createFullHotel(hotelToCreate);

      assert.equal(web3provider.web3.eth.sendTransaction.callCount, 29);
      const txCalls = web3provider.web3.eth.sendTransaction;
      assert.equal(txCalls.getCall(0).args[0].data, 'encoded-register-hotel-' + hotelToCreate.name);
      assert.equal(txCalls.getCall(1).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-changeconfirmation-' + hotelToCreate.waitConfirmation);
      let {long, lat} = web3provider.utils.locationToUint(hotelToCreate.longitude, hotelToCreate.latitude);
      assert.equal(txCalls.getCall(2).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-editlocation-' + [hotelToCreate.lineOne, hotelToCreate.lineTwo, hotelToCreate.zip, toHexResult, hotelToCreate.timezone, long, lat].join(':'));
      assert.equal(txCalls.getCall(3).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addimage-' + [hotelToCreate.images[0]].join(':'));
      assert.equal(txCalls.getCall(4).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addimage-' + [hotelToCreate.images[1]].join(':'));
      assert.equal(deployUnitTypeStub.callCount, 2);
      assert.equal(txCalls.getCall(5).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addunittype-' + unitTypeAddress);
      assert.equal(txCalls.getCall(6).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addunittype-' + unitTypeAddress);
      const unitType0 = hotelToCreate.unitTypes['BASIC_ROOM'];
      const unitType1 = hotelToCreate.unitTypes['FAMILY_CABIN'];
      const currencyHex1 = web3provider.utils.currencyCodeToHex(unitType0.currencyCode);
      const currencyHex2 = web3provider.utils.currencyCodeToHex(unitType1.currencyCode);

      assert.equal(txCalls.getCall(7).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-edit-ut-' + [unitType0.info.description, unitType0.info.minGuests, unitType0.info.maxGuests].join(':'));
      assert.equal(txCalls.getCall(8).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addimage-ut-' + [unitType0.images[0]].join(':'));
      assert.equal(txCalls.getCall(9).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addimage-ut-' + [unitType0.images[1]].join(':'));
      assert.equal(txCalls.getCall(10).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addamenity-ut-' + [unitType0.amenities[0]].join(':'));
      assert.equal(txCalls.getCall(11).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addamenity-ut-' + [unitType0.amenities[1]].join(':'));
      assert.equal(txCalls.getCall(12).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-setdefaultprice-ut-' + web3provider.utils.priceToUint(unitType0.defaultPrice));
      assert.equal(txCalls.getCall(13).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-setdefaultlifprice-ut-' + web3provider.utils.lif2LifWei(unitType0.defaultLifPrice));
      assert.equal(txCalls.getCall(14).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-setcurrencycode-ut-' + currencyHex1);

      assert.equal(txCalls.getCall(15).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-edit-ut-' + [unitType1.info.description, unitType1.info.minGuests, unitType1.info.maxGuests].join(':'));
      assert.equal(txCalls.getCall(16).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addimage-ut-' + [unitType1.images[0]].join(':'));
      assert.equal(txCalls.getCall(17).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addimage-ut-' + [unitType1.images[1]].join(':'));
      assert.equal(txCalls.getCall(18).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addamenity-ut-' + [unitType1.amenities[0]].join(':'));
      assert.equal(txCalls.getCall(19).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-addamenity-ut-' + [unitType1.amenities[1]].join(':'));
      assert.equal(txCalls.getCall(20).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-setdefaultprice-ut-' + web3provider.utils.priceToUint(unitType1.defaultPrice));
      assert.equal(txCalls.getCall(21).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-setdefaultlifprice-ut-' + web3provider.utils.lif2LifWei(unitType1.defaultLifPrice));
      assert.equal(txCalls.getCall(22).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunittype-' + toHexResult + ':encoded-setcurrencycode-ut-' + currencyHex2);
      
      assert.equal(deployUnitStub.callCount, 3);
      assert.equal(txCalls.getCall(23).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addunit-ut-' + unitAddress);
      assert.equal(txCalls.getCall(24).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addunit-ut-' + unitAddress);
      assert.equal(txCalls.getCall(25).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-addunit-ut-' + unitAddress);
      const sortedUnits = hotelToCreate.units.sort((a,b) => a.unitType < b.unitType);
      let firstUnit = sortedUnits[0];
      let secondUnit = sortedUnits[1];
      let thirdUnit = sortedUnits[2];
      
      assert.equal(txCalls.getCall(26).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunit-ut-' + unitAddress + ':encoded-setactive-u-' + firstUnit.active);
      assert.equal(txCalls.getCall(27).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunit-ut-' + unitAddress + ':encoded-setactive-u-' + secondUnit.active);
      assert.equal(txCalls.getCall(28).args[0].data, 'encoded-call-hotel-' + existingHotelIndex + ':encoded-callunit-ut-' + unitAddress + ':encoded-setactive-u-' + thirdUnit.active);
    });
  });
});

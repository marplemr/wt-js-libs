const help = require('./helpers/index');

const assert = require('chai').assert;

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);
const library = process.env.WT_BUILD === 'node' ? require('../dist/node/wt-js-libs') : require('../dist/web/wt-js-libs');
const User = library.User;
const web3providerFactory = library.web3providerFactory;
const HotelManager = library.HotelManager;
const HotelEvents = library.HotelEvents;

xdescribe('HotelEvents', function () {
  let Manager;
  let token;
  let index;
  let wallet;
  let hotel;
  let user;
  let accounts;
  let ownerAccount;
  let augusto;
  let hotelAddress;
  let unitAddress;
  let hotelEvents;
  let web3provider;

  before(async function () {
    web3provider = web3providerFactory.getInstance(web3);
    accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet,
    } = await help.createWindingTreeEconomy(accounts, web3provider));

    ownerAccount = wallet['1'].address;
    augusto = wallet['2'].address;
  });
  describe('subscribe', function () {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';

    beforeEach(async function () {
      Manager = new HotelManager({
        indexAddress: index.options.address,
        owner: ownerAccount,
        gasMargin: 1.5,
        web3provider: web3provider,
      });
      ({
        hotelAddress,
        unitAddress,
      } = await help.generateCompleteHotel(Manager));

      user = new User({
        account: augusto,
        gasMargin: 1.5,
        tokenAddress: token.options.address,
        web3provider: web3provider,
      });
      hotelEvents = new HotelEvents({ web3provider: web3provider });

      hotel = web3provider.contracts.getHotelInstance(hotelAddress);
      await Manager.setDefaultLifPrice(hotelAddress, unitAddress, price);
    });

    it.skip('should subscribe to one hotels events and hear a Book event', async (done) => {
      hotelEvents.subscribe(hotelAddress);
      hotelEvents.on('Book', event => {
        assert.isString(event.transactionHash);
        assert.isNumber(event.blockNumber);
        assert.isString(event.id);

        assert.equal(event.guestData, guestData);
        assert.equal(event.address, hotel.options.address);
        assert.equal(event.from, user.account);
        assert.equal(event.fromDate.toString(), fromDate.toString());
        assert.equal(event.unit, unitAddress);
        assert.equal(event.daysAmount, daysAmount);
        done();
      });

      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
    });

    it.skip('should subscribe to one hotels events and hear a Book event');
    it.skip('should subscribe to many hotels events and hear many Book events');
    it.skip('should hear a CallStarted event');
    it.skip('should hear a CallFinish event');
  });
});

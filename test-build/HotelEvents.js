const assert = require('chai').assert;
const _ = require('lodash');
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

const help = require('./helpers/index');
const library = require('../dist/node/wt-js-libs');
const User = library.User;
const Web3Proxy = library.Web3Proxy;
const HotelEvents = library.HotelEvents;

xdescribe('HotelEvents', function() {
  let Manager;
  let token;
  let index;
  let accounts;
  let ownerAccount;
  let augusto;
  let hotelAddress;
  let unitAddress;
  let hotelEvents;
  let web3proxy;

  before(async function(){
    web3proxy = Web3Proxy.getInstance(web3);
    accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet
    } = await help.createWindingTreeEconomy(accounts, web3proxy));

    ownerAccount = wallet["1"].address;
    augusto = wallet["2"].address;
  })

  describe('subscribe', function() {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';

    beforeEach(async function() {
      ({
        Manager,
        hotelAddress,
        unitAddress
      } = await help.generateCompleteHotel(index.options.address, ownerAccount, 1.5, web3proxy));

      userOptions = {
        account: augusto,
        gasMargin: 1.5,
        tokenAddress: token.options.address,
        web3proxy: web3proxy
      }

      user = new User(userOptions);
      hotelEvents = new HotelEvents({web3proxy: web3proxy});

      hotel = utils.getInstance('Hotel', hotelAddress);
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


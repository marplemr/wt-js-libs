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
const Web3Proxy = library.Web3Proxy;
const HotelManager = library.HotelManager;

const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

describe('Web3Proxy', function() {
  const hotelName = 'WTHotel';
  const hotelDescription = 'Winding Tree Hotel';
  const gasMargin = 1.5;

  let hotelManager;
  let user;
  let augusto;
  let index;
  let daoAccount;
  let ownerAccount;
  let web3proxy;

  before(async function(){
    web3proxy = Web3Proxy.getInstance(web3);
    const accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet
    } = await help.createWindingTreeEconomy(accounts, web3proxy));

    ownerAccount = wallet["0"].address;
    daoAccount = wallet["1"].address;
    augusto = wallet["2"].address;
  })

  beforeEach(async function() {
    hotelManager = new HotelManager({
      indexAddress: index.options.address,
      owner: ownerAccount,
      gasMargin: gasMargin,
      web3proxy: web3proxy
    });
    userOptions = {
      account: augusto,
      tokenAddress: token.options.address,
      web3proxy: web3proxy,
    }
    user = new User(userOptions);
  });

  describe('Decoding TX', () => {

    it('should decode a single TX to create a hotel', async () => {
      let createHotelTx = await hotelManager.createHotel(hotelName, hotelDescription);
      let decodedTx = await web3proxy.data.decodeTxInput(createHotelTx.transactionHash, index.options.address, ownerAccount);
      assert(!decodedTx.hotel);
      assert.equal(decodedTx.method.name, 'Register Hotel');
      assert.equal(decodedTx.method.params.find(e => e.name == 'name').value, hotelName);
      assert.equal(decodedTx.method.params.find(e => e.name == 'description').value, hotelDescription);
    });

    it('should decode multiple TXs to create and edit a hotel', async () => {
      let createHotelTx = await hotelManager.createHotel(hotelName, hotelDescription);

      const hotels = await hotelManager.getHotels();
      let hotelAddress = Object.keys(hotels)[0];

      const newName = 'Awesome WTHotel';
      const newDescription = 'Awesome Winding Tree Hotel';
      let editInfoTx = await hotelManager.changeHotelInfo(hotelAddress, newName, newDescription);

      let decodedTxs = await web3proxy.data.getDecodedTransactions(ownerAccount, index.options.address, 0, 'test');

      let decodedCreateHotelTx = decodedTxs.find(tx => tx.hash == createHotelTx.transactionHash);
      assert(!decodedCreateHotelTx.hotel);
      assert.equal(decodedCreateHotelTx.method.name, 'Register Hotel');
      assert.equal(decodedCreateHotelTx.method.params.find(e => e.name == 'name').value, hotelName);
      assert.equal(decodedCreateHotelTx.method.params.find(e => e.name == 'description').value, hotelDescription);

      let decodedEditInfoTx = decodedTxs.find(tx => tx.hash == editInfoTx.transactionHash);
      assert.equal(decodedEditInfoTx.method.name, 'Edit Info');
      assert.equal(decodedEditInfoTx.hotel, hotelAddress);
      assert.equal(decodedEditInfoTx.method.params.find(e => e.name == '_name').value, newName);
      assert.equal(decodedEditInfoTx.method.params.find(e => e.name == '_description').value, newDescription);
    });

  });
  
  describe('getBookingTransactions', () => {
    const daysAmount = 5;
    const price = 1;
    const guestData = 'guestData';
    let hotelManager, hotelAddress, unitAddress;

    beforeEach(async () => {
      ({
        Manager,
        hotelAddress,
        unitAddress
      } = await help.generateCompleteHotel(index.options.address, ownerAccount, 1.5, web3proxy));
    });

    it('returns a single booking made by an address', async() => {
      const fromDate = new Date('2020-10-10T00:00:00');
      let bookTx = await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const txs = await web3proxy.data.getBookingTransactions(userOptions.account, index.options.address, 0, 'test');

      bookTx = txs.find(tx => tx.hash === bookTx.transactionHash);
      assert.equal(web3.utils.toChecksumAddress(bookTx.hotel), hotelAddress);
      assert.equal(web3.utils.toChecksumAddress(bookTx.unit), unitAddress);
      assert.equal(bookTx.unitType, web3proxy.utils.bytes32ToString(await web3proxy.contracts.getContractInstance('HotelUnit', unitAddress).methods.unitType().call()));
      assert.equal(bookTx.fromDate.toDateString(), fromDate.toDateString());
      let toDate = fromDate;
      toDate.setDate(fromDate.getDate() + daysAmount);
      assert.equal(bookTx.toDate.toDateString(), toDate.toDateString());
      assert(bookTx.status);
    });

    it('shows booking status as false when confirmation is required', async() => {
      await Manager.setRequireConfirmation(hotelAddress, true);
      const fromDate = new Date('2021-10-10T00:00:00');
      let bookTx = await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const txs = await web3proxy.data.getBookingTransactions(userOptions.account, index.options.address, 0, 'test');
      bookTx = txs.find(tx => tx.hash === bookTx.transactionHash);
      assert.equal(web3.utils.toChecksumAddress(bookTx.hotel), hotelAddress);
      assert.equal(web3.utils.toChecksumAddress(bookTx.unit), unitAddress);
      assert.equal(bookTx.unitType, web3proxy.utils.bytes32ToString(await web3proxy.contracts.getContractInstance('HotelUnit', unitAddress).methods.unitType().call()));
      assert.equal(bookTx.fromDate.toDateString(), fromDate.toDateString());
      let toDate = fromDate;
      toDate.setDate(fromDate.getDate() + daysAmount);
      assert.equal(bookTx.toDate.toDateString(), toDate.toDateString());
      assert(!bookTx.status);
    })

  })
});
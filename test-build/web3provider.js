var chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const Web3 = require('web3');

const help = require('./helpers/index');
const library = require('../dist/node/wt-js-libs');
const User = library.User;
const web3providerFactory = library.web3providerFactory;
const HotelManager = library.HotelManager;

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

describe('web3provider', function () {
  const hotelName = 'WTHotel';
  const hotelDescription = 'Winding Tree Hotel';
  const gasMargin = 1.5;

  let hotelManager;
  let user;
  let augusto;
  let index;
  let token;
  let wallet;
  let userOptions;
  let ownerAccount;
  let web3provider;

  before(async function () {
    web3provider = web3providerFactory.getInstance(web3);
    const accounts = await web3.eth.getAccounts();
    ({
      index,
      token,
      wallet,
    } = await help.createWindingTreeEconomy(accounts, web3provider));

    ownerAccount = wallet['0'].address;
    augusto = wallet['2'].address;
  });

  beforeEach(async function () {
    hotelManager = new HotelManager({
      indexAddress: index.options.address,
      owner: ownerAccount,
      gasMargin: gasMargin,
      web3provider: web3provider,
    });
    userOptions = {
      account: augusto,
      tokenAddress: token.options.address,
      web3provider: web3provider,
    };
    user = new User(userOptions);
  });

  describe('Decoding TX', () => {
    it('should decode a single TX to create a hotel', async () => {
      let createHotelTx = await hotelManager.createHotel(hotelName, hotelDescription);
      let decodedTx = await web3provider.data.decodeTxInput(createHotelTx.transactionHash, index.options.address, ownerAccount);
      assert(!decodedTx.hotel);
      assert.equal(decodedTx.method.name, 'Register Hotel');
      assert.equal(decodedTx.method.params.find(e => e.name === 'name').value, hotelName);
      assert.equal(decodedTx.method.params.find(e => e.name === 'description').value, hotelDescription);
    });

    it('should decode multiple TXs to create and edit a hotel', async () => {
      let createHotelTx = await hotelManager.createHotel(hotelName, hotelDescription);

      const hotels = await hotelManager.getHotels();
      let hotelAddress = Object.keys(hotels)[0];

      const newName = 'Awesome WTHotel';
      const newDescription = 'Awesome Winding Tree Hotel';
      let editInfoTx = await hotelManager.changeHotelInfo(hotelAddress, newName, newDescription);

      let decodedTxs = await web3provider.data.getDecodedTransactions(ownerAccount, index.options.address, 0, 'test');

      let decodedCreateHotelTx = decodedTxs.find(tx => tx.hash === createHotelTx.transactionHash);
      assert(!decodedCreateHotelTx.hotel);
      assert.equal(decodedCreateHotelTx.method.name, 'Register Hotel');
      assert.equal(decodedCreateHotelTx.method.params.find(e => e.name === 'name').value, hotelName);
      assert.equal(decodedCreateHotelTx.method.params.find(e => e.name === 'description').value, hotelDescription);

      let decodedEditInfoTx = decodedTxs.find(tx => tx.hash === editInfoTx.transactionHash);
      assert.equal(decodedEditInfoTx.method.name, 'Edit Info');
      assert.equal(decodedEditInfoTx.hotel, hotelAddress);
      assert.equal(decodedEditInfoTx.method.params.find(e => e.name === '_name').value, newName);
      assert.equal(decodedEditInfoTx.method.params.find(e => e.name === '_description').value, newDescription);
    });
  });
  
  describe('getBookingTransactions', () => {
    const daysAmount = 5;
    const guestData = 'guestData';
    let Manager, hotelAddress, unitAddress;

    beforeEach(async () => {
      ({
        Manager,
        hotelAddress,
        unitAddress,
      } = await help.generateCompleteHotel(index.options.address, ownerAccount, 1.5, web3provider));
    });

    it('works for a lowercase address and on a private network', async () => {
      const fromDate = new Date('2020-10-10T00:00:00');
      let bookTx = await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const txs = await web3provider.data.getBookingTransactions(userOptions.account.toLowerCase(), index.options.address, 0, 'private');
      assert.notEqual(txs.length, 0);
      bookTx = txs.find(tx => tx.hash === bookTx.transactionHash);
      assert.equal(web3.utils.toChecksumAddress(bookTx.hotel), hotelAddress);
      assert.equal(web3.utils.toChecksumAddress(bookTx.unit), unitAddress);
    });

    it('returns a single booking made by an address', async () => {
      const fromDate = new Date('2020-10-10T00:00:00');
      let bookTx = await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const txs = await web3provider.data.getBookingTransactions(userOptions.account, index.options.address, 0, 'test');

      bookTx = txs.find(tx => tx.hash === bookTx.transactionHash);
      assert.equal(web3.utils.toChecksumAddress(bookTx.hotel), hotelAddress);
      assert.equal(web3.utils.toChecksumAddress(bookTx.unit), unitAddress);
      assert.equal(bookTx.unitType, web3provider.utils.bytes32ToString(await web3provider.contracts.getHotelUnitInstance(unitAddress).methods.unitType().call()));
      assert.equal(bookTx.fromDate.toDateString(), fromDate.toDateString());
      let toDate = fromDate;
      toDate.setDate(fromDate.getDate() + daysAmount);
      assert.equal(bookTx.toDate.toDateString(), toDate.toDateString());
      assert(bookTx.status);
    });

    it('shows booking status as false when confirmation is required', async () => {
      await Manager.setRequireConfirmation(hotelAddress, true);
      const fromDate = new Date('2021-10-10T00:00:00');
      let bookTx = await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      const txs = await web3provider.data.getBookingTransactions(userOptions.account, index.options.address, 0, 'test');
      bookTx = txs.find(tx => tx.hash === bookTx.transactionHash);
      assert.equal(web3.utils.toChecksumAddress(bookTx.hotel), hotelAddress);
      assert.equal(web3.utils.toChecksumAddress(bookTx.unit), unitAddress);
      assert.equal(bookTx.unitType, web3provider.utils.bytes32ToString(await web3provider.contracts.getHotelUnitInstance(unitAddress).methods.unitType().call()));
      assert.equal(bookTx.fromDate.toDateString(), fromDate.toDateString());
      let toDate = fromDate;
      toDate.setDate(fromDate.getDate() + daysAmount);
      assert.equal(bookTx.toDate.toDateString(), toDate.toDateString());
      assert(!bookTx.status);
    });
  });
});

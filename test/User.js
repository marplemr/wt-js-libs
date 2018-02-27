const assert = require('chai').assert;
var BN = require('bn.js');
const sinon = require('sinon');
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);
const web3providerFactory = require('../libs/web3provider');

const User = require('../libs/User');
const help = require('./helpers/index');

describe('User', function() {
  const augusto = '0x8a33BA3429680B31383Fc46f4Ff22f7ac838511F';
  const hotelAddress = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
  const tokenAddress = '0xe91036d59eAd8b654eE2F5b354245f6D7eD2487e';
  const unitAddress = '0xdf3b7a20D5A08957AbE8d9366efcC38cfF00aea6';
  const gasMargin = 1.5;
  let web3provider;
  let user;

  beforeEach( async function() {
    web3provider = web3providerFactory.getInstance(web3);
  });

  describe('balanceCheck', function() {
    beforeEach(() => {
      sinon.stub(web3provider.contracts, 'getTokenInstance').returns({
        methods: {
          balanceOf: help.stubContractMethodResult(new BN(web3provider.utils.lif2LifWei(500)))
        }
      });
      user = new User({web3provider: web3provider, account: augusto, tokenAddress: tokenAddress, gasMargin: gasMargin});
    });

    afterEach(() => {
      web3provider.contracts.getTokenInstance.restore();
    });

    it('should return true if balance is greater than cost', async () => {
      const cost = 50;
      const canPay = await user.balanceCheck(cost);
      assert.isTrue(canPay);
    })

    it('should return false if balance is lower than cost', async() => {
      const cost = 5000;
      const canPay = await user.balanceCheck(cost);
      assert.isFalse(canPay);
    })
  });

  describe('book', function() {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const estimatedGas = 38;
    const guestData = 'guestData';
    let sendTransactionStub;
    
    beforeEach(() => {
      sinon.stub(web3provider.contracts, 'getHotelInstance').returns({
        methods: {
          book: help.stubContractMethodResult({}, 'book-encodedABI'),
          beginCall: help.stubContractMethodResult({}, 'beginCall-encodedABI'),
        }
      });
      sendTransactionStub = sinon.stub(web3provider.web3.eth, 'sendTransaction').returns({});
      sinon.stub(web3provider.web3.eth, 'estimateGas').returns(estimatedGas);
      sinon.stub(web3provider.web3.eth.net, 'getId').returns('not-a-test');
      user = new User({web3provider: web3provider, account: augusto, tokenAddress: tokenAddress, gasMargin: gasMargin});
    });

    afterEach(() => {
      web3provider.contracts.getHotelInstance.restore();
      sendTransactionStub.restore();
      web3provider.web3.eth.estimateGas.restore();
      web3provider.web3.eth.net.getId.restore();
    });

    it('should create a blockchain transaction', async () => {
      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equalIgnoreCase(sendTransactionStub.firstCall.args[0].from, augusto);
      assert.equalIgnoreCase(sendTransactionStub.firstCall.args[0].to, hotelAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'beginCall-encodedABI');
    });

    it('should apply gas margin in a non-test network', async () => {
      await user.book(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].gas, gasMargin * estimatedGas);
    });
  });

  describe('bookWithLif', function () {
    const fromDate = new Date('10/10/2020');
    const daysAmount = 5;
    const price = 1;
    const estimatedGas = 38;
    const guestData = 'guestData';

    beforeEach(() => {
      sinon.stub(web3provider.contracts, 'getHotelInstance').returns({
        methods: {
          bookWithLif: help.stubContractMethodResult({}, 'bookWithLif-encodedABI'),
          beginCall: help.stubContractMethodResult({}, 'beginCall-encodedABI'),
        }
      });
      sendTransactionStub = sinon.stub(web3provider.web3.eth, 'sendTransaction').returns({});
      sinon.stub(web3provider.web3.eth, 'estimateGas').returns(estimatedGas);
      sinon.stub(web3provider.web3.eth.net, 'getId').returns('not-a-test');
      sinon.stub(web3provider.contracts, 'getTokenInstance').returns({
        options: {
          address: tokenAddress,
        },
        methods: {
          balanceOf: help.stubContractMethodResult(new BN(web3provider.utils.lif2LifWei(500))),
          approveData: help.stubContractMethodResult(true, 'approvalData-encodedABI'),
        }
      });
      user = new User({web3provider: web3provider, account: augusto, tokenAddress: tokenAddress, gasMargin: gasMargin});
      sinon.stub(user.bookings, 'getLifCost').returns(120);
      sinon.stub(user.bookings, 'unitIsAvailable').returns(true);
    });

    afterEach(() => {
      web3provider.contracts.getHotelInstance.restore();
      web3provider.contracts.getTokenInstance.restore();
      sendTransactionStub.restore();
      web3provider.web3.eth.estimateGas.restore();
      web3provider.web3.eth.net.getId.restore();
      user.bookings.getLifCost.restore();
      user.bookings.unitIsAvailable.restore();
    });

    it('should create a blockchain transaction', async () => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );

      assert.equal(sendTransactionStub.callCount, 1);
      assert.equalIgnoreCase(sendTransactionStub.firstCall.args[0].from, augusto);
      assert.equalIgnoreCase(sendTransactionStub.firstCall.args[0].to, tokenAddress);
      assert.equal(sendTransactionStub.firstCall.args[0].data, 'approvalData-encodedABI');
    });

    it('should apply gas margin to a non-test network', async () => {
      await user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      );
      assert.equal(sendTransactionStub.callCount, 1);
      assert.equal(sendTransactionStub.firstCall.args[0].gas, gasMargin * estimatedGas);
    });

    it('should reject if the Unit has already been booked for the range of dates', async () => {
      const firstDate = new Date('10/10/2020');
      const secondDate = new Date('10/11/2020');

      const args = [
        hotelAddress,
        unitAddress,
        firstDate,
        daysAmount,
        guestData
      ];

      await user.bookWithLif(...args)
      args[2] = secondDate;

      try {
        await user.bookWithLif(...args);
        assert(false);
      } catch (e) {
        assert.isDefined(e);
      }
    });

    it('should reject if the Unit is not active', async () => {
      user.bookings.unitIsAvailable.restore();
      sinon.stub(user.bookings, 'unitIsAvailable').returns(false);
      return user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      ).then(() => {
        assert.equal(true, false);
      }).catch((e) => {
        assert.equal(e, 'Unit is not available for the requested dates');
      });
    });

    it('should reject if the users balance is insufficient', async () => {
      user.bookings.getLifCost.restore();
      sinon.stub(user.bookings, 'getLifCost').returns(501);
      return user.bookWithLif(
        hotelAddress,
        unitAddress,
        fromDate,
        daysAmount,
        guestData
      ).then(() => {
        assert.equal(true, false);
      }).catch((e) => {
        assert.equal(e, 'Token balance was too low to attempt this booking.');
      })
    });
  });
});

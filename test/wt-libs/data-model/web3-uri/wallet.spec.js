import { assert } from 'chai';
import sinon from 'sinon';
import helpers from '../../../utils/helpers';
import testedDataModel from '../../../utils/data-model-definition';
import jsonWallet from '../../../utils/test-wallet';
import Web3UriDataModel from '../../../../src/data-model/web3-uri';
import Web3WTWallet from '../../../../src/data-model/web3-uri/wallet';

describe('WTLibs.data-model.web3-uri.wallet', () => {
  let dataModel;
  const correctPassword = 'test123';
  beforeEach(async function () {
    if (process.env.TESTED_DATA_MODEL !== 'web3-uri') {
      this.skip();
    }
    dataModel = Web3UriDataModel.createInstance(testedDataModel.withDataSource().dataModelOptions);
  });

  describe('unlock', () => {
    it('should unlock the wallet', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      wallet.unlock(correctPassword);
    });

    it('should not unlock on a malformed keystore', async () => {
      try {
        const wallet = await dataModel.createWallet({ random: 'object' });
        wallet.unlock('random-pwd');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /not a valid v3 wallet/i);
      }
    });

    it('should not unlock a wallet without web3', async () => {
      const wallet = Web3WTWallet.createInstance(jsonWallet);
      try {
        wallet.unlock(correctPassword);
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot unlock wallet without web3 instance/i);
      }
    });

    it('should not unlock a wallet with a bad password', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      try {
        wallet.unlock('random-password');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /key derivation failed/i);
      }
    });

    it('should not unlock a destroyed wallet', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      wallet.destroy();
      try {
        wallet.unlock(correctPassword);
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot unlock destroyed wallet/i);
      }
    });
  });

  describe('lock', () => {
    it('should lock the wallet', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      wallet.unlock(correctPassword);
      assert.isDefined(wallet.__account);
      wallet.lock();
      assert.isUndefined(wallet.__account);
    });

    it('should not lock a destroyed wallet', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      wallet.destroy();
      try {
        wallet.lock();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot lock destroyed wallet/i);
      }
    });
  });

  describe('destroy', () => {
    it('should destroy a wallet', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      assert.isDefined(wallet.__jsonWallet);
      wallet.destroy();
      assert.isUndefined(wallet.__jsonWallet);
    });

    it('should lock a wallet before destroying it', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      wallet.unlock(correctPassword);
      assert.isDefined(wallet.__account);
      assert.isDefined(wallet.__jsonWallet);
      wallet.destroy();
      assert.isUndefined(wallet.__jsonWallet);
      assert.isUndefined(wallet.__account);
    });

    it('should not destroy an already destroyed wallet', async () => {
      const wallet = await dataModel.createWallet(jsonWallet);
      wallet.destroy();
      try {
        wallet.destroy();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot destroy destroyed wallet/i);
      }
    });
  });

  describe('getAddress', () => {
    let wallet;

    beforeEach(async function () {
      if (process.env.TESTED_DATA_MODEL !== 'web3-uri') {
        this.skip();
      }
      wallet = await dataModel.createWallet(jsonWallet);
    });

    it('should return the address', () => {
      assert.equal(wallet.getAddress().toLowerCase(), '0x' + jsonWallet.address);
    });

    it('should throw when no JSON wallet exists', () => {
      wallet.__jsonWallet = null;
      try {
        wallet.getAddress();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get address/i);
      }
    });

    it('should throw when wallet was destroyed', () => {
      wallet.destroy();
      try {
        wallet.getAddress();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get address/i);
      }
    });
  });

  describe('signAndSendTransaction', () => {
    let wallet;
    beforeEach(async function () {
      if (process.env.TESTED_DATA_MODEL !== 'web3-uri') {
        this.skip();
      }
      wallet = await dataModel.createWallet(jsonWallet);
      sinon.stub(wallet.web3.eth, 'sendSignedTransaction').returns(helpers.stubPromiEvent());
    });

    afterEach(() => {
      wallet.web3.eth.sendSignedTransaction.restore();
    });

    it('should throw when called on a destroyed wallet', async () => {
      wallet.destroy();
      try {
        await wallet.signAndSendTransaction({});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot use destroyed wallet/i);
      }
    });

    it('should throw on a locked wallet', async () => {
      try {
        await wallet.signAndSendTransaction({});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot use wallet without unlocking it first/i);
      }
    });

    it('should throw on a wallet without web3', async () => {
      const customWallet = await dataModel.createWallet(jsonWallet);
      customWallet.web3 = null;
      try {
        await customWallet.signAndSendTransaction({});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot use wallet without web3 instance/i);
      }
    });

    it('should sign and send a transaction', async () => {
      wallet.unlock(correctPassword);
      sinon.stub(wallet.__account, 'signTransaction').resolves({ rawTransaction: 'tx-bytecode' });
      const result = await wallet.signAndSendTransaction({
        from: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
        to: 'bbb',
        data: 'data',
        gas: 1234,
      });
      assert.equal(result, 'tx-hash');
    });

    it('should call onReceipt callback', async () => {
      wallet.unlock(correctPassword);
      sinon.stub(wallet.__account, 'signTransaction').resolves({ rawTransaction: 'tx-bytecode' });
      const receiptCallback = sinon.stub().returns(null);
      const result = await wallet.signAndSendTransaction({
        from: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
        to: 'bbb',
        data: 'data',
        gas: 1234,
      }, receiptCallback);
      assert.equal(result, 'tx-hash');
      assert.equal(receiptCallback.callCount, 1);
    });

    it('should reject on error event', async () => {
      wallet.unlock(correctPassword);
      sinon.stub(wallet.__account, 'signTransaction').resolves({ rawTransaction: 'tx-bytecode' });
      wallet.web3.eth.sendSignedTransaction.restore();
      sinon.stub(wallet.web3.eth, 'sendSignedTransaction').returns(helpers.stubPromiEvent({ error: true }));
      try {
        await wallet.signAndSendTransaction({
          from: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
          to: 'bbb',
          data: 'data',
          gas: 1234,
        });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot send transaction/i);
      }
    });

    it('should reject on unexpected error', async () => {
      wallet.unlock(correctPassword);
      sinon.stub(wallet.__account, 'signTransaction').resolves({ rawTransaction: 'tx-bytecode' });
      wallet.web3.eth.sendSignedTransaction.restore();
      sinon.stub(wallet.web3.eth, 'sendSignedTransaction').returns(helpers.stubPromiEvent({ catch: true }));
      try {
        await wallet.signAndSendTransaction({
          from: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
          to: 'bbb',
          data: 'data',
          gas: 1234,
        });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot send transaction/i);
      }
    });
  });
});

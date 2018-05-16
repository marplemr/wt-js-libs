import { assert } from 'chai';
import sinon from 'sinon';
import helpers from '../../../../utils/helpers';
import EthBackedHotelProvider from '../../../../../src/data-model/web3-uri/common/eth-backed-hotel-provider';

describe('WTLibs.data-model.web3-uri.EthBackedHotelProvider', () => {
  let contractsStub, utilsStub, indexContractStub, walletStub;

  beforeEach(() => {
    utilsStub = {
      getCurrentWeb3Provider: sinon.stub().returns('current-provider'),
      applyGasCoefficient: sinon.stub().returns(12),
      determineCurrentAddressNonce: sinon.stub().resolves(3),
      determineDeployedContractFutureAddress: sinon.stub().returns('future-address'),
    };
    contractsStub = {
      getHotelInstance: sinon.stub().resolves({
        methods: {
          url: helpers.stubContractMethodResult('some-remote-url'),
          manager: helpers.stubContractMethodResult('some-remote-manager'),
          editInfo: helpers.stubContractMethodResult('info-edited'),
        },
        options: {
          jsonInterface: {},
        },
      }),
    };
    indexContractStub = {
      options: {
        address: 'index-address',
      },
      methods: {
        callHotel: helpers.stubContractMethodResult('called-hotel'),
        registerHotel: helpers.stubContractMethodResult('registered-hotel'),
        deleteHotel: helpers.stubContractMethodResult('deleted-hotel'),
      },
    };
    walletStub = {
      signAndSendTransaction: sinon.spy((txOpts, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve('tx-hash');
      }),
    };
  });

  describe('initialize', () => {
    it('should setup url and manager fields', async () => {
      const provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub);
      assert.isUndefined(provider.url);
      assert.isUndefined(provider.manager);
      await provider.initialize();
      assert.isDefined(provider.url);
      assert.isDefined(provider.manager);
      assert.isFalse(provider.ethBackedDataset.isDeployed());
    });

    it('should mark eth backed dataset as deployed if address is passed', async () => {
      const provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      await provider.initialize();
      assert.isTrue(provider.ethBackedDataset.isDeployed());
    });
  });

  describe('setLocalData', () => {
    it('should set manager and url', async () => {
      const provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      await provider.setLocalData({ url: 'new-url', manager: 'new-manager' });
      assert.equal(await provider.url, 'new-url');
      assert.equal(await provider.manager, 'new-manager');
    });

    it('should not set manager when hotel already has an address', async () => {
      const provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      await provider.setLocalData({ url: 'new-url', manager: 'new-manager' });
      assert.equal(await provider.url, 'new-url');
      assert.equal(await provider.manager, 'some-remote-manager');
    });

    it('should never null manager', async () => {
      const provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      await provider.setLocalData({ url: 'new-url', manager: 'new-manager' });
      assert.equal(await provider.url, 'new-url');
      assert.equal(await provider.manager, 'new-manager');
      await provider.setLocalData({ url: 'another-url', manager: null });
      assert.equal(await provider.url, 'another-url');
      assert.equal(await provider.manager, 'new-manager');
    });
  });

  describe('createOnNetwork', () => {
    let provider;
    beforeEach(async () => {
      provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub);
      await provider.initialize();
    });
    it('should precompute address', async () => {
      const result = await provider.createOnNetwork(walletStub, {}, 'data-url');
      assert.deepEqual(result, ['tx-hash']);
      // index nonce + caller nonce
      assert.equal(utilsStub.determineCurrentAddressNonce.callCount, 2);
      assert.equal(utilsStub.determineDeployedContractFutureAddress.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
    });

    // TODO test cross hotel.manager vs. wallet.account

    it('should call registerHotel with applied gasCoefficient', async () => {
      const result = await provider.createOnNetwork(walletStub, { from: 'xx' }, 'data-url');
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().encodeABI.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.firstCall.args[0].from, 'xx');
    });

    it('should mark dataset as deployed on success', async () => {
      assert.isFalse(provider.ethBackedDataset.isDeployed());
      await provider.createOnNetwork(walletStub, { from: 'xx' }, 'data-url');
      assert.isTrue(provider.ethBackedDataset.isDeployed());
    });

    it('should throw on transaction error', async () => {
      walletStub.signAndSendTransaction = sinon.stub().rejects(new Error('Cannot send signed transaction'));
      try {
        await provider.createOnNetwork(walletStub, { from: 'xx' }, 'data-url');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot create hotel/i);
      }
    });
  });

  describe('updateOnNetwork', () => {
    let provider;
    beforeEach(async () => {
      provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      await provider.initialize();
      provider.url = 'something new';
    });

    it('should throw on an undeployed contract', async () => {
      try {
        let provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub);
        await provider.initialize();
        await provider.updateOnNetwork(walletStub, {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel/i);
      }
    });

    it('should call callHotel with applied gasCoefficient', async () => {
      const result = await provider.updateOnNetwork(walletStub, { from: 'xx' }, 'data-url');
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.callHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.callHotel().encodeABI.callCount, 1);
      assert.equal(indexContractStub.methods.callHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.firstCall.args[0].from, 'xx');
    });

    it('should throw on error', async () => {
      walletStub.signAndSendTransaction = sinon.stub().rejects(new Error('Cannot send signed transaction'));
      try {
        await provider.updateOnNetwork(walletStub, { from: 'xx' }, 'data-url');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot update hotel/i);
      }
    });
  });

  describe('removeFromNetwork', () => {
    let provider;
    beforeEach(async () => {
      provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      await provider.initialize();
    });

    it('should throw on an undeployed contract', async () => {
      try {
        provider.ethBackedDataset.__deployedFlag = false;
        await provider.removeFromNetwork(walletStub, {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });

    it('should call deleteHotel with applied gasCoefficient', async () => {
      const result = await provider.removeFromNetwork(walletStub, { from: 'xx' });
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().encodeABI.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.firstCall.args[0].from, 'xx');
    });

    it('should mark dataset as obsolete on success', async () => {
      assert.isFalse(provider.ethBackedDataset.isObsolete());
      await provider.removeFromNetwork(walletStub, { from: 'xx' });
      assert.isTrue(provider.ethBackedDataset.isObsolete());
    });

    it('should throw on error', async () => {
      walletStub.signAndSendTransaction = sinon.stub().rejects(new Error('Cannot send signed transaction'));
      try {
        await provider.removeFromNetwork(walletStub, { from: 'xx' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });
  });
});

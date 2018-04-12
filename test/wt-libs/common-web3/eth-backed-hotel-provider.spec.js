import { assert } from 'chai';
import sinon from 'sinon';
import helpers from '../../utils/helpers';
import EthBackedHotelProvider from '../../../src/common-web3/eth-backed-hotel-provider';

describe('WTLibs.common-web3.EthBackedHotelProvider', () => {
  let contractsStub, utilsStub, indexContractStub;

  beforeEach(() => {
    utilsStub = {
      getCurrentWeb3Provider: sinon.stub().returns('current-provider'),
      encodeMethodCall: sinon.stub().returns('encoded-method-call'),
      applyGasCoefficient: sinon.stub().returns(12),
      determineCurrentAddressNonce: sinon.stub().resolves(3),
      determineDeployedContractFutureAddress: sinon.stub().returns('future-address'),
    };
    contractsStub = {
      getHotelInstance: sinon.stub().resolves({
        methods: {
          url: helpers.stubContractMethodResult('some-remote-url'),
          manager: helpers.stubContractMethodResult('some-remote-manager'),
        },
        abi: {},
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
      provider.setLocalData({ url: 'new-url', manager: 'new-manager' });
      assert.equal(await provider.url, 'new-url');
      assert.equal(await provider.manager, 'new-manager');
    });

    it('should never null manager', async () => {
      const provider = new EthBackedHotelProvider(utilsStub, contractsStub, indexContractStub, 'fake-address');
      provider.setLocalData({ url: 'new-url', manager: 'new-manager' });
      assert.equal(await provider.url, 'new-url');
      assert.equal(await provider.manager, 'new-manager');
      provider.setLocalData({ url: 'another-url', manager: null });
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
      const result = await provider.createOnNetwork({}, 'data-url');
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.determineCurrentAddressNonce.callCount, 1);
      assert.equal(utilsStub.determineDeployedContractFutureAddress.callCount, 1);
    });

    it('should call registerHotel with applied gasCoefficient', async () => {
      const result = await provider.createOnNetwork({ from: 'xx' }, 'data-url');
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().send.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(indexContractStub.methods.registerHotel().send.firstCall.args[0].from, 'xx');
      assert.equal(indexContractStub.methods.registerHotel().send.firstCall.args[0].gas, 12);
    });

    it('should mark dataset as deployed on success', async () => {
      assert.isFalse(provider.ethBackedDataset.isDeployed());
      await provider.createOnNetwork({ from: 'xx' }, 'data-url');
      assert.isTrue(provider.ethBackedDataset.isDeployed());
    });

    it('should throw on error event', async () => {
      indexContractStub.methods.registerHotel = helpers.stubContractMethodResult('registered-hotel', {
        receipt: false,
        error: true,
      });
      try {
        await provider.createOnNetwork({ from: 'xx' }, 'data-url');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot create hotel/i);
      }
    });

    it('should throw on unexpected error', async () => {
      indexContractStub.methods.registerHotel = helpers.stubContractMethodResult('registered-hotel', {
        receipt: false,
        catch: true,
      });
      try {
        await provider.createOnNetwork({ from: 'xx' }, 'data-url');
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
        await provider.updateOnNetwork({});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel/i);
      }
    });

    it('should call callHotel with applied gasCoefficient', async () => {
      const result = await provider.updateOnNetwork({ from: 'xx' }, 'data-url');
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.callHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.callHotel().send.callCount, 1);
      assert.equal(indexContractStub.methods.callHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(indexContractStub.methods.callHotel().send.firstCall.args[0].from, 'xx');
      assert.equal(indexContractStub.methods.callHotel().send.firstCall.args[0].gas, 12);
    });

    it('should throw on error event', async () => {
      indexContractStub.methods.callHotel = helpers.stubContractMethodResult('registered-hotel', {
        receipt: false,
        error: true,
      });
      try {
        await provider.updateOnNetwork({ from: 'xx' }, 'data-url');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot update hotel/i);
      }
    });

    it('should throw on unexpected error', async () => {
      indexContractStub.methods.callHotel = helpers.stubContractMethodResult('registered-hotel', {
        receipt: false,
        catch: true,
      });
      try {
        await provider.updateOnNetwork({ from: 'xx' }, 'data-url');
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
        await provider.removeFromNetwork({});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });

    it('should call deleteHotel with applied gasCoefficient', async () => {
      const result = await provider.removeFromNetwork({ from: 'xx' });
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().send.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(indexContractStub.methods.deleteHotel().send.firstCall.args[0].from, 'xx');
      assert.equal(indexContractStub.methods.deleteHotel().send.firstCall.args[0].gas, 12);
    });

    it('should mark dataset as obsolete on success', async () => {
      assert.isFalse(provider.ethBackedDataset.isObsolete());
      await provider.removeFromNetwork({ from: 'xx' });
      assert.isTrue(provider.ethBackedDataset.isObsolete());
    });

    it('should throw on error event', async () => {
      indexContractStub.methods.deleteHotel = helpers.stubContractMethodResult('deleted-hotel', {
        receipt: false,
        error: true,
      });
      try {
        await provider.removeFromNetwork({ from: 'xx' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });

    it('should throw on unexpected error', async () => {
      indexContractStub.methods.deleteHotel = helpers.stubContractMethodResult('deleted-hotel', {
        receipt: false,
        catch: true,
      });
      try {
        await provider.removeFromNetwork({ from: 'xx' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });
  });
});

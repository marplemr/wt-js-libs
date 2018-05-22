import { assert } from 'chai';
import sinon from 'sinon';
import helpers from '../../utils/helpers';
import OnChainHotel from '../../../src/data-model/on-chain-hotel';
import StoragePointer from '../../../src/storage-pointer';

describe('WTLibs.data-model.OnChainHotel', () => {
  let contractsStub, utilsStub, indexContractStub, walletStub, urlStub, managerStub;

  beforeEach(() => {
    utilsStub = {
      getCurrentWeb3Provider: sinon.stub().returns('current-provider'),
      applyGasCoefficient: sinon.stub().returns(12),
      determineCurrentAddressNonce: sinon.stub().resolves(3),
      determineDeployedContractFutureAddress: sinon.stub().returns('future-address'),
    };
    urlStub = helpers.stubContractMethodResult('some-remote-url');
    managerStub = helpers.stubContractMethodResult('some-remote-manager');
    contractsStub = {
      getHotelInstance: sinon.stub().resolves({
        methods: {
          url: urlStub,
          manager: managerStub,
          editInfo: helpers.stubContractMethodResult('info-edited'),
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
      const provider = new OnChainHotel(utilsStub, contractsStub, indexContractStub);
      assert.isUndefined(provider.url);
      assert.isUndefined(provider.manager);
      await provider.initialize();
      assert.isDefined(provider.url);
      assert.isDefined(provider.manager);
      assert.isFalse(provider.onChainDataset.isDeployed());
    });

    it('should mark eth backed dataset as deployed if address is passed', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
      assert.isTrue(provider.onChainDataset.isDeployed());
    });
  });

  describe('dataIndex', () => {
    it('should setup StoragePointer during the first access', async () => {
      const storagePointerSpy = sinon.spy(StoragePointer, 'createInstance');
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
      provider.url = 'json://something-new';
      assert.equal(storagePointerSpy.callCount, 0);
      await provider.dataIndex;
      assert.equal(storagePointerSpy.callCount, 1);
      assert.equal(storagePointerSpy.firstCall.args[0], 'json://something-new');
      storagePointerSpy.restore();
    });

    it('should reuse StoragePointer instance in successive calls', async () => {
      const storagePointerSpy = sinon.spy(StoragePointer, 'createInstance');
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
      provider.url = 'json://something-new';
      assert.equal(storagePointerSpy.callCount, 0);
      await provider.dataIndex;
      assert.equal(storagePointerSpy.callCount, 1);
      await provider.dataIndex;
      assert.equal(storagePointerSpy.callCount, 1);
      storagePointerSpy.restore();
    });
  });

  describe('setLocalData', () => {
    it('should set url', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
      await provider.setLocalData({ url: 'new-url' });
      assert.equal(await provider.url, 'new-url');
      await provider.setLocalData({ url: 'another-url' });
      assert.equal(await provider.url, 'another-url');
    });

    it('should never null url', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
      await provider.setLocalData({ url: 'new-url' });
      assert.equal(await provider.url, 'new-url');
      await provider.setLocalData({ url: null });
      assert.equal(await provider.url, 'new-url');
    });

    it('should set manager only when not yet deployed', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
      await provider.setLocalData({ manager: 'new-manager' });
      assert.equal(await provider.manager, 'new-manager');
      provider.address = '0xsomething';
      await provider.setLocalData({ manager: 'another-manager' });
      assert.equal(await provider.manager, 'new-manager');
    });

    it('should never null manager', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
      await provider.setLocalData({ manager: 'new-manager' });
      assert.equal(await provider.manager, 'new-manager');
      await provider.setLocalData({ manager: null });
      assert.equal(await provider.manager, 'new-manager');
    });
  });

  describe('toPlainObject', () => {
    it('should return a plain JS object', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
      await provider.setLocalData({ url: 'some-url', manager: 'some-manager' });
      const plainHotel = await provider.toPlainObject();
      assert.equal(plainHotel.url, 'some-url');
      assert.equal(plainHotel.manager, 'some-manager');
      assert.isUndefined(plainHotel.toPlainObject);
    });
  });

  describe('remote data definition', () => {
    it('should setup remoteGetter for url', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
      assert.equal(urlStub().call.callCount, 0);
      await provider.url;
      assert.equal(urlStub().call.callCount, 1);
    });

    it('should setup remoteGetter for manager', async () => {
      const provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
      assert.equal(managerStub().call.callCount, 0);
      await provider.manager;
      assert.equal(managerStub().call.callCount, 1);
    });
  });

  describe('createOnChainData', () => {
    let provider;
    beforeEach(async () => {
      provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
    });
    it('should precompute address', async () => {
      const result = await provider.createOnChainData(walletStub, {});
      assert.deepEqual(result, ['tx-hash']);
      // index nonce + caller nonce
      assert.equal(utilsStub.determineCurrentAddressNonce.callCount, 2);
      assert.equal(utilsStub.determineDeployedContractFutureAddress.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
    });

    // TODO test cross hotel.manager vs. wallet.account

    it('should call registerHotel with applied gasCoefficient', async () => {
      const result = await provider.createOnChainData(walletStub, { from: 'xx' });
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().encodeABI.callCount, 1);
      assert.equal(indexContractStub.methods.registerHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.firstCall.args[0].from, 'xx');
    });

    it('should mark dataset as deployed on success', async () => {
      assert.isFalse(provider.onChainDataset.isDeployed());
      await provider.createOnChainData(walletStub, { from: 'xx' });
      assert.isTrue(provider.onChainDataset.isDeployed());
    });

    it('should throw on transaction error', async () => {
      walletStub.signAndSendTransaction = sinon.stub().rejects(new Error('Cannot send signed transaction'));
      try {
        await provider.createOnChainData(walletStub, { from: 'xx' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot create hotel/i);
      }
    });
  });

  describe('updateOnChainData', () => {
    let provider;
    beforeEach(async () => {
      provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
      provider.url = 'something new';
    });

    it('should throw on an undeployed contract', async () => {
      try {
        let provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub);
        await provider.updateOnChainData(walletStub, {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel/i);
      }
    });

    it('should throw when updating hotel without url', async () => {
      try {
        provider.url = null;
        await provider.updateOnChainData(walletStub, {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot set url when it is not provided/i);
      }
    });

    it('should call callHotel with applied gasCoefficient', async () => {
      const result = await provider.updateOnChainData(walletStub, { from: 'xx' });
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
        await provider.updateOnChainData(walletStub, { from: 'xx' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot update hotel/i);
      }
    });
  });

  describe('removeOnChainData', () => {
    let provider;
    beforeEach(async () => {
      provider = await OnChainHotel.createInstance(utilsStub, contractsStub, indexContractStub, 'fake-address');
    });

    it('should throw on an undeployed contract', async () => {
      try {
        provider.onChainDataset.__deployedFlag = false;
        await provider.removeOnChainData(walletStub, {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });

    it('should call deleteHotel with applied gasCoefficient', async () => {
      const result = await provider.removeOnChainData(walletStub, { from: 'xx' });
      assert.deepEqual(result, ['tx-hash']);
      assert.equal(utilsStub.applyGasCoefficient.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().estimateGas.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().encodeABI.callCount, 1);
      assert.equal(indexContractStub.methods.deleteHotel().estimateGas.firstCall.args[0].from, 'xx');
      assert.equal(walletStub.signAndSendTransaction.callCount, 1);
      assert.equal(walletStub.signAndSendTransaction.firstCall.args[0].from, 'xx');
    });

    it('should mark dataset as obsolete on success', async () => {
      assert.isFalse(provider.onChainDataset.isObsolete());
      await provider.removeOnChainData(walletStub, { from: 'xx' });
      assert.isTrue(provider.onChainDataset.isObsolete());
    });

    it('should throw on error', async () => {
      walletStub.signAndSendTransaction = sinon.stub().rejects(new Error('Cannot send signed transaction'));
      try {
        await provider.removeOnChainData(walletStub, { from: 'xx' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });
  });
});

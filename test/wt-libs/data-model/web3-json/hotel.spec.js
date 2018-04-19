import { assert } from 'chai';
import sinon from 'sinon';
import testedDataModel from '../../../utils/data-model-definition';
import jsonWallet from '../../../utils/test-wallet';
import Web3JsonDataModel from '../../../../src/data-model/web3-json';
import HotelDataProvider from '../../../../src/data-model/web3-json/hotel';

describe('WTLibs.data-model.web3-json.hotel', () => {
  let dataModel, indexDataProvider;

  beforeEach(async function () {
    if (process.env.TESTED_DATA_MODEL !== 'web3-json') {
      this.skip();
    }
    dataModel = Web3JsonDataModel.createInstance(testedDataModel.withDataSource().dataModelOptions);
    indexDataProvider = await dataModel.getWindingTreeIndex(testedDataModel.indexAddress);
  });

  describe('_getDeployedHotel', () => {
    let getHotelContractSpy;
    beforeEach(function () {
      if (process.env.TESTED_DATA_MODEL !== 'web3-json') {
        this.skip();
      }
      getHotelContractSpy = sinon.spy(indexDataProvider.web3Contracts, 'getHotelInstance');
    });

    afterEach(() => {
      indexDataProvider.web3Contracts.getHotelInstance.restore();
    });

    it('should throw when we want hotel from a bad address', async () => {
      try {
        const hotelProvider = await HotelDataProvider.createInstance(dataModel.web3Utils, dataModel.web3Contracts, await indexDataProvider.__getDeployedIndex(), '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA');
        await hotelProvider.__getContractInstance();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel instance/i);
      }
    });

    it('should throw when we want hotel without an address', async () => {
      try {
        const hotelProvider = await HotelDataProvider.createInstance(dataModel.web3Utils, dataModel.web3Contracts, await indexDataProvider.__getDeployedIndex());
        await hotelProvider.__getContractInstance();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel instance/i);
      }
    });

    it('should throw if we try to get data from network in a hotel without address', async () => {
      try {
        const hotelProvider = await HotelDataProvider.createInstance(dataModel.web3Utils, dataModel.web3Contracts, await indexDataProvider.__getDeployedIndex());
        await hotelProvider.ethBackedDataset.__syncRemoteData();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot sync remote data/i);
      }
    });

    it('should cache contract instances', async () => {
      assert.equal(getHotelContractSpy.callCount, 0);
      const hotelProvider = await HotelDataProvider.createInstance(dataModel.web3Utils, dataModel.web3Contracts, await indexDataProvider.__getDeployedIndex(), '0x4a763f50dfe5cf4468b4171539e021a26fcee0cc');
      assert.equal(getHotelContractSpy.callCount, 1);
      await hotelProvider.__getContractInstance();
      assert.equal(getHotelContractSpy.callCount, 1);
      await hotelProvider.__getContractInstance();
      assert.equal(getHotelContractSpy.callCount, 1);
    });
  });

  describe('write to network', () => {
    // it should not update when data is not changed
    it('should update', async () => {
      let wallet = await dataModel.createWallet(jsonWallet);
      await wallet.unlock('test123');
      const result = await indexDataProvider.addHotel(wallet, {
        name: 'new hotel',
        description: 'some description',
        manager: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
      });

      const hotelProvider = await HotelDataProvider.createInstance(dataModel.web3Utils, dataModel.web3Contracts, await indexDataProvider.__getDeployedIndex(), result.address);
      const newName = 'Random changed name';
      hotelProvider.name = newName;
      await hotelProvider.updateOnNetwork(wallet, {
        from: await hotelProvider.manager,
        to: indexDataProvider.address,
      });
      assert.equal(await hotelProvider.name, newName);
      let freshHotelProvider = await HotelDataProvider.createInstance(dataModel.web3Utils, dataModel.web3Contracts, await indexDataProvider.__getDeployedIndex(), result.address);
      assert.equal(await hotelProvider.name, await freshHotelProvider.name);
      // And remove the hotel to keep the data consistent
      await indexDataProvider.removeHotel(wallet, freshHotelProvider);
      wallet.destroy();
    });
  });
});

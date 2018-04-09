import { assert } from 'chai';
import sinon from 'sinon';
import testedDataModel from '../../../utils/data-model-definition';
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
        const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA');
        await hotelProvider._getContractInstance();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel instance/i);
      }
    });

    it('should throw when we want hotel without an address', async () => {
      try {
        const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex());
        await hotelProvider._getContractInstance();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot get hotel instance/i);
      }
    });

    it('should throw if we try to get data from network in a hotel without address', async () => {
      try {
        const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex());
        await hotelProvider.ethBackedData._syncRemoteData();
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot sync remote data/i);
      }
    });

    it('should cache contract instances', async () => {
      const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0x4a763f50dfe5cf4468b4171539e021a26fcee0cc');
      assert.equal(getHotelContractSpy.callCount, 0);
      await hotelProvider._getContractInstance();
      assert.equal(getHotelContractSpy.callCount, 1);
      await hotelProvider._getContractInstance();
      assert.equal(getHotelContractSpy.callCount, 1);
    });
  });

  describe('data getters', () => {
    it('should fetch data from network only after the getter is accessed', async () => {
      const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
      sinon.spy(hotelProvider.ethBackedData, '_syncRemoteData');
      assert.equal(hotelProvider.ethBackedData._syncRemoteData.callCount, 0);
      assert.equal(await hotelProvider.name, 'First hotel');
      assert.equal(hotelProvider.ethBackedData._syncRemoteData.callCount, 1);
      assert.equal(await hotelProvider.manager, '0x87265a62c60247f862b9149423061b36b460f4bb');
      assert.equal(hotelProvider.ethBackedData._syncRemoteData.callCount, 1);
    });
  });

  describe('write to network', () => {
    // it should not update when data is not changed
    it('should update', async () => {
      const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
      const oldName = await hotelProvider.name;
      const newName = 'Random changed name';
      hotelProvider.name = newName;
      await hotelProvider.updateOnNetwork({
        from: await hotelProvider.manager,
        to: indexDataProvider.address,
      });
      assert.equal(await hotelProvider.name, newName);
      let freshHotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
      assert.equal(await hotelProvider.name, await freshHotelProvider.name);

      // And change this back to keep data consistent for other tests
      hotelProvider.name = oldName;
      await hotelProvider.updateOnNetwork({
        from: await hotelProvider.manager,
        to: indexDataProvider.address,
      });
      assert.equal(await hotelProvider.name, oldName);
      freshHotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
      assert.equal(await hotelProvider.name, await freshHotelProvider.name);
    });
  });
});

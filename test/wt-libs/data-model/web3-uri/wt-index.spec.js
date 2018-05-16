import { assert } from 'chai';
import WTIndexDataProvider from '../../../../src/data-model/web3-uri/wt-index';
import Web3UriDataModel from '../../../../src/data-model/web3-uri';
import testedDataModel from '../../../utils/data-model-definition';

describe('WTLibs.data-models.web3-uri.WTIndexDataProvider', () => {
  let dataModel, indexDataProvider;

  beforeEach(async function () {
    if (process.env.TESTED_DATA_MODEL !== 'web3-uri') {
      this.skip();
    }
    dataModel = Web3UriDataModel.createInstance(testedDataModel.withDataSource().dataModelOptions);
    indexDataProvider = await dataModel.getWindingTreeIndex(testedDataModel.indexAddress);
  });

  it('should throw when we want index from a bad address', async () => {
    const customIndexDataProvider = await WTIndexDataProvider.createInstance('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA', dataModel.web3Utils, dataModel.web3Contracts);
    try {
      await customIndexDataProvider.__getDeployedIndex();
      throw new Error('should not have been called');
    } catch (e) {
      assert.match(e.message, /cannot get index instance/i);
    }
  });

  describe('getHotel', () => {
    it('should throw if address is malformed', async () => {
      try {
        await indexDataProvider.getHotel('random-address');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot find hotel/i);
      }
    });

    it('should throw if no hotel exists on that address', async () => {
      try {
        await indexDataProvider.getHotel('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot find hotel/i);
      }
    });

    it('should throw if hotel cannot be added due to network issues', async () => {
      // TODO this might probably be emulated in another way
      const myIndexDataProvider = await WTIndexDataProvider.createInstance('some-other-address', dataModel.web3Utils, dataModel.web3Contracts);
      try {
        await myIndexDataProvider.addHotel({ manager: 'b' });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot add hotel/i);
      }
    });
  });
});

import _ from 'lodash';
import { assert } from 'chai';
import FullJsonDataModel from '../../../src/data-model/full-json';
import dataSource from '../../utils/data/network.json';

// cloneDeep to ensure data isolation
function getFreshDataSource () {
  return _.cloneDeep(dataSource);
}

describe('WTLibs.data-model.full-json', () => {
  beforeEach(function () {
    if (process.env.TESTED_DATA_MODEL !== 'full-json') {
      this.skip();
    }
  });

  describe('createInstance', () => {
    it('should not panic on empty options', async () => {
      const dataModel = await FullJsonDataModel.createInstance();
      assert.isDefined(dataModel.options);
      assert.isDefined(dataModel.source);
    });

    it('should store the original data source', async () => {
      const dataModel = await FullJsonDataModel.createInstance({ source: getFreshDataSource() });
      assert.isDefined(dataModel.options);
      assert.isDefined(dataModel.source);
      assert.isDefined(dataModel.source.fullIndex.index);
      assert.isDefined(dataModel.source.fullIndex.index.hotels);
    });
  });

  describe('WindingTreeIndex', () => {
    let dataModel, index, dataSource;

    beforeEach(async () => {
      dataSource = getFreshDataSource();
      dataModel = FullJsonDataModel.createInstance({ source: dataSource });
      index = await dataModel.getWindingTreeIndex('fullIndex');
    });

    describe('createInstance', () => {
      it('should create basic data structure if source is empty', async () => {
        dataModel = FullJsonDataModel.createInstance();
        index = await dataModel.getWindingTreeIndex('random-address');
        assert.isDefined(index.source.index);
        assert.isDefined(index.source.index.hotels);
      });

      it('should create basic data structure if hotels are empty', async () => {
        dataModel = FullJsonDataModel.createInstance({ source: { index: {} } });
        index = await dataModel.getWindingTreeIndex('random-address');
        assert.isDefined(index.source.index);
        assert.isDefined(index.source.index.hotels);
      });
    });

    describe('addHotel', () => {
      it('should add hotel', async () => {
        const result = await index.addHotel({ url: 'a', manager: 'Donald' });
        const hotel = await index.getHotel(result.address);
        assert.isDefined(hotel);
        assert.equal(await hotel.url, 'a');
        assert.isDefined(index.source.index.hotels);
        assert.isDefined(index.source.index.hotels[await hotel.address]);
      });
    });

    describe('getHotel', () => {
      it('should get hotel', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const hotel = await index.getHotel(address);
        assert.isDefined(hotel);
        assert.isDefined(index.source.index.hotels);
        assert.equal(await hotel.address, address);
        assert.equal(await hotel.url, index.source.index.hotels[address].url);
        assert.equal(await hotel.manager, index.source.index.hotels[address].manager);
      });

      it('should throw when hotel does not exist', async () => {
        try {
          await index.getHotel('random-address');
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot find hotel/i);
        }
      });

      it('should get added hotel', async () => {
        const result = await index.addHotel({ url: 'Third one', manager: 'Donald' });
        assert.isDefined(index.source.index.hotels);
        assert.isDefined(index.source.index.hotels[result.address]);
        const hotel = await index.getHotel(result.address);
        assert.isDefined(hotel);
        assert.isDefined(await hotel.url, 'Third one');
        assert.equal(result.address, await hotel.address);
      });
    });

    describe('removeHotel', () => {
      it('should throw on a non-existent hotel', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const fakeAddress = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
        try {
          const hotel = _.cloneDeep(await index.getHotel(address));
          hotel.address = fakeAddress;
          await index.removeHotel(hotel);
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot remove/i);
        }
      });

      it('should throw on a non-existent manager', async () => {
        const manager = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        try {
          const hotel = _.cloneDeep(await index.getHotel(address));
          hotel.manager = manager;
          await index.removeHotel(hotel);
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot remove/i);
        }
      });
      it('should not remove a hotel without address', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        try {
          const hotel = _.cloneDeep(await index.getHotel(address));
          hotel.address = null;
          await index.removeHotel(hotel);
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot remove/i);
        }
      });
    });

    describe('getAllHotels', () => {
      it('should get all hotels', async () => {
        const hotels = await index.getAllHotels();
        assert.isDefined(hotels);
        assert.equal(hotels.length, Object.keys(index.source.index.hotels).length);
      });

      it('should get empty list if no hotels were added', async () => {
        dataModel = FullJsonDataModel.createInstance();
        index = await dataModel.getWindingTreeIndex('random-address');
        const hotels = await index.getAllHotels();
        assert.isDefined(hotels);
        assert.equal(hotels.length, 0);
      });
    });
  });
});

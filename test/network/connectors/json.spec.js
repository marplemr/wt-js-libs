import _ from 'lodash';
import { assert } from 'chai';
import JsonConnector from '../../../src/network/connectors/json';
import dataSource from '../../utils/data/network.json';

// cloneDeep to ensure data isolation
function getFreshDataSource () {
  return _.cloneDeep(dataSource);
}

describe('WTLibs.network.connectors.json', () => {
  beforeEach(function () {
    if (process.env.TESTED_NETWORK !== 'json') {
      this.skip();
    }
  });

  describe('createInstance', () => {
    it('should not panic on empty options', async () => {
      const connector = await JsonConnector.createInstance();
      assert.isDefined(connector.options);
      assert.isDefined(connector.source);
    });

    it('should store the original data source', async () => {
      const connector = await JsonConnector.createInstance({ source: getFreshDataSource() });
      assert.isDefined(connector.options);
      assert.isDefined(connector.source);
      assert.isDefined(connector.source.fullIndex.index);
      assert.isDefined(connector.source.fullIndex.index.hotels);
    });
  });

  describe('WindingTreeIndex', () => {
    let connector, index, dataSource;

    beforeEach(async () => {
      dataSource = getFreshDataSource();
      connector = JsonConnector.createInstance({ source: dataSource });
      index = await connector.getWindingTreeIndex('fullIndex');
    });

    describe('createInstance', () => {
      it('should create basic data structure if source is empty', async () => {
        connector = JsonConnector.createInstance();
        index = await connector.getWindingTreeIndex('random-address');
        assert.isDefined(index.dataProvider);
        assert.isDefined(index.dataProvider.source.index);
        assert.isDefined(index.dataProvider.source.index.hotels);
      });

      it('should create basic data structure if hotels are empty', async () => {
        connector = JsonConnector.createInstance({ source: { index: {} } });
        index = await connector.getWindingTreeIndex('random-address');
        assert.isDefined(index.dataProvider);
        assert.isDefined(index.dataProvider.source.index);
        assert.isDefined(index.dataProvider.source.index.hotels);
      });
    });

    describe('addHotel', () => {
      it('should add hotel', async () => {
        const hotel = await index.addHotel({ name: 'a', description: 'b' });
        assert.isDefined(hotel);
        assert.equal(await hotel.name, 'a');
        assert.equal(await hotel.description, 'b');
        assert.isDefined(index.dataProvider.source.index.hotels);
        assert.isDefined(index.dataProvider.source.index.hotels[await hotel.address]);
      });
    });

    describe('getHotel', () => {
      it('should get hotel', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const hotel = await index.getHotel(address);
        assert.isDefined(hotel);
        assert.isDefined(index.dataProvider.source.index.hotels);
        assert.equal(await hotel.address, address);
        assert.equal(await hotel.name, index.dataProvider.source.index.hotels[address].name);
        assert.equal(await hotel.description, index.dataProvider.source.index.hotels[address].description);
        assert.equal(await hotel.manager, index.dataProvider.source.index.hotels[address].manager);
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
        const hotel = await index.addHotel({ name: 'Third one', description: '3' });
        assert.isDefined(await hotel.name, 'Third one');
        assert.isDefined(index.dataProvider.source.index.hotels);
        assert.isDefined(index.dataProvider.source.index.hotels[await hotel.address]);
        const hotel2 = await index.getHotel(await hotel.address);
        assert.isDefined(hotel2);
        assert.equal(await hotel2.address, await hotel.address);
        assert.equal(await hotel2.name, await hotel.name);
        assert.equal(await hotel2.description, await hotel.description);
        assert.equal(await hotel2.manager, await hotel.manager);
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
        assert.equal(hotels.length, Object.keys(index.dataProvider.source.index.hotels).length);
      });

      it('should get empty list if no hotels were added', async () => {
        connector = JsonConnector.createInstance();
        index = await connector.getWindingTreeIndex('random-address');
        const hotels = await index.getAllHotels();
        assert.isDefined(hotels);
        assert.equal(hotels.length, 0);
      });
    });
  });
});

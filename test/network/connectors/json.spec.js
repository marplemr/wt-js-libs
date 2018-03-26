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

      it('should initialize async data accessors', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const myDataSource = getFreshDataSource();
        assert.isUndefined(myDataSource.fullIndex.index.hotels[address].getAddress);
        const myConnector = JsonConnector.createInstance({ source: myDataSource });
        const myIndex = await myConnector.getWindingTreeIndex('fullIndex');
        assert.isDefined(myIndex.dataProvider);
        assert.isDefined(myIndex.dataProvider.source.index);
        assert.isDefined(myIndex.dataProvider.source.index.hotels[address].getAddress);
      });

      it('should not initialize async data accessors if they are already there', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const myDataSource = getFreshDataSource();
        const enhancedHotel = Object.assign(myDataSource.fullIndex.index.hotels[address], {
          getAddress: async () => myDataSource.fullIndex.index.hotels[address].address,
          getName: async () => myDataSource.fullIndex.index.hotels[address].name,
          getDescription: async () => myDataSource.fullIndex.index.hotels[address].description,
          getManager: async () => myDataSource.fullIndex.index.hotels[address].manager,
        });
        const myConnector = JsonConnector.createInstance({ source: myDataSource });
        const myIndex = await myConnector.getWindingTreeIndex('fullIndex');
        assert.isDefined(myIndex.dataProvider);
        assert.isDefined(myIndex.dataProvider.source.index);
        assert.equal(myIndex.dataProvider.source.index.hotels[address].getAddress, enhancedHotel.getAddress);
      });
    });

    describe('addHotel', () => {
      it('should add hotel', async () => {
        const hotel = await index.addHotel({ name: 'a', description: 'b' });
        assert.isDefined(hotel);
        assert.equal(await hotel.getName(), 'a');
        assert.equal(await hotel.getDescription(), 'b');
        assert.isDefined(index.dataProvider.source.index.hotels);
        assert.isDefined(index.dataProvider.source.index.hotels[await hotel.getAddress()]);
      });
    });

    describe('getHotel', () => {
      it('should get hotel', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const hotel = await index.getHotel(address);
        assert.isDefined(hotel);
        assert.isDefined(index.dataProvider.source.index.hotels);
        assert.equal(await hotel.getAddress(), address);
        assert.equal(await hotel.getName(), index.dataProvider.source.index.hotels[address].name);
        assert.equal(await hotel.getDescription(), index.dataProvider.source.index.hotels[address].description);
        assert.equal(await hotel.getManager(), index.dataProvider.source.index.hotels[address].manager);
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
        assert.isDefined(await hotel.getName(), 'Third one');
        assert.isDefined(index.dataProvider.source.index.hotels);
        assert.isDefined(index.dataProvider.source.index.hotels[await hotel.getAddress()]);
        const hotel2 = await index.getHotel(await hotel.getAddress());
        assert.isDefined(hotel2);
        assert.equal(await hotel2.getAddress(), await hotel.getAddress());
        assert.equal(await hotel2.getName(), await hotel.getName());
        assert.equal(await hotel2.getDescription(), await hotel.getDescription());
        assert.equal(await hotel2.getManager(), await hotel.getManager());
      });
    });

    describe('removeHotel', () => {
      it('should throw on a non-existent hotel', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const fakeAddress = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
        try {
          const hotel = _.cloneDeep(await index.getHotel(address));
          hotel.getAddress = async () => fakeAddress;
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
          hotel.getManager = async () => manager;
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
          hotel.getAddress = async () => null;
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

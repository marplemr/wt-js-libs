import { assert } from 'chai';
import WTLibs from '../src/index';
import testedDataModel from './utils/data-model-definition';

describe('WTLibs usage', () => {
  let libs, index, emptyIndex, minedTxHashes = [];

  beforeEach(async () => {
    libs = WTLibs.createInstance(testedDataModel.withDataSource());
    index = await libs.getWTIndex(testedDataModel.indexAddress);
    emptyIndex = await libs.getWTIndex(testedDataModel.emptyIndexAddress);
  });

  describe('addHotel', () => {
    it('should add hotel', async () => {
      const result = await index.addHotel({
        name: 'new hotel',
        description: 'some description',
        manager: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
        location: {
          latitude: 50.0754789,
          longitude: 14.4225864,
        },
      });
      assert.isDefined(result);
      assert.isDefined(result.address);
      assert.isDefined(result.transactionIds);
      // prepare getTransactionsStatus test
      minedTxHashes.push(result.transactionIds[0]);
      const txResults = await libs.getTransactionsStatus(result.transactionIds);
      assert.equal(txResults.meta.allPassed, true);

      // We should then get the hotel at the resulting address
      const hotel = await index.getHotel(result.address);
      assert.equal(await hotel.name, 'new hotel');
      assert.equal(await hotel.description, 'some description');
      assert.deepEqual(await hotel.location, { latitude: 50.0754789, longitude: 14.4225864 });
      // Don't bother with checksummed address format
      assert.equal((await hotel.manager).toLowerCase(), '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906');

      // We're removing the hotel to ensure clean slate after this test is run.
      // It is too expensive to re-set on-chain WTIndex after each test.
      const removalResult = await index.removeHotel(hotel);
      const removelTxResults = await libs.getTransactionsStatus(removalResult);
      assert.equal(removelTxResults.meta.allPassed, true);
    });

    it('should throw when hotel does not have a manager', async () => {
      try {
        await index.addHotel({
          name: 'new hotel',
          description: 'some description',
        });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot add hotel/i);
      }
    });
  });

  describe('removeHotel', () => {
    it('should remove hotel', async () => {
      const manager = '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906';
      const result = await index.addHotel({
        name: 'another hotel',
        description: 'some desc',
        manager: manager,
      });
      assert.isDefined(result.address);
      let list = (await index.getAllHotels());
      assert.equal(list.length, 3);
      assert.include(await Promise.all(list.map(async (a) => a.address)), result.address);
      const hotel = await index.getHotel(result.address);
      const removalResult = await index.removeHotel(hotel);
      assert.isDefined(removalResult);
      // prepare getTransactionsStatus test
      minedTxHashes.push(...removalResult);
      list = await index.getAllHotels();
      assert.equal(list.length, 2);
      assert.notInclude(list.map(async (a) => a.address), await hotel.address);
    });

    it('should throw if no hotel is found on given address', async () => {
      try {
        await index.removeHotel('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot remove hotel/i);
      }
    });
  });

  describe('getHotel', () => {
    it('should get hotel', async () => {
      const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
      const hotel = await index.getHotel(address);
      assert.isNotNull(hotel);
      assert.equal(await hotel.name, 'First hotel');
      assert.equal(await hotel.address, address);
    });

    it('should throw if no hotel is found on given address', async () => {
      try {
        await index.getHotel('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot find hotel/i);
      }
    });
  });

  describe('updateHotel', () => {
    const hotelAddress = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';

    it('should update hotel', async () => {
      const newName = 'Great new hotel name';
      const newDescription = 'Great new hotel description';
      const newUrl = 'another-url';
      const hotel = await index.getHotel(hotelAddress);
      const oldName = await hotel.name;
      const oldDescription = await hotel.description;
      const oldUrl = await hotel.url;
      hotel.url = newUrl;
      hotel.name = newName;
      hotel.description = newDescription;
      const updateResult = await index.updateHotel(hotel);
      assert.isDefined(updateResult);
      const hotel2 = await index.getHotel(hotelAddress);
      assert.equal(await hotel2.name, newName);
      assert.equal(await hotel2.description, newDescription);
      assert.equal(await hotel2.url, newUrl);
      // Change it back to keep data in line
      hotel.name = oldName;
      hotel.description = oldDescription;
      hotel.url = oldUrl;
      const updateResult2 = await index.updateHotel(hotel);
      assert.isDefined(updateResult2);
      const hotel3 = await index.getHotel(hotelAddress);
      assert.equal(await hotel3.name, oldName);
      assert.equal(await hotel3.url, oldUrl);
      assert.equal(await hotel3.description, oldDescription);
    });

    it('should throw if hotel has no address', async () => {
      try {
        const newName = 'Great new hotel name';
        const hotel = await index.getHotel(hotelAddress);
        hotel.address = undefined;
        hotel.name = newName;
        await index.updateHotel(hotel);
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot update hotel/i);
      }
    });

    it('should throw if hotel does not exist on network', async () => {
      try {
        const hotel = {
          address: '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826',
          name: 'Great new hotel name',
        };
        await index.updateHotel(hotel);
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot update hotel/i);
      }
    });
  });

  describe('getAllHotels', () => {
    it('should get all hotels', async () => {
      const hotels = await index.getAllHotels();
      assert.equal(hotels.length, 2);
    });

    it('should get empty list if no hotels are set', async () => {
      const hotels = await emptyIndex.getAllHotels();
      assert.equal(hotels.length, 0);
    });
  });

  describe('getTransactionsStatus', () => {
    // This unfortunately depends on other tests - to
    // make this isolated, we would have to run some transactions
    // beforehand
    it('should return transaction status', async () => {
      let result = await libs.getTransactionsStatus(minedTxHashes);
      assert.isDefined(result.meta);
      assert.equal(result.meta.total, minedTxHashes.length);
      assert.equal(result.meta.processed, minedTxHashes.length);
      assert.equal(result.meta.allPassed, true);
      for (let hash of minedTxHashes) {
        assert.isDefined(result.results[hash]);
      }
    });

    it('should return nothing if transactions do not exist', async () => {
      let result = await libs.getTransactionsStatus(['random-tx', 'another-random-tx']);
      assert.isDefined(result.meta);
      assert.equal(result.meta.total, 2);
      assert.equal(result.meta.processed, 0);
      assert.equal(result.meta.allPassed, false);
      assert.deepEqual(result.results, {});
    });
  });
});

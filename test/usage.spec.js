import { assert } from 'chai';
import WTLibs from '../src/index';
import testedNetwork from './utils/network-definition';

describe('WTLibs usage', () => {
  let libs, index, emptyIndex;

  beforeEach(async () => {
    libs = WTLibs.createInstance(testedNetwork.withDataSource());
    index = await libs.getWTIndex(testedNetwork.indexAddress);
    emptyIndex = await libs.getWTIndex(testedNetwork.emptyIndexAddress);
  });

  describe('addHotel', () => {
    it('should add hotel', async () => {
      const hotel = await index.addHotel({
        name: 'new hotel',
        description: 'some description',
        manager: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
        // TODO test location adding as well
      });
      assert.isDefined(hotel);
      assert.equal(await hotel.name, 'new hotel');
      assert.equal(await hotel.description, 'some description');
      assert.equal(await hotel.manager, '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906');
      // We're removing the hotel to ensure clean slate after this test is run.
      // It is too expensive to re-set on-chain WTIndex after each test.
      const result = await index.removeHotel(hotel);
      assert.equal(result, true);
    });

    it('should throw when adding hotel without name', async () => {
      try {
        await index.addHotel({
          description: 'some description',
          manager: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
        });
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /cannot add hotel/i);
      }
    });

    it('should throw when adding hotel without description', async () => {
      try {
        await index.addHotel({
          name: 'some hotel',
          manager: '0xd39ca7d186a37bb6bf48ae8abfeb4c687dc8f906',
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
      const hotel = await index.addHotel({
        name: 'another hotel',
        description: 'some desc',
        manager: manager,
      });
      assert.isDefined(await hotel.address);
      let list = (await index.getAllHotels());
      assert.equal(list.length, 3);
      assert.include(await Promise.all(list.map(async (a) => a.address)), await hotel.address);

      const result = await index.removeHotel(hotel);
      assert.equal(result, true);
      list = await index.getAllHotels();
      assert.equal(list.length, 2);
      assert.notInclude(list.map(async (a) => a.address), await hotel.address);
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
      const hotel = await index.getHotel(hotelAddress);
      const oldName = await hotel.name;
      const oldDescription = await hotel.description;
      hotel.name = newName;
      hotel.description = newDescription;
      const updatedHotel = await index.updateHotel(hotel);
      assert.equal(await updatedHotel.name, newName);
      // Change it back to keep data in line
      hotel.name = oldName;
      hotel.description = oldDescription;
      const updatedHotel2 = await index.updateHotel(hotel);
      assert.equal(await updatedHotel2.name, oldName);
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
        const newName = 'Great new hotel name';
        const hotel = await index.getHotel(hotelAddress);
        hotel.address = '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA';
        hotel.name = newName;
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
});

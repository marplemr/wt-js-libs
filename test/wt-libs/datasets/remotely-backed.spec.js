import { assert } from 'chai';
import RemotelyBacked from '../../../src/dataset/remotely-backed';

describe('WTLibs.dataset.RemotelyBacked', () => {
  let bbbInstance;
  beforeEach(() => {
    bbbInstance = new RemotelyBacked();
    bbbInstance.address = 'aaaa';
    bbbInstance.bindProperties({
      fields: {
        randomField: {
          remoteGetter: async () => {
            return 'field name';
          },
          remoteSetter: async () => {
            // pass
          },
        },
      },
    }, bbbInstance);
  });
  describe('obsolete state', () => {
    it('should not allow getting when object is in obsolete state', async () => {
      try {
        bbbInstance.markObsolete();
        assert.equal(await bbbInstance.randomField, 'field name');
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /object was destroyed/i);
      }
    });

    it('should not allow setting when object is in obsolete state', () => {
      bbbInstance.markObsolete();
      try {
        bbbInstance.randomField = 'something';
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /object was destroyed/i);
      }
    });
  });

  // TODO change
  xit('should not mark object dirty if data does not change', async () => {
    /*const hotelProvider = HotelDataProvider.createInstance(dataModel.commonWeb3Utils, dataModel.commonWeb3Contracts, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
    assert.equal(hotelProvider.__fieldStates.name, 'unsynced');
    const currentName = await hotelProvider.name;
    assert.equal(hotelProvider.__fieldStates.name, 'synced');
    hotelProvider.name = currentName;
    assert.equal(hotelProvider.__fieldStates.name, 'synced');
    hotelProvider.name = 'Changed name';
    assert.equal(hotelProvider.__fieldStates.name, 'dirty');*/
  });

  // TODO more tests de-doubling of setters
  // TODO more tests on proper properties binding
});

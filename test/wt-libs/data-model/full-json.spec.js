import _ from 'lodash';
import sinon from 'sinon';
import { assert } from 'chai';
import FullJsonDataModel from '../../../src/data-model/full-json';
import dataSource from '../../utils/data/network.json';
import jsonWallet from '../../utils/test-wallet';

// cloneDeep to ensure data isolation
function getFreshDataSource () {
  return _.cloneDeep(dataSource);
}

describe('WTLibs.data-model.full-json', () => {
  let wallet;
  beforeEach(function () {
    if (process.env.TESTED_DATA_MODEL !== 'full-json') {
      this.skip();
    }
    wallet = {};
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
      assert.isDefined(dataModel.source.fullIndex.hotels);
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
      it('should create basic data structure if hotels are empty', async () => {
        dataModel = FullJsonDataModel.createInstance({ source: { index: {} } });
        index = await dataModel.getWindingTreeIndex('random-address');
        assert.isDefined(index.source.hotels);
      });
    });

    describe('addHotel', () => {
      it('should add hotel', async () => {
        const result = await index.addHotel(wallet, { url: 'a', manager: 'Donald' });
        const hotel = await index.getHotel(result.address);
        assert.isDefined(hotel);
        assert.equal(await hotel.url, 'a');
        assert.isDefined(index.source.hotels);
        assert.isDefined(index.source.hotels[await hotel.address]);
      });
    });

    describe('getHotel', () => {
      it('should get hotel', async () => {
        const address = '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769';
        const hotel = await index.getHotel(address);
        assert.isDefined(hotel);
        assert.isDefined(index.source.hotels);
        assert.equal(await hotel.address, address);
        assert.equal(await hotel.url, index.source.hotels[address].url);
        assert.equal(await hotel.manager, index.source.hotels[address].manager);
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
        const result = await index.addHotel(wallet, { url: 'Third one', manager: 'Donald' });
        assert.isDefined(index.source.hotels);
        assert.isDefined(index.source.hotels[result.address]);
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
          await index.removeHotel(wallet, hotel);
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
          await index.removeHotel(wallet, hotel);
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
          await index.removeHotel(wallet, hotel);
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
        assert.equal(hotels.length, Object.keys(index.source.hotels).length);
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

  describe('Wallet', () => {
    let dataModel, wallet, dataSource;

    beforeEach(async () => {
      dataSource = getFreshDataSource();
      dataModel = FullJsonDataModel.createInstance({ source: dataSource });
      wallet = await dataModel.createWallet(jsonWallet);
    });

    it('should create a wallet', () => {
      assert.isDefined(wallet);
      assert.isDefined(wallet.unlock);
      assert.isDefined(wallet.signAndSendTransaction);
    });

    it('should always return the same tx hash', async () => {
      assert.equal(await wallet.signAndSendTransaction({}), 'tx-hash-signed-by-fake-wallet');
      assert.equal(await wallet.signAndSendTransaction({ from: 'random', to: 'random' }), 'tx-hash-signed-by-fake-wallet');
      assert.equal(await wallet.signAndSendTransaction({ from: 'random', to: 'random' }, sinon.stub().returns('onReceipt')), 'tx-hash-signed-by-fake-wallet');
    });

    it('should call the onReceipt callback', async () => {
      let callback = sinon.stub().returns('onReceipt');
      assert.equal(await wallet.signAndSendTransaction({ from: 'random', to: 'random' }, callback), 'tx-hash-signed-by-fake-wallet');
      assert.equal(callback.callCount, 1);
      assert.equal(callback.firstCall.args[0].transactionHash, 'tx-hash-signed-by-fake-wallet');
    });

    it('should keep the associated address', () => {
      assert.equal(wallet.getAddress().toLowerCase(), '0x' + jsonWallet.address);
    });
  });
});

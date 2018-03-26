import { assert } from 'chai';
import sinon from 'sinon';
import WTIndexDataProvider from '../../../../src/network/connectors/web3/data-providers/wt-index';
import HotelDataProvider from '../../../../src/network/connectors/web3/data-providers/hotel';
import Web3Connector from '../../../../src/network/connectors/web3';
import testedNetwork from '../../../utils/network-definition';
import Contracts from '../../../../src/network/connectors/web3/contracts';

describe('WTLibs.network.connectors.web3.data-providers', () => {
  let connector, indexDataProvider;

  beforeEach(async function () {
    if (process.env.TESTED_NETWORK !== 'web3') {
      this.skip();
    }
    connector = Web3Connector.createInstance(testedNetwork.withDataSource().networkOptions);
    indexDataProvider = await WTIndexDataProvider.createInstance(testedNetwork.indexAddress, connector);
  });

  describe('WTIndexDataProvider', () => {
    it('should throw when we want index from a bad address', async () => {
      const customIndexDataProvider = await WTIndexDataProvider.createInstance('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA', connector);
      try {
        await customIndexDataProvider._getDeployedIndex();
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
        const myIndexDataProvider = await WTIndexDataProvider.createInstance('some-other-address', connector);
        try {
          await myIndexDataProvider.addHotel({ name: 'a', description: 'b' });
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot add hotel/i);
        }
      });
    });
  });

  describe('Hotel', () => {
    describe('_getDeployedHotel', () => {
      let getHotelContractSpy;
      beforeEach(function () {
        if (process.env.TESTED_NETWORK !== 'web3') {
          this.skip();
        }
        getHotelContractSpy = sinon.spy(Contracts, 'getHotelInstance');
      });

      afterEach(() => {
        Contracts.getHotelInstance.restore();
      });

      it('should throw when we want hotel from a bad address', async () => {
        try {
          const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex(), '0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA');
          await hotelProvider._getDeployedHotel();
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot get hotel instance/i);
        }
      });

      it('should throw when we want hotel without an address', async () => {
        try {
          const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex());
          await hotelProvider._getDeployedHotel();
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot get hotel instance/i);
        }
      });

      it('should throw if we try to get data from network in a hotel without address', async () => {
        try {
          const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex());
          await hotelProvider._loadFromNetwork();
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /cannot call hotel/i);
        }
      });

      it('should cache contract instances', async () => {
        const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex(), '0x4a763f50dfe5cf4468b4171539e021a26fcee0cc');
        assert.equal(getHotelContractSpy.callCount, 0);
        await hotelProvider._getDeployedHotel();
        assert.equal(getHotelContractSpy.callCount, 1);
        await hotelProvider._getDeployedHotel();
        assert.equal(getHotelContractSpy.callCount, 1);
      });
    });

    describe('data getters', () => {
      it('should fetch data from network only after the getter is accessed', async () => {
        const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
        sinon.spy(hotelProvider, '_loadFromNetwork');
        assert.equal(hotelProvider._loadFromNetwork.callCount, 0);
        assert.equal(await hotelProvider.getName(), 'First hotel');
        assert.equal(hotelProvider._loadFromNetwork.callCount, 1);
        assert.equal(await hotelProvider.getManager(), '0x87265a62c60247f862b9149423061b36b460f4bb');
        assert.equal(hotelProvider._loadFromNetwork.callCount, 1);
      });
    });

    describe('data setters', () => {
      it('should not mark object dirty if data does not change', async () => {
        const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
        assert.equal(hotelProvider.state, 'fresh');
        const currentName = await hotelProvider.getName();
        assert.equal(hotelProvider.state, 'synced');
        hotelProvider.name = currentName;
        assert.equal(hotelProvider.state, 'synced');
        hotelProvider.name = 'Changed name';
        assert.equal(hotelProvider.state, 'dirty');
      });
    });

    describe('write to network', () => {
      // it should not update when data is not changed
      it('should update', async () => {
        const hotelProvider = HotelDataProvider.createInstance(connector, await indexDataProvider._getDeployedIndex(), '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
        
        // TODO loadFromNetwork should happen automatically before write back to network, not by getName
        const oldName = await hotelProvider.getName();
        const newName = 'Random changed name';
        hotelProvider.name = newName;
        await hotelProvider.updateOnNetwork({
          from: await hotelProvider.getManager(),
          to: indexDataProvider.address,
        });
        assert.equal(await hotelProvider.getName(), newName);
        // Force reload from network
        await hotelProvider._loadFromNetwork();
        assert.equal(await hotelProvider.getName(), newName);

        // And change this back to keep data consistent for other tests
        hotelProvider.name = oldName;
        await hotelProvider.updateOnNetwork({
          from: await hotelProvider.getManager(),
          to: indexDataProvider.address,
        });
        assert.equal(await hotelProvider.getName(), oldName);
        // Force reload from network
        await hotelProvider._loadFromNetwork();
        assert.equal(await hotelProvider.getName(), oldName);
      });
    });
  });
});

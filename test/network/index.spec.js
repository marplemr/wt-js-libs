import { assert } from 'chai';
import sinon from 'sinon';
import Network from '../../src/network';
import testedNetwork from '../utils/network-definition';

describe('WTLibs.network', () => {
  describe('createInstance', () => {
    it('should set type and options', () => {
      const network = Network.createInstance(testedNetwork.type, { some: 'configoption' });
      assert.equal(network.type, testedNetwork.type);
      assert.equal(network.options.some, 'configoption');
    });

    it('should throw on unknown type', () => {
      try {
        Network.createInstance('random', {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /unrecognized network type/i);
      }
    });
  });

  describe('getConnector', () => {
    let createInstanceSpy;

    beforeEach(() => {
      createInstanceSpy = sinon.spy(testedNetwork.connector, 'createInstance');
    });

    afterEach(() => {
      createInstanceSpy.restore();
    });

    it('should create connector', () => {
      const network = Network.createInstance(testedNetwork.type, testedNetwork.emptyConfig);
      const connector = network.getConnector();
      assert.isDefined(connector);
      assert.typeOf(connector, 'object');
      assert.equal(createInstanceSpy.callCount, 1);
    });

    it('should re-use existing connector instance', () => {
      const network = Network.createInstance(testedNetwork.type, testedNetwork.emptyConfig);
      const connector = network.getConnector();
      assert.equal(createInstanceSpy.callCount, 1);
      const connector2 = network.getConnector();
      assert.isDefined(connector2);
      assert.typeOf(connector2, 'object');
      assert.equal(createInstanceSpy.callCount, 1);
      assert.equal(connector, connector2);
    });
  });

  describe('getWindingTreeIndex', () => {
    it('should ask current connector for a WTIndex instance', () => {
      const wtIndexSpy = sinon.spy(testedNetwork.connector.prototype, 'getWindingTreeIndex');
      let network = Network.createInstance(testedNetwork.type, testedNetwork.emptyConfig);
      let index = network.getWindingTreeIndex('random-address');
      assert.isDefined(index);
      assert.equal(wtIndexSpy.callCount, 1);
    });
  });
});

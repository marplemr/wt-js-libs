import { assert } from 'chai';
import sinon from 'sinon';
import WTLibs from '../src/index';
import Network from '../src/network';
import testedNetwork from './utils/network-definition';

describe('WTLibs', () => {
  describe('createInstance', () => {
    let createNetworkSpy;

    beforeEach(() => {
      createNetworkSpy = sinon.spy(Network, 'createInstance');
    });

    afterEach(() => {
      createNetworkSpy.restore();
    });

    it('should initialize network', () => {
      const libs = WTLibs.createInstance({ networkConnectorType: testedNetwork.type });
      assert.isDefined(libs.network);
      assert.equal(createNetworkSpy.callCount, 1);
      assert.equal(createNetworkSpy.firstCall.args[0], testedNetwork.type);
    });

    it('should pass network options', () => {
      const libs = WTLibs.createInstance({
        networkOptions: {
          random: {},
        },
      });
      assert.isDefined(libs.network);
      assert.isDefined(createNetworkSpy.firstCall.args[1].random);
    });

    it('should fallback to web3 network if networkConnectorType is not specified', () => {
      const libs = WTLibs.createInstance();
      assert.isDefined(libs.network);
      assert.equal(createNetworkSpy.callCount, 1);
      assert.equal(createNetworkSpy.firstCall.args[0], 'web3');
    });
  });
});

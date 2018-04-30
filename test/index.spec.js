import { assert } from 'chai';
import sinon from 'sinon';
import WTLibs from '../src/index';
import DataModel from '../src/data-model';
import testedNetwork from './utils/data-model-definition';

describe('WTLibs', () => {
  describe('createInstance', () => {
    let createDataModelSpy;

    beforeEach(() => {
      createDataModelSpy = sinon.spy(DataModel, 'createInstance');
    });

    afterEach(() => {
      createDataModelSpy.restore();
    });

    it('should initialize data model', () => {
      const libs = WTLibs.createInstance({ dataModelType: testedNetwork.type });
      assert.isDefined(libs.dataModel);
      assert.equal(createDataModelSpy.callCount, 1);
      assert.equal(createDataModelSpy.firstCall.args[0], testedNetwork.type);
    });

    it('should pass data model options', () => {
      const libs = WTLibs.createInstance({
        dataModelOptions: {
          random: {},
        },
      });
      assert.isDefined(libs.dataModel);
      assert.isDefined(createDataModelSpy.firstCall.args[1].random);
    });

    it('should fallback to web3-swarm data model if dataModelType is not specified', () => {
      const libs = WTLibs.createInstance();
      assert.isDefined(libs.dataModel);
      assert.equal(createDataModelSpy.callCount, 1);
      assert.equal(createDataModelSpy.firstCall.args[0], 'web3-swarm');
    });
  });
});

import { assert } from 'chai';
import sinon from 'sinon';
import DataModel from '../../src/data-model';
import testedDataModel from '../utils/data-model-definition';

describe('WTLibs.dataModel', () => {
  describe('createInstance', () => {
    it('should set type and options', () => {
      const dataModel = DataModel.createInstance(testedDataModel.type, { some: 'configoption' });
      assert.equal(dataModel.type, testedDataModel.type);
      assert.equal(dataModel.options.some, 'configoption');
    });

    it('should throw on unknown type', () => {
      try {
        DataModel.createInstance('random', {});
        throw new Error('should not have been called');
      } catch (e) {
        assert.match(e.message, /is not recognized as a valid data model type/i);
      }
    });
  });

  describe('getDataModelAccessor', () => {
    let createInstanceSpy;

    beforeEach(() => {
      createInstanceSpy = sinon.spy(testedDataModel.dataModelAccessor, 'createInstance');
    });

    afterEach(() => {
      createInstanceSpy.restore();
    });

    it('should create dataModelAccessor', () => {
      const dataModel = DataModel.createInstance(testedDataModel.type, testedDataModel.emptyConfig);
      const dataModelAccessor = dataModel.getDataModelAccessor();
      assert.isDefined(dataModelAccessor);
      assert.typeOf(dataModelAccessor, 'object');
      assert.equal(createInstanceSpy.callCount, 1);
    });

    it('should re-use existing dataModelAccessor instance', () => {
      const dataModel = DataModel.createInstance(testedDataModel.type, testedDataModel.emptyConfig);
      const dataModelAccessor = dataModel.getDataModelAccessor();
      assert.equal(createInstanceSpy.callCount, 1);
      const dataModelAccessor2 = dataModel.getDataModelAccessor();
      assert.isDefined(dataModelAccessor2);
      assert.typeOf(dataModelAccessor2, 'object');
      assert.equal(createInstanceSpy.callCount, 1);
      assert.equal(dataModelAccessor, dataModelAccessor2);
    });

    it('should throw when dataModelAccessor type is not supported', () => {
      try {
        DataModel.createInstance('random-type', {});
      } catch (e) {
        assert.match(e.message, /is not recognized as a valid/i);
      }
    });

    it('should throw when dataModelAccessor type is not yet implemented', () => {
      try {
        const dataModel = DataModel.createInstance('web3-ipfs', {});
        dataModel.getDataModelAccessor();
      } catch (e) {
        assert.match(e.message, /data model is not yet implemented/i);
      }
    });
  });

  describe('getWindingTreeIndex', () => {
    it('should ask current dataModelAccessor for a WTIndex instance', () => {
      const wtIndexSpy = sinon.spy(testedDataModel.dataModelAccessor.prototype, 'getWindingTreeIndex');
      let dataModel = DataModel.createInstance(testedDataModel.type, testedDataModel.emptyConfig);
      let index = dataModel.getWindingTreeIndex('random-address');
      assert.isDefined(index);
      assert.equal(wtIndexSpy.callCount, 1);
    });
  });
});

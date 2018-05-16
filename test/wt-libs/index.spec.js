import { assert } from 'chai';
import sinon from 'sinon';
import DataModel from '../../src/data-model';
import testedDataModel from '../utils/data-model-definition';

describe('WTLibs.dataModel', () => {
  describe('createInstance', () => {
    it('should set type and options', () => {
      const dataModel = DataModel.createInstance({ some: 'configoption' });
      assert.equal(dataModel.options.some, 'configoption');
    });
  });

  describe('__getDataModelAccessor', () => {
    let createInstanceSpy;

    beforeEach(() => {
      createInstanceSpy = sinon.spy(testedDataModel.dataModelAccessor, 'createInstance');
    });

    afterEach(() => {
      createInstanceSpy.restore();
    });

    it('should create dataModelAccessor', () => {
      const dataModel = DataModel.createInstance(testedDataModel.emptyConfig);
      const dataModelAccessor = dataModel.__getDataModelAccessor();
      assert.isDefined(dataModelAccessor);
      assert.typeOf(dataModelAccessor, 'object');
      assert.equal(createInstanceSpy.callCount, 1);
    });

    it('should re-use existing dataModelAccessor instance', () => {
      const dataModel = DataModel.createInstance(testedDataModel.emptyConfig);
      const dataModelAccessor = dataModel.__getDataModelAccessor();
      assert.equal(createInstanceSpy.callCount, 1);
      const dataModelAccessor2 = dataModel.__getDataModelAccessor();
      assert.isDefined(dataModelAccessor2);
      assert.typeOf(dataModelAccessor2, 'object');
      assert.equal(createInstanceSpy.callCount, 1);
      assert.equal(dataModelAccessor, dataModelAccessor2);
    });
  });

  describe('getWindingTreeIndex', () => {
    it('should ask current dataModelAccessor for a WTIndex instance', () => {
      const wtIndexSpy = sinon.spy(testedDataModel.dataModelAccessor.prototype, 'getWindingTreeIndex');
      let dataModel = DataModel.createInstance(testedDataModel.emptyConfig);
      let index = dataModel.getWindingTreeIndex('random-address');
      assert.isDefined(index);
      assert.equal(wtIndexSpy.callCount, 1);
    });
  });
});

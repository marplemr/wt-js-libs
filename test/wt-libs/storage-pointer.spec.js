import { assert } from 'chai';
import sinon from 'sinon';
import StoragePointer from '../../src/storage-pointer';
import OffChainDataClient from '../../src/off-chain-data-client';

describe('WTLibs.StoragePointer', () => {
  it('should normalize fields option', () => {
    const pointer = StoragePointer.createInstance('json://url', ['some', 'fields', { name: 'field' }]);
    assert.equal(pointer.__fields.length, 3);
    assert.isDefined(pointer.__fields[0].name);
    assert.isDefined(pointer.__fields[1].name);
    assert.isDefined(pointer.__fields[2].name);
    assert.equal(pointer.__fields[0].name, 'some');
    assert.equal(pointer.__fields[1].name, 'fields');
    assert.equal(pointer.__fields[2].name, 'field');
  });

  it('should not panic on empty fields list', () => {
    try {
      StoragePointer.createInstance('json://url');
    } catch (e) {
      throw new Error(`should have never been called ${e.message}`);
    }
  });

  it('should throw on an empty url', () => {
    try {
      StoragePointer.createInstance('');
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /without url/i);
    }

    try {
      StoragePointer.createInstance();
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /without url/i);
    }
  });

  it('should properly set ref and contents', () => {
    const pointer = StoragePointer.createInstance('json://url', ['some', 'fields']);
    assert.equal(pointer.ref, 'json://url');
    assert.isDefined(pointer.contents);
  });

  it('should initialize data getters', () => {
    const pointer = StoragePointer.createInstance('json://url', ['some', 'fields']);
    assert.equal(pointer.ref, 'json://url');
    assert.isDefined(pointer.contents.some);
    assert.isDefined(pointer.contents.fields);
  });

  it('should not download the data immediately', async () => {
    const pointer = StoragePointer.createInstance('json://url', ['some', 'fields']);
    const dldSpy = sinon.spy(pointer, '_downloadFromStorage');
    assert.equal(dldSpy.callCount, 0);
    await pointer.contents.some;
    assert.equal(dldSpy.callCount, 1);
    await pointer.contents.fields;
    assert.equal(dldSpy.callCount, 1);
  });

  it('should properly instantiate OffChainDataAccessor', async () => {
    const pointer = StoragePointer.createInstance('json://url', ['some', 'fields']);
    assert.isUndefined(pointer.__accessor);
    await pointer.contents.some;
    assert.equal(pointer.__accessor.constructor.name, 'InMemoryAccessor');
  });

  it('should reuse OffChainDataAccessor instance', async () => {
    const getAccessorSpy = sinon.spy(OffChainDataClient, 'getAccessor');
    const pointer = StoragePointer.createInstance('json://url', ['some', 'fields']);
    assert.equal(getAccessorSpy.callCount, 0);
    await pointer.contents.some;
    assert.equal(getAccessorSpy.callCount, 1);
    await pointer._getOffChainDataClient();
    assert.equal(getAccessorSpy.callCount, 1);
  });

  it('should throw when an unsupported schema is encountered', async () => {
    try {
      const pointer = StoragePointer.createInstance('random://url', ['some', 'fields']);
      await pointer.contents.some;
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /unsupported data storage type/i);
    }
  });

  it('should recursively instantiate another StoragePointer', async () => {
    const pointer = StoragePointer.createInstance('json://url', [{
      name: 'sp',
      isStoragePointer: true,
      fields: ['some', 'fields'],
    }]);
    sinon.stub(pointer, '_getOffChainDataClient').resolves({
      download: sinon.stub().returns({
        'sp': 'json://point',
      }),
    });
    assert.equal(pointer.ref, 'json://url');
    const recursivePointer = await pointer.contents.sp;
    assert.equal(recursivePointer.constructor.name, 'StoragePointer');
    assert.equal(recursivePointer.ref, 'json://point');
    assert.isDefined(recursivePointer.contents.some);
    assert.isDefined(recursivePointer.contents.fields);
  });

  it('should not panic if recursive StoragePointer does not have fields defined', async () => {
    try {
      const pointer = StoragePointer.createInstance('json://url', [{
        name: 'sp',
        isStoragePointer: true,
      }]);
      sinon.stub(pointer, '_getOffChainDataClient').resolves({
        download: sinon.stub().returns({
          'sp': 'json://point',
        }),
      });
      assert.equal(pointer.ref, 'json://url');
      await pointer.contents.sp;
    } catch (e) {
      throw new Error('should have never been called');
    }
  });

  it('should throw if recursive StoragePointer cannot be set up due to null pointer value', async () => {
    try {
      const pointer = StoragePointer.createInstance('json://url', [{
        name: 'sp',
        isStoragePointer: true,
        fields: ['some', 'fields'],
      }]);
      await pointer.contents.sp;
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /which does not appear to be a valid reference/i);
    }
  });

  it('should throw if recursive StoragePointer cannot be set up due to a malformed pointer value', async () => {
    try {
      const pointer = StoragePointer.createInstance('json://url', [{
        name: 'sp',
        isStoragePointer: true,
        fields: ['some', 'fields'],
      }]);
      sinon.stub(pointer, '_getOffChainDataClient').resolves({
        download: sinon.stub().returns({
          'sp': { some: 'field' },
        }),
      });
      await pointer.contents.sp;
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /which does not appear to be a valid reference/i);
    }
  });

  it('should throw if recursive StoragePointer cannot be set up due to bad schema', async () => {
    try {
      const pointer = StoragePointer.createInstance('json://url', [{
        name: 'sp',
        isStoragePointer: true,
        fields: ['some', 'fields'],
      }]);
      sinon.stub(pointer, '_getOffChainDataClient').resolves({
        download: sinon.stub().returns({
          'sp': 'random://point',
        }),
      });
      assert.equal(pointer.ref, 'json://url');
      const childPointer = await pointer.contents.sp;
      await childPointer.contents.some;
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /unsupported data storage type/i);
    }
  });

  it('should throw if StoragePointer cannot be set up due to bad url format', async () => {
    try {
      const pointer = StoragePointer.createInstance('jsonxxurl', [{
        name: 'sp',
        isStoragePointer: true,
        fields: ['some', 'fields'],
      }]);
      await pointer.contents.sp;
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /unsupported data storage type/i);
    }
  });
});

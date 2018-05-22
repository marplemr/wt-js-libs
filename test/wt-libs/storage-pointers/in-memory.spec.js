import { assert } from 'chai';
import sinon from 'sinon';
import InMemoryAccessor, { Storage, storageInstance } from '../../../src/storage-pointers/in-memory';

describe('WTLibs.storage-pointers.InMemory', () => {
  describe('Storage', () => {
    it('should initialize empty storage', () => {
      const storage = new Storage();
      assert.isDefined(storage._storage);
    });

    it('should store data under some hash', () => {
      const storage = new Storage();
      const hash = storage.create({ random: 'data' });
      assert.isDefined(hash);
      const result = storage.get(hash);
      assert.equal(result.random, 'data');
    });

    it('should update data under a hash', () => {
      const storage = new Storage();
      const hash = storage.create({ random: 'data' });
      assert.isDefined(hash);
      const result = storage.get(hash);
      assert.equal(result.random, 'data');
      storage.update(hash, { updated: 'value' });
      const result2 = storage.get(hash);
      assert.equal(result2.updated, 'value');
      assert.isUndefined(result2.random);
    });
  });

  describe('Accessor', () => {
    it('should detect hash from url', () => {
      const accessor = new InMemoryAccessor('some://form-of-hash');
      assert.equal(accessor.hash, 'form-of-hash');
    });

    it('should throw when hash cannot be detected', () => {
      try {
        // This is here to make eslint happy
        const accessor = new InMemoryAccessor('bad-link-format-withform-of-hash');
        assert.isUndefined(accessor);
        throw new Error('should have never been called');
      } catch (e) {
        assert.match(e.message, /no schema detected/i);
      }
    });

    it('should access storageInstance for download', async () => {
      const getSpy = sinon.spy(storageInstance, 'get');
      const accessor = new InMemoryAccessor('some://form-of-hash');
      assert.equal(getSpy.callCount, 0);
      await accessor.download();
      assert.equal(getSpy.callCount, 1);
    });
  });
});

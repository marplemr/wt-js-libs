import { assert } from 'chai';
import sinon from 'sinon';
import InMemoryAccessor, { Storage, storageInstance } from '../../../src/off-chain-data-accessors/in-memory';

describe('WTLibs.off-chain-data-accessors.InMemory', () => {
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
    it('should detect hash from url', async () => {
      const getSpy = sinon.spy(storageInstance, 'get');
      const accessor = new InMemoryAccessor();
      await accessor.download('some://form-of-hash');
      assert.equal(getSpy.firstCall.args[0], 'form-of-hash');
      getSpy.restore();
    });

    it('should throw when hash cannot be detected', async () => {
      try {
        const accessor = new InMemoryAccessor();
        await accessor.download('bad-link-format-withform-of-hash');
        throw new Error('should have never been called');
      } catch (e) {
        assert.match(e.message, /no schema detected/i);
      }
    });

    it('should access storageInstance for download', async () => {
      const getSpy = sinon.spy(storageInstance, 'get');
      const accessor = new InMemoryAccessor();
      assert.equal(getSpy.callCount, 0);
      await accessor.download('some://form-of-hash');
      assert.equal(getSpy.callCount, 1);
      getSpy.restore();
    });
  });
});

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
    describe('download', () => {
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

      it('should use storageInstance for download', async () => {
        const getSpy = sinon.spy(storageInstance, 'get');
        const accessor = new InMemoryAccessor();
        assert.equal(getSpy.callCount, 0);
        await accessor.download('some://form-of-hash');
        assert.equal(getSpy.callCount, 1);
        getSpy.restore();
      });
    });

    describe('upload', () => {
      it('should store data', async () => {
        const createSpy = sinon.spy(storageInstance, 'create');
        const accessor = new InMemoryAccessor();
        await accessor.upload({ random: 'data' });
        assert.equal(createSpy.callCount, 1);
        createSpy.restore();
      });

      it('should return full url', async () => {
        const accessor = new InMemoryAccessor();
        const url = await accessor.upload({ random: 'data' });
        assert.isDefined(url);
        assert.equal(url.substring(0, 7), 'json://');
        const payload = storageInstance.get(url.substring(7));
        assert.isDefined(payload);
        assert.equal(payload.random, 'data');
      });
    });

    describe('update', () => {
      it('should change data', async () => {
        const updateSpy = sinon.spy(storageInstance, 'update');
        const accessor = new InMemoryAccessor();
        const url = await accessor.upload({ random: 'data' });
        const payload = storageInstance.get(url.substring(7));
        assert.equal(payload.random, 'data');
        await accessor.update(url, { something: 'else' });
        const payload2 = storageInstance.get(url.substring(7));
        assert.equal(payload2.something, 'else');
        assert.isUndefined(payload2.random);
        assert.equal(updateSpy.callCount, 1);
        updateSpy.restore();
      });
    });
  });
});

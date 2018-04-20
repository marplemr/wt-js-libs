import { assert } from 'chai';
import sinon from 'sinon';
import InMemoryBacked, { storageInstance } from '../../../src/dataset/in-memory-backed';

describe('WTLibs.dataset.InMemoryBacked', () => {
  let storageUpdateSpy;

  beforeEach(() => {
    storageUpdateSpy = sinon.spy(storageInstance, 'update');
  });

  afterEach(() => {
    storageInstance.update.restore();
  });

  it('should initialize a passed hash', () => {
    const hash = 'randomly-selected-hash-1';
    assert.isUndefined(storageInstance.get(hash));
    const imb = new InMemoryBacked(hash);
    assert.equal(imb.getHash(), hash);
    assert.isDefined(storageInstance.get(hash));
    assert.equal(storageUpdateSpy.callCount, 1);
  });

  it('should initialize a passed hash only once', () => {
    const hash = 'randomly-selected-hash-2';
    assert.isUndefined(storageInstance.get(hash));
    const imb = new InMemoryBacked(hash);
    assert.equal(imb.getHash(), hash);
    assert.isDefined(storageInstance.get(hash));
    assert.equal(storageUpdateSpy.callCount, 1);
    const imb2 = new InMemoryBacked(hash);
    assert.equal(imb2.getHash(), hash);
    assert.isDefined(storageInstance.get(hash));
    assert.equal(storageUpdateSpy.callCount, 1);
  });

  it('should initialize an empty hash', () => {
    const imbInstance = new InMemoryBacked();
    imbInstance.initialize();
    assert.isDefined(imbInstance.getHash());
  });

  it('should bind properties to a stored hash', async () => {
    const object = {};
    const imbInstance = new InMemoryBacked();
    imbInstance.initialize();
    imbInstance.bindProperties({
      fields: {
        one: {},
      },
    }, object);
    assert.isUndefined(await object.one);
    object.one = 'two';
    assert.equal(await object.one, 'two');
    const storedData = storageInstance.get(imbInstance.getHash());
    assert.isDefined(storedData);
    assert.equal(storedData.one, await object.one);
  });

  it('should be possible to set hash', () => {
    const imb = new InMemoryBacked();
    assert.isUndefined(imb.getHash());
    imb.setHash('super-secret-random');
    assert.equal(imb.getHash(), 'super-secret-random');
  });

  it('should be possible to change hash without data loss', async () => {
    const object = {};
    const imbInstance = new InMemoryBacked();
    imbInstance.initialize();
    imbInstance.bindProperties({
      fields: {
        one: {},
      },
    }, object);
    object.one = 'two';
    const originalHash = imbInstance.getHash();
    const storedData = storageInstance.get(originalHash);
    assert.equal(storedData.one, await object.one);
    imbInstance.changeHashTo('something-else');
    assert.equal(imbInstance.getHash(), 'something-else');
    assert.equal(storageInstance.get(imbInstance.getHash()).one, await object.one);
    assert.equal(storageInstance.get(originalHash).one, await object.one);
  });
});

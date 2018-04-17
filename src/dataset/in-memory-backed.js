import ethJsUtil from 'ethereumjs-util';

/**
 * Simple in-memory key value store that creates
 * its keys with ethereum based sha3 hash function.
 */
class InMemoryStorage {
  constructor () {
    this._storage = {};
  }

  /**
   * Private method that hashes arbitrary data with SHA-3.
   * Before hashing, data is JSON.stringified and a current
   * timestamp is prepended to prevent collisions.
   *
   * @param  {any} data to be hashed
   * @return {string} resulting sha3 hash
   */
  _computeHash (data) {
    return ethJsUtil.bufferToHex(ethJsUtil.sha3(Date.now() + ':' + JSON.stringify(data)));
  }

  /**
   * Adds new data to the in-memory storage.
   * @param  {any} data
   * @return {string} hash under which the data is stored
   */
  create (data) {
    const keyHash = this._computeHash(data);
    this._storage[keyHash] = data;
    return keyHash;
  }

  /**
   * Update data under certain key
   * @param  {string} hash under which to store new data
   * @param  {any} data
   */
  update (hash, data) {
    this._storage[hash] = data;
  }

  /**
   * Retrieve data from a certain hash
   * @param  {string} hash under which is the desired data
   * @return {any}
   */
  get (hash) {
    return this._storage[hash];
  }
}

/**
 * Single instance of InMemoryStorage that should be used
 * throughout the whole application.
 * @type {InMemoryStorage}
 */
export const storageInstance = new InMemoryStorage();

/**
 * Dataset configured to store/retrieve data with the
 * InMemoryStorage. Based on the configuration, it binds
 * certain properties to the original object with InMemoryStorage
 * based getters and setters. The whole dataset is stored under
 * on hash.
 *
 * This might be used to mock a distributed network storage.
 */
class InMemoryBacked {
  /**
   * Creates an InMemoryBacked instance.
   *
   * @param  {string} hash optional hash from InMemoryStorage where the data is located
   * @return {InMemoryBacked}      [description]
   */
  constructor (hash) {
    this.__fieldKeys = [];
    if (hash) {
      this.__hash = hash;
      if (!storageInstance.get(hash)) {
        storageInstance.update(hash, {});
      }
    }
  }

  /**
  * Enables changing the hash of the underlying data during runtime
  * @param {string} hash
  */
  setHash (hash) {
    this.__hash = hash;
  }

  /**
   * Return current hash
   * @return {string} hash
   */
  getHash () {
    return this.__hash;
  }

  /**
   * Copies the data to a different hash
   * while not destroying the original data. The
   * internal hash pointer is updated so the data
   * is served from the new location.
   *
   * @param  {string} newHash
   */
  changeHashTo (newHash) {
    const currentData = storageInstance.get(this.__hash);
    this.setHash(newHash);
    storageInstance.update(newHash, currentData);
  }

  /**
   * Initializes an empty data position in InMemoryStorage
   * and creates a new hash.
   */
  initialize () {
    this.__hash = storageInstance.create({});
  }

  /**
   * Creates getters and setters backed by InMemoryStorage
   * for all passed fields using `defineProperty`. The fields
   * are specified as an `options.fields` property and every key
   * represents a single property.
   *
   * @param  {Object} options `{fields: {[field]: fieldOptions}}`
   * @param  {Object} bindTo  Object to which the properties will be bound.
   * Typically the initiator of this operation.
   */
  bindProperties (options, bindTo) {
    this.__fieldKeys = Object.keys(options.fields);
    for (let i = 0; i < this.__fieldKeys.length; i++) {
      let fieldName = this.__fieldKeys[i];
      Object.defineProperty(bindTo, fieldName, {
        configurable: false,
        enumerable: true,
        get: async () => {
          // intentionally access storage every time
          const data = storageInstance.get(this.__hash);
          return data[fieldName];
        },
        set: (newValue) => {
          const data = storageInstance.get(this.__hash);
          data[fieldName] = newValue;
          storageInstance.update(this.__hash, data);
        },
      });
    }
  }
}

export default InMemoryBacked;

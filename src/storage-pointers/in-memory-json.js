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

class InMemoryJsonProvider {
  constructor (url) {
    this.url = url;
    this.hash = this._getHash(this.url);
  }

  _getHash (url) {
    const matchResult = url.match(/\w+:\/\/(\w+)/i);
    return matchResult ? matchResult[1] : null;
  }

  async download () {
    return storageInstance.get(this.hash);
  }
}

export default InMemoryJsonProvider;

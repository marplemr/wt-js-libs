// @flow
import ethJsUtil from 'ethereumjs-util';
import type { StoragePointerAccessor } from '../interfaces';

/**
 * Simple in-memory key value store that creates
 * its keys with ethereum based sha3 hash function.
 */
export class Storage {
  _storage: Object;

  constructor () {
    this._storage = {};
  }

  /**
   * Private method that hashes arbitrary data with SHA-3.
   * Before hashing, data is JSON.stringified and a current
   * timestamp is prepended to prevent collisions.
   *
   * @param  {Object} data to be hashed
   * @return {string} resulting sha3 hash
   */
  _computeHash (data: Object): string {
    return ethJsUtil.bufferToHex(ethJsUtil.sha3(Date.now() + ':' + JSON.stringify(data)));
  }

  /**
   * Adds new data to the in-memory storage.
   * @param  {Object} data
   * @return {string} hash under which the data is stored
   */
  create (data: Object): string {
    const keyHash = this._computeHash(data);
    this._storage[keyHash] = data;
    return keyHash;
  }

  /**
   * Update data under certain key
   * @param  {string} hash under which to store new data
   * @param  {Object} data
   */
  update (hash: string, data: Object) {
    this._storage[hash] = data;
  }

  /**
   * Retrieve data from a certain hash
   * @param  {string} hash under which is the desired data
   * @return {Object}
   */
  get (hash: string): Object {
    return this._storage[hash];
  }
}

/**
 * Single instance of Storage that should be used
 * throughout the whole application.
 * @type {Storage}
 */
export const storageInstance = new Storage();

/**
 * StoragePointerAccessor based on a simple in-memory key-value
 * storage.
 */
class InMemoryAccessor implements StoragePointerAccessor {
  url: string;
  hash: string;

  constructor (url: string) {
    this.url = url;
    this.hash = this._getHash(this.url);
  }

  _getHash (url: string): string {
    const matchResult = url.match(/\w+:\/\/(.+)/i);
    if (!matchResult || matchResult.length < 2) {
      throw new Error(`Cannot use InMemoryAccessor with ${url}, no schema detected.`);
    }
    return matchResult[1];
  }

  async download (): Promise<?{[string]: Object}> {
    return storageInstance.get(this.hash);
  }
}

export default InMemoryAccessor;

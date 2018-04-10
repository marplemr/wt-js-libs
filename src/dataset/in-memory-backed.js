import ethJsUtil from 'ethereumjs-util';

class InMemoryStorage {
  constructor () {
    this._storage = {};
  }

  _computeHash (data) {
    return ethJsUtil.bufferToHex(ethJsUtil.sha3(Date.now() + ':' + JSON.stringify(data)));
  }

  create (data) {
    const keyHash = this._computeHash(data);
    this._storage[keyHash] = data;
    return keyHash;
  }

  update (keyHash, data) {
    this._storage[keyHash] = data;
  }

  get (keyHash) {
    return this._storage[keyHash];
  }
}

export const storageInstance = new InMemoryStorage();

class InMemoryBacked {
  constructor (hash) {
    this.__fieldKeys = [];
    if (hash) {
      this.__hash = hash;
      if (!storageInstance.get(hash)) {
        storageInstance.update(hash, {});
      }
    }
  }

  setHash (hash) {
    this.__hash = hash;
  }

  getHash (hash) {
    return this.__hash;
  }

  initialize () {
    this.__hash = storageInstance.create({});
  }

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

import InMemoryJsonProvider from './in-memory-json';

/**
 *
 */
class StoragePointer {
  static createInstance (url, fields) {
    return new StoragePointer(url, fields);
  }

  constructor (url, fields) {
    this.ref = url;
    this.contents = {};
    this.__storagePointers = {};
    this.__downloaded = false;
    this.__contents = null;
    this.__fields = fields;
    this.__accessor = this._getStorageAccessor(this._detectScheme(this.ref));

    for (let i = 0; i < this.__fields.length; i++) {
      let fieldDef = this.__fields[i];
      if (typeof fieldDef === 'string') {
        fieldDef = {
          name: fieldDef,
        };
      }
      const fieldName = fieldDef.name;
      Object.defineProperty(this.contents, fieldName, {
        configurable: false,
        enumerable: true,
        get: async () => {
          return this._genericGetter(fieldName);
        },
      });
    }
  }

  async _genericGetter (field) {
    if (!this.__downloaded) {
      this.__contents = await this._downloadFromStorage();
      for (let i = 0; i < this.__fields.length; i++) {
        const fieldDef = this.__fields[i];
        if (fieldDef.isStorageInstance) {
          this.__storagePointers[fieldDef.name] = StoragePointer.createInstance(this.__contents[fieldDef.name], fieldDef.fields);
        }
      }
    }
    if (this.__storagePointers[field]) {
      return this.__storagePointers[field];
    }
    return this.__contents[field];
  }

  _detectScheme (url) {
    const matchResult = url.match(/(\w+):\/\//i);
    return matchResult ? matchResult[1] : null;
  }

  _getStorageAccessor (scheme) {
    switch (scheme) {
    case 'json':
      return new InMemoryJsonProvider(this.ref);
    default:
      throw new Error(`Unsupported data storage type: ${scheme || 'null'}`);
    }
  }

  _downloadFromStorage () {
    const result = this.__accessor.download();
    this.__downloaded = true;
    return result;
  }
}

export default StoragePointer;

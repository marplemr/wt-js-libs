// @flow
import type { OffChainDataAccessorInterface } from './interfaces';
import OffChainDataClient from './off-chain-data-client';

/**
 * Definition of a data field that is stored off-chain.
 * This may be recursive.
 */
type FieldDefType = {
  name: string;
  isStoragePointer?: boolean;
  fields?: Array<FieldDefType | string>
};

/**
 * `StoragePointer` serves as a representation of an
 * off-chain document holding JSON data. This generic class
 * does not enforce any protocol/schema and contains
 * infrastructure code that helps to set up field definition
 * and getters for every data field. It does not provide any
 * means of writing data, its sole purpose is for reading.
 *
 * It is possible to use this recursively, so you can define
 * a field as another storage pointer. The configuration is
 * declarative and may look like this:
 *
 * ```
 * const pointer = StoragePointer.createInstance('some://url', ['name', 'description']);
 * pointer.ref; // contains 'some://url',
 * await pointer.contents.name;
 * await pointer.contents.description;
 * ```
 *
 * Or in recursive cases:
 *
 * ```
 * const pointer = StoragePointer.createInstance('some://url', [
 *   {
 *     name: 'description',
 *     isStoragePointer: true,
 *     fields: ['name', 'description', 'location'],
 *   },
 *   'signature'
 * ]);
 * pointer.ref; // contains  'some://url'
 * await pointer.contents.signature;
 * const descPointer = await pointer.contents.description;
 * descPointer.ref; // contains whatever is written in a description property in a document located on 'some://url'
 * await descPointer.contents.name;
 * ```
 *
 * Only a top-level properties have to be defined beforehand, so the `signature`
 * field above may contain a complex JSON object.
 */
class StoragePointer {
  ref: string;
  contents: Object;
  __storagePointers: {[string]: StoragePointer};
  __downloaded: boolean;
  __data: ?{[string]: Object};
  __fields: Array<FieldDefType>;
  __accessor: OffChainDataAccessorInterface;

  /**
   * Returns a new instance of StoragePointer.
   *
   * Normalizes the `fields` format before creating the actual
   * instance
   *
   * @param {string} url where to look for data document. It has to include schema, i. e. `https://example.com/data`
   * @param {Array<FieldDefType | string>} fields list of top-level fields in the referred document
   * @throw {Error} if url is not defined
   */
  static createInstance (url: ?string, fields: ?Array<FieldDefType | string>): StoragePointer {
    if (!url) {
      throw new Error('Cannot instantiate StoragePointer without url');
    }
    fields = fields || [];
    const normalizedFieldDef = [];
    // TODO deal with field name uniqueness
    for (let fieldDef of fields) {
      if (typeof fieldDef === 'string') {
        normalizedFieldDef.push({
          name: fieldDef,
        });
      } else {
        normalizedFieldDef.push(fieldDef);
      }
    }
    return new StoragePointer(url, normalizedFieldDef);
  }

  /**
   * Detects schema from the url, based on that instantiates an appropriate
   * `OffChainDataAccessorInterface` implementation and sets up all data
   * getters.
   *
   * @param  {string} url where to look for the data
   * @param  {Array<FieldDefType>} fields definition from which are generated getters
   */
  constructor (url: string, fields: Array<FieldDefType>) {
    this.ref = url;
    this.contents = {};
    this.__storagePointers = {};
    this.__downloaded = false;
    this.__data = null;
    this.__fields = fields;

    for (let i = 0; i < this.__fields.length; i++) {
      let fieldDef = this.__fields[i];
      Object.defineProperty(this.contents, fieldDef.name, {
        configurable: false,
        enumerable: true,
        get: async () => {
          return this._genericGetter(fieldDef.name);
        },
      });
    }
  }

  /**
   * Lazy data getter. The contents file gets downloaded only
   * once any data field is accessed for the first time. Also
   * the recursive `StoragePointer`s are created here only
   * after the contents of the data is known, because we need
   * to know the url to be able to instantiate the appropariate
   * `StoragePointer`.
   *
   * This behaviour might change in a way that we are able to
   * swap the StoragePointer implementation during runtime.
   */
  async _genericGetter (field: string): StoragePointer | Object {
    if (!this.__downloaded) {
      this.__data = await this._downloadFromStorage();
      for (let i = 0; i < this.__fields.length; i++) {
        const fieldDef = this.__fields[i];
        if (fieldDef.isStoragePointer) {
          if (!this.__data[fieldDef.name] || typeof this.__data[fieldDef.name] !== 'string') {
            const value = this.__data[fieldDef.name] ? (this.__data[fieldDef.name]).toString() : 'undefined';
            throw new Error(`Cannot access ${fieldDef.name} under value ${value} which does not appear to be a valid reference.`);
          }
          this.__storagePointers[fieldDef.name] = StoragePointer.createInstance(this.__data[fieldDef.name], fieldDef.fields || []);
        }
      }
    }
    if (this.__storagePointers[field]) {
      return this.__storagePointers[field];
    }
    return this.__data && this.__data[field];
  }

  /**
   * Detects schema from an url, i. e.
   * from `json://some-data`, detects `json`.
   */
  _detectSchema (url: string): ?string {
    const matchResult = url.match(/(\w+):\/\//i);
    return matchResult ? matchResult[1] : null;
  }

  /**
   * Returns appropriate implementation of `OffChainDataAccessorInterface`
   * based on schema. Uses `OffChainDataClient.getAccessor` factory method.
   */
  async _getOffChainDataClient (): Promise<OffChainDataAccessorInterface> {
    if (!this.__accessor) {
      this.__accessor = await OffChainDataClient.getAccessor(this._detectSchema(this.ref));
    }
    return this.__accessor;
  }

  /**
   * Gets the data document via `OffChainDataAccessorInterface`.
   * If nothing is returned, might return an empty object.
   */
  async _downloadFromStorage (): Promise<{[string]: Object}> {
    const accessor = await this._getOffChainDataClient();
    const result = await accessor.download(this.ref);
    this.__downloaded = true;
    return result || {};
  }
}

export default StoragePointer;
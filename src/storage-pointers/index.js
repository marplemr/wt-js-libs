// @flow
import InMemoryJsonProvider from './in-memory-json';
import type { StoragePointerAccessor } from '../interfaces';

/**
 * Definition of a data field that is stored off-chain.
 * This may be recursive.
 */
type FieldDefType = {
  name: string;
  isStorageInstance?: boolean;
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
 *     isStorageInstance: true,
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
  __accessor: StoragePointerAccessor;

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
  static createInstance (url: ?string, fields: Array<FieldDefType | string>): StoragePointer {
    if (!url) {
      throw new Error('Cannot instantiate StoragePointer without url');
    }
    const normalizedFieldDef = [];
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
   * `StoragePointerAccessor` implementation and sets up all data
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
    this.__accessor = this._getStorageAccessor(this._detectschema(this.ref));

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
        if (fieldDef.isStorageInstance) {
          if (!this.__data[fieldDef.name] || typeof this.__data[fieldDef.name] !== 'string') {
            throw new Error(`Cannot access ${fieldDef.name} under value ${(this.__data[fieldDef.name]).toString()} which does not appear to be a string.`);
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
  _detectschema (url: string): ?string {
    const matchResult = url.match(/(\w+):\/\//i);
    return matchResult ? matchResult[1] : null;
  }

  /**
   * Returns appropriate implementation of `StoragePointerAccessor`
   * based on schema. Now, the accessors are hardcoded here, but in
   * a future implementation it should be possible to configure
   * a list of available accessor implementations.
   */
  _getStorageAccessor (schema: ?string): StoragePointerAccessor {
    // TODO drop switch, use object with accessors passed from library config
    switch (schema) {
    case 'json':
      return new InMemoryJsonProvider(this.ref);
    default:
      throw new Error(`Unsupported data storage type: ${schema || 'null'}`);
    }
  }

  /**
   * Gets the data document via `StoragePointerAccessor`.
   * If nothing is returned, might return an empty object.
   */
  async _downloadFromStorage (): Promise<{[string]: Object}> {
    const result = this.__accessor.download();
    this.__downloaded = true;
    return result || {};
  }
}

export default StoragePointer;

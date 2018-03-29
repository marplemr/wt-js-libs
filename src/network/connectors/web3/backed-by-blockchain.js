// This is so meta and generic that flow is hard to do here
import _ from 'lodash';
// type FieldStateType = 'unsynced' | 'synced' | 'dirty';

class BackedByBlockchain {
  constructor () {
    this.address = undefined;
    this.__obsoleteFlag = false;
    this.__localData = {};
    this.__networkData = {};
    this.__fieldStates = {};
    this.__fieldKeys = [];
  }

  setOptions (options) {
    this.__options = options;
    this.__fieldKeys = Object.keys(options.fields);

    for (let i = 0; i < this.__fieldKeys.length; i++) {
      let fieldName = this.__fieldKeys[i];
      this.__fieldStates[fieldName] = 'unsynced';
      Object.defineProperty(this, fieldName, {
        configurable: false,
        enumerable: true,
        get: async () => {
          return this._genericGetter(fieldName);
        },
        set: (newValue) => {
          this._genericSetter(fieldName, newValue);
        },
      });
    }
  }

  isObsolete () {
    return this.__obsoleteFlag;
  }

  markObsolete () {
    this.__obsoleteFlag = true;
  }

  async _genericGetter (property) {
    if (this.isObsolete()) {
      throw new Error('This object was destroyed on the network!');
    }
    // This is a totally new instance backed by an actual contract
    if (this.address && (this.__fieldStates[property] === 'unsynced')) {
      await this._syncDataFromNetwork();
    }

    return this.__localData[property];
  }

  _genericSetter (property, newValue) {
    if (this.isObsolete()) {
      throw new Error('This object was destroyed on the network!');
    }
    if (this.__localData[property] !== newValue) {
      this.__localData[property] = newValue;
      this.__fieldStates[property] = 'dirty';
    }
  }

  async _fetchDataFromNetwork () {
    if (!this.address) {
      throw new Error('Cannot fetch data without network address');
    }
    const networkGetters = [];
    const contract = await this._getContractInstance();
    for (let i = 0; i < this.__fieldKeys.length; i++) {
      const networkGetter = this.__options.fields[this.__fieldKeys[i]].networkGetter;
      if (networkGetter && this.__fieldStates[this.__fieldKeys[i]] === 'unsynced') {
        networkGetters.push(networkGetter(contract));
      }
    }
    if (networkGetters.length) {
      const attributes = await (Promise.all(networkGetters));
      for (let i = 0; i < this.__fieldKeys.length; i++) {
        this.__networkData[this.__fieldKeys[i]] = attributes[i];
      }
    }
    return this.__networkData;
  }

  async _syncDataFromNetwork () {
    try {
      await this._fetchDataFromNetwork();
      // Copy over data from networkData in the main storage
      for (let i = 0; i < this.__fieldKeys.length; i++) {
        // Do not update user-modified fields
        // TODO deal with 3rd party data modificiation on network
        if (this.__networkData[this.__fieldKeys[i]] !== this.__localData[this.__fieldKeys[i]] && this.__fieldStates[this.__fieldKeys[i]] !== 'dirty') {
          this.__localData[this.__fieldKeys[i]] = this.__networkData[this.__fieldKeys[i]];
          this.__fieldStates[this.__fieldKeys[i]] = 'synced';
        }
      }
    } catch (err) {
      // TODO better error handling
      // Address where there is no hotel deployed / any other error
      throw new Error('Cannot call hotel contract on ' + (this.address || '') + ': ' + err.message);
    }
  }

  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  __hashCode (text) {
    var hash = 0, i, chr;
    if (text.length === 0) {
      return hash;
    }
    for (i = 0; i < text.length; i++) {
      chr = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  async updateOnNetwork (transactionOptions) {
    await this._syncDataFromNetwork();
    const networkSetters = [];
    const networkSettersHashCodes = {};
    const contract = await this._getContractInstance();
    for (let i = 0; i < this.__fieldKeys.length; i++) {
      const networkSetter = this.__options.fields[this.__fieldKeys[i]].networkSetter;
      if (networkSetter && this.__fieldStates[this.__fieldKeys[i]] === 'dirty') {
        // deduplicate equal calls
        let setterHashCode = this.__hashCode(networkSetter.toString());
        if (!networkSettersHashCodes[setterHashCode]) {
          networkSettersHashCodes[setterHashCode] = true;
          networkSetters.push(networkSetter(contract, _.cloneDeep(transactionOptions)));
        }
      }
    }
    // TODO check results
    await (Promise.all(networkSetters));
    return this;
  }

  async createOnNetwork (transactionOptions) {
    // TODO create default implementation that deploys contract
    // to network
    throw new Error('This has to be implemented in a subclass!');
  }

  async removeFromNetwork (transactionOptions) {
    // by default you can not remove contract from network
    throw new Error('This has to be implemented in a subclass!');
  }
}

export default BackedByBlockchain;

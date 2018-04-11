// This is so meta and generic that flow is hard to do here
import _ from 'lodash';

class RemotelyBacked {
  constructor () {
    this.__obsoleteFlag = false;
    this.__deployedFlag = false;
    this.__localData = {};
    this.__remoteData = {};
    this.__fieldStates = {};
    this.__fieldKeys = [];
  }

  bindProperties (options, bindTo) {
    this.__options = options;
    this.__fieldKeys = Object.keys(options.fields);

    for (let i = 0; i < this.__fieldKeys.length; i++) {
      let fieldName = this.__fieldKeys[i];
      this.__fieldStates[fieldName] = 'unsynced';
      Object.defineProperty(bindTo, fieldName, {
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

  isDeployed () {
    return this.__deployedFlag;
  }

  markDeployed () {
    this.__deployedFlag = true;
  }

  async _genericGetter (property) {
    if (this.isObsolete()) {
      throw new Error('This object was destroyed in a remote storage!');
    }
    // This is a totally new instance
    // TODO maybe don't init all at once, it might be expensive
    if (this.isDeployed() && this.__fieldStates[property] === 'unsynced') {
      await this._syncRemoteData();
    }

    return this.__localData[property];
  }

  _genericSetter (property, newValue) {
    if (this.isObsolete()) {
      throw new Error('This object was destroyed in a remote storage!');
    }
    if (this.__localData[property] !== newValue) {
      this.__localData[property] = newValue;
      this.__fieldStates[property] = 'dirty';
    }
  }

  async _fetchRemoteData () {
    if (!this.isDeployed()) {
      throw new Error('Cannot fetch undeployed object');
    }
    const remoteGetters = [];
    for (let i = 0; i < this.__fieldKeys.length; i++) {
      const remoteGetter = this.__options.fields[this.__fieldKeys[i]].remoteGetter;
      if (remoteGetter && this.__fieldStates[this.__fieldKeys[i]] === 'unsynced') {
        remoteGetters.push(remoteGetter());
      }
    }
    if (remoteGetters.length) {
      const attributes = await (Promise.all(remoteGetters));
      for (let i = 0; i < this.__fieldKeys.length; i++) {
        this.__remoteData[this.__fieldKeys[i]] = attributes[i];
      }
    }
    return this.__remoteData;
  }

  async _syncRemoteData () {
    try {
      await this._fetchRemoteData();
      // Copy over data from remoteData to local data
      for (let i = 0; i < this.__fieldKeys.length; i++) {
        // Do not update user-modified fields
        // TODO deal with 3rd party data modificiation on a remote storage
        if (this.__remoteData[this.__fieldKeys[i]] !== this.__localData[this.__fieldKeys[i]] && this.__fieldStates[this.__fieldKeys[i]] !== 'dirty') {
          this.__localData[this.__fieldKeys[i]] = this.__remoteData[this.__fieldKeys[i]];
          this.__fieldStates[this.__fieldKeys[i]] = 'synced';
        }
      }
    } catch (err) {
      // TODO better error handling
      throw new Error('Cannot sync remote data: ' + err.message);
    }
  }

  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  __hashCode (text) {
    var hash = 0, i, chr;
    for (i = 0; i < text.length; i++) {
      chr = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  async updateRemoteData (transactionOptions) {
    await this._syncRemoteData();
    const remoteSetters = [];
    const remoteSettersHashCodes = {};
    for (let i = 0; i < this.__fieldKeys.length; i++) {
      const remoteSetter = this.__options.fields[this.__fieldKeys[i]].remoteSetter;
      if (remoteSetter && this.__fieldStates[this.__fieldKeys[i]] === 'dirty') {
        // deduplicate equal calls
        let setterHashCode = this.__hashCode(remoteSetter.toString());
        if (!remoteSettersHashCodes[setterHashCode]) {
          remoteSettersHashCodes[setterHashCode] = true;
          remoteSetters.push(remoteSetter(_.cloneDeep(transactionOptions)).then((result) => {
            this.__fieldStates[this.__fieldKeys[i]] = 'synced';
            return result;
          }));
        }
      }
    }
    return Promise.all(remoteSetters);
  }
}

export default RemotelyBacked;

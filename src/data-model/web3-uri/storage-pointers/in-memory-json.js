import { storageInstance } from '../../../dataset/in-memory-backed';

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

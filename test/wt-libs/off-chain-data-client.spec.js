import { assert } from 'chai';
import OffChainDataClient from '../../src/off-chain-data-client';

describe('WTLibs.OffChainDataClient', () => {
  it('should return proper accessor', async () => {
    const accessor = await OffChainDataClient.getAccessor('json');
    assert.equal(accessor.constructor.name, 'InMemoryAccessor');
  });

  it('should throw when no accessor is found for given schema', async () => {
    try {
      await OffChainDataClient.getAccessor('non-existent');
      throw new Error('should have never been called');
    } catch (e) {
      assert.match(e.message, /unsupported data storage type/i);
    }
  });
});

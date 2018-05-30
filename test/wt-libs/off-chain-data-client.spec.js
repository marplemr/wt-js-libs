import { assert } from 'chai';
import OffChainDataClient from '../../src/off-chain-data-client';
import { accessor as InMemoryAccessor } from '@windingtree/off-chain-accessor-in-memory';

describe('WTLibs.OffChainDataClient', () => {
  beforeEach(() => {
    OffChainDataClient.setup({
      accessors: {
        json: {
          create: () => {
            return new InMemoryAccessor();
          },
        },
      },
    });
  });

  afterEach(() => {
    OffChainDataClient.__reset();
  });

  it('should return proper accessor', async () => {
    const accessor = await OffChainDataClient.getAccessor('json');
    assert.isDefined(accessor);
    assert.isDefined(accessor._getHash);
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

// @flow
import type { OffChainDataAccessorInterface } from './interfaces';
import InMemoryAccessor from './off-chain-data-accessors/in-memory';

class OffChainDataClient {
  // TODO drop swith, use pre-configured accessor map
  static async getAccessor (schema: ?string): Promise<OffChainDataAccessorInterface> {
    switch (schema) {
    case 'json':
      return new InMemoryAccessor();
    default:
      throw new Error(`Unsupported data storage type: ${schema || 'null'}`);
    }
  }
}

export default OffChainDataClient;

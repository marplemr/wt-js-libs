// @flow
import type { OffChainDataAccessorInterface } from './interfaces';

export type OffChainDataClientOptionsType = {
  accessors: {[schema: string]: {
    options: Object;
    create: (options: Object) => OffChainDataAccessorInterface
  }}
};

let offChainDataOptions: OffChainDataClientOptionsType;

class OffChainDataClient {
  accessors: Object;

  static setup (options: OffChainDataClientOptionsType) {
    offChainDataOptions = options || {};
    if (!offChainDataOptions.accessors) {
      offChainDataOptions.accessors = {};
    }
  }

  static __reset () {
    offChainDataOptions.accessors = {};
  }

  static async getAccessor (schema: ?string): Promise<OffChainDataAccessorInterface> {
    if (!schema || !offChainDataOptions.accessors[schema]) {
      throw new Error(`Unsupported data storage type: ${schema || 'null'}`);
    }
    const accessor = offChainDataOptions.accessors[schema];
    return accessor.create(accessor.options);
  }
}

export default OffChainDataClient;

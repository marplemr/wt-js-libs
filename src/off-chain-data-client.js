// @flow
import type { OffChainDataAccessorInterface } from './interfaces';

/**
 * OffChainDataClientOptionsType
 */
export type OffChainDataClientOptionsType = {
  accessors: {[schema: string]: {
    options: Object;
    create: (options: Object) => OffChainDataAccessorInterface
  }}
};

let offChainDataOptions: OffChainDataClientOptionsType;

/**
 * OffChainDataClient is a static factory class that is responsible
 * for creating proper instances of OffChainDataAccessorInterface.
 * It is configured during the library initialization.
 *
 * Please bear in mind, that once the accessors are configured, the
 * configuration is shared during the whole runtime.
 */
class OffChainDataClient {
  accessors: Object;

  /**
   * Initializes the map of OffChainDataAccessors.
   *
   * @param  {OffChainDataClientOptionsType}
   */
  static setup (options: OffChainDataClientOptionsType) {
    offChainDataOptions = options || {};
    if (!offChainDataOptions.accessors) {
      offChainDataOptions.accessors = {};
    }
  }

  /**
   * Drops all pre-configured OffChainDataAccessors. Useful for testing.
   */
  static __reset () {
    offChainDataOptions.accessors = {};
  }

  /**
   * Returns a fresh instance of an appropriate OffChainDataAccessor by
   * calling the `create` function from the accessor's configuration.
   *
   * @throws {Error} when schema is not defined or accessor for this schema does not exist
   */
  static async getAccessor (schema: ?string): Promise<OffChainDataAccessorInterface> {
    if (!schema || !offChainDataOptions.accessors[schema]) {
      throw new Error(`Unsupported data storage type: ${schema || 'null'}`);
    }
    const accessor = offChainDataOptions.accessors[schema];
    return accessor.create(accessor.options);
  }
}

export default OffChainDataClient;

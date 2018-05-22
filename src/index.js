// @flow

import type { DataModelOptionsType } from './data-model';
import type { WTIndexInterface, AdaptedTxResultsInterface, OffChainDataAccessorInterface, WalletInterface, KeystoreV3Interface } from './interfaces';
import DataModel from './data-model';
import OffChainDataClient from './off-chain-data-client';

/**
 * General options for wt-libs-js. Holds all things necessary
 * for successful setup of Winding Tree network.
 *
 * @type WtLibsOptionsType
 */
type WtLibsOptionsType = {
  dataModelOptions: DataModelOptionsType
};

/**
 * Main public interface of wt-libs-js.
 */
class WTLibs {
  dataModel: DataModel;
  options: WtLibsOptionsType;

  /**
   * Call this to create wt-libs-js instance.
   * @param options
   * @return WTLibs
   */
  static createInstance (options: WtLibsOptionsType): WTLibs {
    return new WTLibs(options);
  }

  constructor (options: WtLibsOptionsType) {
    this.options = options || {};
    this.dataModel = DataModel.createInstance(this.options.dataModelOptions);
  }

  /**
   * Get an instance of Winding Tree index from the underlying `data-model`.
   *
   * @param address of the Winding Tree index
   * @type Promise<WTIndexInterface>
   */
  async getWTIndex (address: string): Promise<WTIndexInterface> {
    return this.dataModel.getWindingTreeIndex(address);
  }

  /**
   * Get a transactions status from the underlying `data-model`
   */
  async getTransactionsStatus (transactionHashes: Array<string>): Promise<AdaptedTxResultsInterface> {
    return this.dataModel.getTransactionsStatus(transactionHashes);
  }

  async createWallet (jsonWallet: KeystoreV3Interface): Promise<WalletInterface> {
    return this.dataModel.createWallet(jsonWallet);
  }

  async getOffChainDataClient (schema: string): Promise<OffChainDataAccessorInterface> {
    return OffChainDataClient.getAccessor(schema);
  }
}

export default WTLibs;

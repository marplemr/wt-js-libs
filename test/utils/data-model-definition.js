import offChainData from './data/off-chain-data.json';
import Web3UriDataModel from '../../src/data-model/web3-uri';

export const Web3UriBackedDataModel = {
  type: 'web3-uri',
  dataModelAccessor: Web3UriDataModel,
  emptyConfig: {},
  withDataSource: () => ({
    dataModelOptions: {
      provider: 'http://localhost:8545',
      initialJsonData: offChainData,
    },
  }),
  indexAddress: '0x8c2373842d5ea4ce4baf53f4175e5e42a364c59c',
  emptyIndexAddress: '0x994afd347b160be3973b41f0a144819496d175e9',
};

export default Web3UriBackedDataModel;

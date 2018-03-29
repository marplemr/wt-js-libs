import _ from 'lodash';
import dataSource from './data/network.json';
import JsonConnector from '../../src/network/connectors/json';
import Web3Connector from '../../src/network/connectors/web3';

export const JsonNetwork = {
  type: 'json',
  connector: JsonConnector,
  emptyConfig: {},
  withDataSource: () => {
    return {
      networkConnectorType: 'json',
      networkOptions: { source: _.cloneDeep(dataSource) },
    };
  },
  indexAddress: 'fullIndex',
  emptyIndexAddress: 'emptyIndex',
};

export const Web3Network = {
  type: 'web3',
  connector: Web3Connector,
  emptyConfig: {},
  withDataSource: () => ({
    networkConnectorType: 'web3',
    networkOptions: { provider: 'http://localhost:8545' },
  }),
  indexAddress: '0x8c2373842d5ea4ce4baf53f4175e5e42a364c59c',
  emptyIndexAddress: '0x994afd347b160be3973b41f0a144819496d175e9',
};

let chosenNetwork;

if (process.env.TESTED_NETWORK === 'web3') {
  chosenNetwork = Web3Network;
} else {
  chosenNetwork = JsonNetwork;
}
export default chosenNetwork;

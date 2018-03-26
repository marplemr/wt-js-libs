import _ from 'lodash';
import dataSource from './data/network.json';
import JsonConnector from '../../src/network/connectors/json';

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

export default JsonNetwork;

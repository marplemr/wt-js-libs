import _ from 'lodash';
import dataSource from './data/network.json';
import FullJsonDataModel from '../../src/data-model/full-json';
import Web3UriDataModel from '../../src/data-model/web3-uri';

export const FullJsonBackedDataModel = {
  type: 'full-json',
  dataModelAccessor: FullJsonDataModel,
  emptyConfig: {},
  withDataSource: () => {
    return {
      dataModelType: 'full-json',
      dataModelOptions: { source: _.cloneDeep(dataSource) },
    };
  },
  indexAddress: 'fullIndex',
  emptyIndexAddress: 'emptyIndex',
};

function _computeInitialWeb3JsonData () {
  let data = {};
  for (let address in dataSource.fullIndex.hotels) {
    let hotel = dataSource.fullIndex.hotels[address];
    data[hotel.url] = {
      name: hotel.name,
      description: hotel.description,
      location: hotel.location,
    };
  }
  return data;
}

export const Web3UriBackedDataModel = {
  type: 'web3-uri',
  dataModelAccessor: Web3UriDataModel,
  emptyConfig: {},
  withDataSource: () => ({
    dataModelType: 'web3-uri',
    dataModelOptions: {
      provider: 'http://localhost:8545',
      initialJsonData: _computeInitialWeb3JsonData(),
    },
  }),
  indexAddress: '0x8c2373842d5ea4ce4baf53f4175e5e42a364c59c',
  emptyIndexAddress: '0x994afd347b160be3973b41f0a144819496d175e9',
};

const dataModels = [
  FullJsonBackedDataModel,
  Web3UriBackedDataModel,
];

let chosenDataModel;

if (process.env.TESTED_DATA_MODEL) {
  chosenDataModel = _.find(dataModels, (model) => model.type === process.env.TESTED_DATA_MODEL);
  if (!chosenDataModel) {
    throw new Error('Unknown data model');
  }
} else {
  chosenDataModel = FullJsonBackedDataModel;
}
export default chosenDataModel;

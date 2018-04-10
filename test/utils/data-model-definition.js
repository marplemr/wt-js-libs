import _ from 'lodash';
import dataSource from './data/network.json';
import FullJsonDataModel from '../../src/data-model/full-json';
import Web3JsonDataModel from '../../src/data-model/web3-json';

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
  for (let address in dataSource.fullIndex.index.hotels) {
    let hotel = dataSource.fullIndex.index.hotels[address];
    data[hotel.url] = {
      name: hotel.name,
      description: hotel.description,
      location: hotel.location,
    };
  }
  return data;
}

export const Web3JsonBackedDataModel = {
  type: 'web3-json',
  dataModelAccessor: Web3JsonDataModel,
  emptyConfig: {},
  withDataSource: () => ({
    dataModelType: 'web3-json',
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
  Web3JsonBackedDataModel,
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

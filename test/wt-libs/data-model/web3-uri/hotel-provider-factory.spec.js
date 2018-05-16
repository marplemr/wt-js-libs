import { assert } from 'chai';
import sinon from 'sinon';
import testedDataModel from '../../../utils/data-model-definition';
import Web3UriDataModel from '../../../../src/data-model/web3-uri';
import HotelProviderFactory from '../../../../src/data-model/web3-uri/hotel-provider-factory';

describe('WTLibs.data-model.web3-uri.hotel-data-provider', () => {
  let dataModel, hotelProvider;

  beforeEach(async function () {
    dataModel = Web3UriDataModel.createInstance(testedDataModel.withDataSource().dataModelOptions);
    hotelProvider = HotelProviderFactory.createInstance('json', dataModel.web3Utils, dataModel.web3Contracts);
  });

  it('should detect schema', () => {
    assert.equal(hotelProvider.__detectUsedSchema('whatever://random-url'), 'whatever');
    assert.equal(hotelProvider.__detectUsedSchema('whatever-random-url'), null);
  });

  it('should use default data provider and not contact chain if no address is provided', async () => {
    const hotelProviderClassSpy = sinon.spy(hotelProvider, '__getHotelProviderClass');
    const getHotelContractSpy = sinon.spy(hotelProvider, '__getHotelContractInstance');
    const detectUsedSchemaSpy = sinon.spy(hotelProvider, '__detectUsedSchema');
    await hotelProvider.getHotelInstance({});
    assert.equal(hotelProviderClassSpy.callCount, 1);
    assert.equal(hotelProviderClassSpy.firstCall.args[0], hotelProvider.defaultDataStorage);
    assert.equal(getHotelContractSpy.callCount, 0);
    assert.equal(detectUsedSchemaSpy.callCount, 0);
    hotelProviderClassSpy.restore();
    getHotelContractSpy.restore();
    detectUsedSchemaSpy.restore();
  });

  it('should contact chain for url if address is provided', async () => {
    const hotelProviderClassSpy = sinon.spy(hotelProvider, '__getHotelProviderClass');
    const getHotelContractSpy = sinon.spy(hotelProvider, '__getHotelContractInstance');
    const detectUsedSchemaSpy = sinon.spy(hotelProvider, '__detectUsedSchema');
    await hotelProvider.getHotelInstance({}, '0xbf18b616ac81830dd0c5d4b771f22fd8144fe769');
    assert.equal(hotelProviderClassSpy.callCount, 1);
    assert.equal(getHotelContractSpy.callCount, 1);
    assert.equal(detectUsedSchemaSpy.callCount, 1);
    hotelProviderClassSpy.restore();
    getHotelContractSpy.restore();
    detectUsedSchemaSpy.restore();
  });

  it('should return provider class', () => {
    const jsonClass = hotelProvider.__getHotelProviderClass('json');
    assert.equal(jsonClass.name, 'JsonHotelProvider');
  });

  it('should throw on unknown provider class', () => {
    try {
      hotelProvider.__getHotelProviderClass();
    } catch (e) {
      assert.match(e.message, /unsupported data storage/i);
    }
  });
});

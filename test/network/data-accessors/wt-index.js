import { assert } from 'chai';
import sinon from 'sinon';
import WTIndexDataAccessor from '../../../src/network/data-accessors/wt-index';

describe('WTLibs.network.data-accessors.wtIndex', () => {
  let dummyProvider;
  let accessor;

  beforeEach(() => {
    dummyProvider = {
      addHotel: sinon.stub().resolves('12345'),
      getHotel: sinon.stub().resolves({ name: 'stubbedHotel' }),
      getAllHotels: sinon.stub().resolves([{ name: 'stubbedHotel1' }, { name: 'stubbedHotel2' }]),
    };
    accessor = WTIndexDataAccessor.createInstance(dummyProvider);
  });

  it('should accept any provider', () => {
    assert.isDefined(accessor);
  });

  it('should call addHotel on provider', async () => {
    const address = await accessor.addHotel({ name: 'anotherHotel' });
    assert.equal(address, '12345');
    assert.equal(dummyProvider.addHotel.callCount, 1);
  });

  it('should call getHotel on provider', async () => {
    const hotel = await accessor.getHotel('1234');
    assert.isDefined(hotel);
    assert.equal(hotel.name, 'stubbedHotel');
    assert.equal(dummyProvider.getHotel.callCount, 1);
  });

  it('should call getAllHotels on provider', async () => {
    const hotels = await accessor.getAllHotels();
    assert.isDefined(hotels);
    assert.equal(hotels.length, 2);
    assert.equal(hotels[0].name, 'stubbedHotel1');
    assert.equal(hotels[1].name, 'stubbedHotel2');
    assert.equal(dummyProvider.getAllHotels.callCount, 1);
  });
});

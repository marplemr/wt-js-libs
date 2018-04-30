import { assert } from 'chai';
import sinon from 'sinon';
import Contracts from '../../../src/common-web3/contracts';

describe('WTLibs.common-web3.Contracts', () => {
  let contracts, isAddressStub, getCodeStub, ContractStub;
  
  beforeEach(() => {
    isAddressStub = sinon.stub().returns(true);
    getCodeStub = sinon.stub().resolves('0x01');
    ContractStub = sinon.spy();
    contracts = Contracts.createInstance({
      utils: {
        isAddress: isAddressStub,
      },
      eth: {
        getCode: getCodeStub,
        Contract: ContractStub,
      },
    });
  });

  it('should throw on an invalid address', async () => {
    contracts.web3.utils.isAddress = sinon.stub().returns(false);
    try {
      await contracts.__getInstance('some', {}, 'address');
      throw new Error('should not have been called');
    } catch (e) {
      assert.match(e.message, /at an invalid address/i);
    }
  });

  it('should throw if no code exists on the address', async () => {
    contracts.web3.eth.getCode = sinon.stub().returns('0x0');
    try {
      await contracts.__getInstance('some', {}, 'address');
      throw new Error('should not have been called');
    } catch (e) {
      assert.match(e.message, /address with no code/i);
    }
  });

  it('should get hotel instance', async () => {
    await contracts.getIndexInstance('some-address');
    assert.equal(ContractStub.calledWithNew(), true);
  });

  it('should get index instance', async () => {
    await contracts.getHotelInstance('some-address');
    assert.equal(ContractStub.calledWithNew(), true);
  });
});

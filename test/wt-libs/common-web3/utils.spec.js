import { assert } from 'chai';
import Utils from '../../../src/common-web3/utils';

// TODO more tests
describe('WTLibs.common-web3.Utils', () => {
  describe('_isZeroAddress', () => {
    let utils;

    beforeEach(() => {
      utils = Utils.createInstance(3, {
        currentProvider: 'some',
      });
    });

    describe('isZeroAddress', () => {
      it('should behave as expected', () => {
        assert.equal(utils.isZeroAddress(), true);
        assert.equal(utils.isZeroAddress('random-address'), true);
        assert.equal(utils.isZeroAddress('0x0000000000000000000000000000000000000000'), true);
        assert.equal(utils.isZeroAddress('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA'), false);
      });
    });

    describe('applyGasCoefficient', () => {
      it('should apply gas coefficient', () => {
        const gas = utils.applyGasCoefficient(10);
        assert.equal(gas, 10 * utils.gasCoefficient);
      });

      it('should fallback to gas if no coefficient is specified', () => {
        const origCoeff = utils.gasCoefficient;
        utils.gasCoefficient = undefined;
        const gas = utils.applyGasCoefficient(10);
        assert.equal(gas, 10);
        utils.gasCoefficient = origCoeff;
      });
    });
  });
});

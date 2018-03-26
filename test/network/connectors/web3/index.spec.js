import { assert } from 'chai';
import Web3Connector from '../../../../src/network/connectors/web3';
import Utils from '../../../../src/network/connectors/web3/utils';
import testedNetwork from '../../../utils/network-definition';

describe('WTLibs.network.connectors.web3', () => {
  describe('Connector', () => {
    let connector;

    beforeEach(async function () {
      if (process.env.TESTED_NETWORK !== 'web3') {
        this.skip();
      }
      connector = Web3Connector.createInstance(testedNetwork.withDataSource().networkOptions);
    });

    describe('applyGasCoefficient', () => {
      it('should apply gas coefficient', () => {
        const gas = connector.applyGasCoefficient(10);
        assert.equal(gas, 10 * connector.options.gasCoefficient);
      });

      it('should fallback to gas if no coefficient is specified', () => {
        const origCoeff = connector.options.gasCoefficient;
        connector.options.gasCoefficient = undefined;
        const gas = connector.applyGasCoefficient(10);
        assert.equal(gas, 10);
        connector.options.gasCoefficient = origCoeff;
      });
    });
  });

  describe('Utils', () => {
    describe('_isZeroAddress', () => {
      it('should behave as expected', () => {
        assert.equal(Utils.isZeroAddress(), true);
        assert.equal(Utils.isZeroAddress('random-address'), true);
        assert.equal(Utils.isZeroAddress('0x0000000000000000000000000000000000000000'), true);
        assert.equal(Utils.isZeroAddress('0x96eA4BbF71FEa3c9411C1Cefc555E9d7189695fA'), false);
      });
    });
  });
});

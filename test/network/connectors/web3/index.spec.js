import { assert } from 'chai';
import sinon from 'sinon';
import Web3Connector from '../../../../src/network/connectors/web3';
import Utils from '../../../../src/network/connectors/web3/utils';
import BackedByBlockchain from '../../../../src/network/connectors/web3/backed-by-blockchain';
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

  describe('BackedByBlockchain', () => {
    let bbbInstance;
    beforeEach(() => {
      bbbInstance = new BackedByBlockchain();
      bbbInstance.address = 'aaaa';
      bbbInstance._getContractInstance = sinon.stub();
      bbbInstance.setOptions({
        fields: {
          randomField: {
            networkGetter: async () => {
              return 'field name';
            },
            networkSetter: async () => {
              // pass
            },
          },
        },
      });
    });
    describe('obsolete state', () => {
      it('should not allow getting when object is in obsolete state', async () => {
        try {
          bbbInstance.markObsolete();
          assert.equal(await bbbInstance.randomField, 'field name');
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /object was destroyed/i);
        }
      });

      it('should not allow setting when object is in obsolete state', () => {
        bbbInstance.markObsolete();
        try {
          bbbInstance.randomField = 'something';
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /object was destroyed/i);
        }
      });
    });

    describe('abstract operations', () => {
      it('should not allow createOnNetwork', async () => {
        try {
          await bbbInstance.createOnNetwork();
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /implemented in a subclass/i);
        }
      });

      it('should not allow removeFromNetwork', async () => {
        try {
          await bbbInstance.removeFromNetwork();
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /implemented in a subclass/i);
        }
      });
    });
  });
});

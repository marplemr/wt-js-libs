import { assert } from 'chai';
import sinon from 'sinon';
import web3Abi from 'web3-eth-abi';
import Utils from '../../../src/common-web3/utils';

describe('WTLibs.common-web3.Utils', () => {
  describe('_isZeroAddress', () => {
    let utils;

    beforeEach(() => {
      utils = Utils.createInstance(3, {
        currentProvider: 'some',
        eth: {
          getTransactionCount: sinon.stub().returns(6),
        },
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

    describe('encodeMethodCall', () => {
      const abi = [
        {
          'inputs': [
            {
              'name': '_url',
              'type': 'string',
            },
          ],
          'name': 'editInfo',
          'type': 'function',
        },
        {
          'inputs': [
            {
              'name': '_url',
              'type': 'string',
            },
            {
              'name': '_param',
              'type': 'string',
            },
          ],
          'name': 'editInfo',
          'type': 'function',
        },
      ];

      beforeEach(() => {
        sinon.stub(web3Abi, 'encodeFunctionCall').callsFake((methodAbi, params) => {
          return [methodAbi, params];
        });
      });

      afterEach(() => {
        web3Abi.encodeFunctionCall.restore();
      });

      it('should pick the proper method based on argument count', () => {
        let result = utils.encodeMethodCall(abi, 'editInfo', ['one', 'two']);
        assert.equal(result[0].inputs.length, 2);
        result = utils.encodeMethodCall(abi, 'editInfo', ['one']);
        assert.equal(result[0].inputs.length, 1);
      });

      it('should throw when no appropriate method is found', () => {
        try {
          utils.encodeMethodCall(abi, 'editInfo2', ['one']);
          throw new Error('should not have been called');
        } catch (e) {
          assert.match(e.message, /method not found/i);
        }
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

    describe('getCurrentWeb3Provider', () => {
      it('should return current web3 provider', () => {
        assert.equal(utils.getCurrentWeb3Provider(), 'some');
      });
    });

    describe('determineDeployedContractFutureAddress', () => {
      it('should compute proper address', () => {
        const expectedAddress = '0x0C4c734F0Ecb92270D1ebE7b04aEC4440EB05CAa';
        assert.equal(utils.determineDeployedContractFutureAddress('0x8c2373842d5ea4ce4baf53f4175e5e42a364c59c', 3), expectedAddress);
      });
    });

    describe('determineCurrentAddressNonce', () => {
      it('should return transaction count', async () => {
        assert.equal(await utils.determineCurrentAddressNonce('addresss'), 6);
      });
    });
  });
});

import _ from 'lodash';
import sinon from 'sinon';

function stubContractMethodResult (callResult, sendSetup = { txHash: true, receipt: true, error: false, catch: false }, estimatedGas = 33) {
  let methodParams = arguments;
  let finalCallResult = callResult;
  if (_.isFunction(callResult)) {
    finalCallResult = callResult({
      methodParams: methodParams,
      callParams: arguments,
    });
  }

  const methodMock = {
    call: sinon.stub().returns(finalCallResult),
    send: sinon.stub().returns({
      on: function (evt, callback) {
        if (evt === 'transactionHash' && sendSetup.txHash) {
          callback('tx-hash'); // eslint-disable-line standard/no-callback-literal
        }
        if (evt === 'receipt' && sendSetup.receipt) {
          callback({}); // eslint-disable-line standard/no-callback-literal
        }
        if (evt === 'error' && sendSetup.error) {
          callback('on error handler fired'); // eslint-disable-line standard/no-callback-literal
        }
        return this;
      },
      catch: function (callback) {
        if (sendSetup.catch) {
          callback('send catch fired'); // eslint-disable-line standard/no-callback-literal
        }
      },
    }),
    estimateGas: sinon.stub().returns(estimatedGas),
  };

  return function () {
    return methodMock;
  };
}

export default {
  stubContractMethodResult: stubContractMethodResult,
};

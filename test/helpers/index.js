const _ = require('lodash');

function stubContractMethodResult(callResult, encodeAbiResult = {}, estimatedGas = 33) {
  return function () {
    let methodParams = arguments;
    return {
      call: function () {
        if (_.isFunction(callResult)) {
          return callResult({
            methodParams: methodParams,
            callParams: arguments
          });
        }
        return callResult;
      },
      encodeABI: function () {
        if (_.isFunction(encodeAbiResult)) {
            return encodeAbiResult({
              methodParams: methodParams,
              callParams: arguments
            });
          }
        return encodeAbiResult;
      },
      estimateGas: function () {
        return estimatedGas;
      }
    };
  };
}

module.exports = {
  stubContractMethodResult: stubContractMethodResult,
}


const _ = require('lodash');

/**
 * Takes bundled data for a hotel call and executes it through the WTIndex callHotel method.
 * @param  {String} data    hex string: output of `instance.method.xyz().encodeABI()`
 * @param  {Number} index   position of hotel in the WTIndex registry
 * @param  {Object} context Hotel class context
 * @param  {Object} callbacks   object with callback functions
 * @return {Promievent} or options object
 */
async function execute(web3, utils, data, WTIndexInstance, owner, index, gasMargin, callbacks) {
  const callData = await WTIndexInstance.methods
    .callHotel(index, data)
    .encodeABI();

  const options = {
    from: owner,
    to: WTIndexInstance.options.address,
    data: callData,
    nonce: await web3.eth.getTransactionCount(owner, 'pending')
  };

  const estimate = await web3.eth.estimateGas(options);
  options.gas = await utils.addGasMargin(estimate, gasMargin);

  if(callbacks) {
    return web3.eth.sendTransaction(options)
      .once('transactionHash', callbacks.transactionHash)
      .once('receipt', callbacks.receipt)
      .on('error', callbacks.error);
  }

  return await web3.eth.sendTransaction(options);
}

module.exports = function (web3, utils) {
  return {
    execute: _.partial(execute, web3, utils),
  }
}
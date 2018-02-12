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

/**
  Decodes the method called for a single TX
*/
async function decodeTxInput(web3, utils, contracts, txHash, indexAddress, walletAddress) {
  let wtIndex = contracts.getIndexInstance(indexAddress);
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let hotelInstances = [];

  let tx = await web3.eth.getTransaction(txHash);
  let txData = {hash: txHash};
  txData.status = tx.blockNumber ? 'mined' : 'pending';
  let method = contracts.abiDecoder.decodeMethod(tx.input);
  if(method.name == 'callHotel') {
    let hotelIndex = method.params.find(call => call.name === 'index').value;
    txData.hotel = hotelsAddrs[hotelIndex];
    method = contracts.abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
    if(method.name == 'callUnitType' || method.name == 'callUnit') {
      method = contracts.abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
    }
    if(method.name == 'continueCall') {
      let msgDataHash = method.params.find(call => call.name === 'msgDataHash').value;
      if(!hotelInstances[txData.hotel]) {
        hotelInstances[txData.hotel] = await contracts.getContractInstance('Hotel', txData.hotel);
      }
      let publicCallData = await hotelInstances[txData.hotel].methods.getPublicCallData(msgDataHash).call();
      method = contracts.abiDecoder.decodeMethod(publicCallData);
      if(method.name == 'bookWithLif') {
        method.name = 'confirmLifBooking';
        let receipt = await web3.eth.getTransactionReceipt(tx.hash);
        txData.lifAmount = contracts.abiDecoder.decodeLogs(receipt.logs).find(log => log.name == 'Transfer').events.find(e => e.name == 'value').value
      }
      if(method.name == 'book') {
        method.name = 'confirmBooking';
      }
    }
  }
  if(method.name == 'beginCall') {
    method = contracts.abiDecoder.decodeMethod(method.params.find(call => call.name === 'publicCallData').value);
    if(method.name == 'book') method.name = 'requestToBook';
    if(method.name == 'bookWithLif') method.name = 'requestToBookWithLif';
    txData.hotel = tx.to;
  }
  method.name = utils.splitCamelCaseToString(method.name);
  txData.method = method;
  return txData;
}


module.exports = function (web3, utils, contracts) {
  return {
    execute: _.partial(execute, web3, utils),
    decodeTxInput: _.partial(decodeTxInput, web3, utils, contracts),
  }
}
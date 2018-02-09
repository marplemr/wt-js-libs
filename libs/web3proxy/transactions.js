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

//modified version of https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
//only used for testing getDecodedTransactions locally
async function getTransactionsByAccount(myaccount, startBlockNumber, endBlockNumber, web3) {
  if (endBlockNumber == null) {
    endBlockNumber = await web3.eth.getBlockNumber();
  }
  if (startBlockNumber == null) {
    startBlockNumber = endBlockNumber - 1000;
  }
  let txs = [];
  for (var i = startBlockNumber; i <= endBlockNumber; i++) {
    var block = await web3.eth.getBlock(i, true);
    if (block != null && block.transactions != null) {
      block.transactions.forEach( function(e) {
        if (myaccount == e.from) {
          e.timeStamp = block.timestamp;
          txs.push(e);
        }
      })
    }
  }
  return txs;
}

/**
  Decodes the method called for a single TX
*/
async function decodeTxInput(txHash, indexAddress, walletAddress, web3) {
  let wtIndex = getInstance('WTIndex', indexAddress, {web3: web3});
  let hotelsAddrs = await wtIndex.methods
      .getHotelsByManager(walletAddress)
      .call();
  let hotelInstances = [];

  let tx = await web3.eth.getTransaction(txHash);
  let txData = {hash: txHash};
  txData.status = tx.blockNumber ? 'mined' : 'pending';
  let method = abiDecoder.decodeMethod(tx.input);
  if(method.name == 'callHotel') {
    let hotelIndex = method.params.find(call => call.name === 'index').value;
    txData.hotel = hotelsAddrs[hotelIndex];
    method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
    if(method.name == 'callUnitType' || method.name == 'callUnit') {
      method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'data').value);
    }
    if(method.name == 'continueCall') {
      let msgDataHash = method.params.find(call => call.name === 'msgDataHash').value;
      if(!hotelInstances[txData.hotel]) {
        hotelInstances[txData.hotel] = await getInstance('Hotel', txData.hotel, {web3: web3});
      }
      let publicCallData = await hotelInstances[txData.hotel].methods.getPublicCallData(msgDataHash).call();
      method = abiDecoder.decodeMethod(publicCallData);
      if(method.name == 'bookWithLif') {
        method.name = 'confirmLifBooking';
        let receipt = await web3.eth.getTransactionReceipt(tx.hash);
        txData.lifAmount = abiDecoder.decodeLogs(receipt.logs).find(log => log.name == 'Transfer').events.find(e => e.name == 'value').value
      }
      if(method.name == 'book') {
        method.name = 'confirmBooking';
      }
    }
  }
  if(method.name == 'beginCall') {
    method = abiDecoder.decodeMethod(method.params.find(call => call.name === 'publicCallData').value);
    if(method.name == 'book') method.name = 'requestToBook';
    if(method.name == 'bookWithLif') method.name = 'requestToBookWithLif';
    txData.hotel = tx.to;
  }
  method.name = splitCamelCaseToString(method.name);
  txData.method = method;
  return txData;
}


module.exports = function (web3, utils) {
  return {
    execute: _.partial(execute, web3, utils),
  }
}
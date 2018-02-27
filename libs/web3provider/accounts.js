const _ = require('lodash');

/**
 * Funds an account
 * @param  {Address} from
 * @param  {Address} to   
 * @param  {Number} amount  Lif 'ether'
 * @return {Promise}        Transaction
 */
async function fundAccount(web3, from, to, amount) {
  return web3.eth.sendTransaction({
    from: from,
    to: to,
    value: web3.utils.toWei(amount, 'ether')
  });
};

/**
 * Send tokens from one address to another
 * @param  {Instance} tokenInstance
 * @param  {Address}  sender
 * @param  {Address}  recipient
 * @param  {Number}   value     Lif 'ether'
 * @return {Promise}
 */
async function sendTokens(web3, utils, tokenInstance, sender, recipient, value) {
  const amount = utils.lif2LifWei(value);

  return await tokenInstance.methods
        .transfer(recipient, amount)
        .send({from: sender});
}

module.exports = function (web3, utils) {
  return {
      fundAccount: _.partial(fundAccount, web3),
      sendTokens: _.partial(sendTokens, web3, utils),
  }
};
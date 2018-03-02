const Token = require('./token');

/**
 * Test fixture that creates a LifToken, a WTIndex whose owner is `accounts[0]`, and funds four
 * wallet accounts with 50 ETH (for gas fees). `wallet["0"]` creates the index and is meant
 * to represent the dao. Additionally, `wallets["1-3"]` are funded with 500 Lif for bookings payments.
 * This method is  meant to be run once in the `before` block of any suite that needs
 * HotelManagers and clients.
 * @param  {Array}  accounts  `web3.eth.accounts`
 * @param  {Object} web3      web3 instance
 * @return {Object}
 * @example
 * const accounts = await web3.eth.getAccounts();
 * const {
 *   index,  // WTIndex instance
 *   token,  // LifToken instance (it's address is registered with the `index`)
 *   wallet, // web3.eth.accounts.wallet w/ 4 accounts. (See above)
 * } = await help.createWindingTreeEconomy(accounts)
 */
async function createWindingTreeEconomy (accounts, web3provider) {
  const defaultGas = 400000;
  const wallet = await web3provider.web3.eth.accounts.wallet.create(4);
  const fundingSource = accounts[0];

  await web3provider.accounts.fundAccount(fundingSource, wallet['0'].address, '50');
  await web3provider.accounts.fundAccount(fundingSource, wallet['1'].address, '50');
  await web3provider.accounts.fundAccount(fundingSource, wallet['2'].address, '50');
  await web3provider.accounts.fundAccount(fundingSource, wallet['3'].address, '50');

  const index = await web3provider.deploy.deployIndex(wallet['0'].address, 1.5);

  const token = await Token.runTokenGenerationEvent(web3provider);

  const setLifData = await index.methods
    .setLifToken(token.options.address)
    .encodeABI();

  const setLifOptions = {
    from: wallet['0'].address,
    to: index.options.address,
    gas: defaultGas,
    data: setLifData,
  };

  await web3provider.web3.eth.sendTransaction(setLifOptions);

  await web3provider.accounts.sendTokens(token, fundingSource, wallet['1'].address, '500');
  await web3provider.accounts.sendTokens(token, fundingSource, wallet['2'].address, '500');
  await web3provider.accounts.sendTokens(token, fundingSource, wallet['3'].address, '500');

  return {
    index: index,
    token: token,
    wallet: wallet,
  };
}

module.exports = {
  createWindingTreeEconomy: createWindingTreeEconomy,
};

const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const sinon = require('sinon');

const request = require('superagent');
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);
const web3providerFactory = require('../src/web3provider');

describe('web3provider', function () {
  let web3provider;

  beforeEach(function () {
    web3provider = web3providerFactory.getInstance(web3);
  });
  
  describe('data', function () {
    const walletAddress = 'my-address';
    const startBlock = 0;
    let requestGetStub, queryStub, getBlockNumberStub;

    beforeEach(() => {
      queryStub = sinon.stub().resolves({ body: { result: 'txResult' } });
      requestGetStub = sinon.stub(request, 'get').returns({
        query: queryStub,
      });
      sinon.stub(web3provider.web3.eth, 'getBlock').resolves(null);
      getBlockNumberStub = sinon.stub(web3provider.web3.eth, 'getBlockNumber').resolves(0);
    });

    afterEach(() => {
      request.get.restore();
      web3provider.web3.eth.getBlock.restore();
      web3provider.web3.eth.getBlockNumber.restore();
    });

    it('should call etherscan for kovan', async () => {
      let txs = await web3provider.data._getRawTxs('kovan', walletAddress, startBlock);
      assert.equal(requestGetStub.callCount, 1);
      assert.equal(queryStub.callCount, 1);
      assert.equal(txs, 'txResult');
      assert.equal(requestGetStub.firstCall.args[0], 'https://kovan.etherscan.io/api');
      assert.equal(queryStub.firstCall.args[0].address, walletAddress);
      assert.equal(queryStub.firstCall.args[0].startBlock, startBlock);
      assert.equal(getBlockNumberStub.callCount, 0);
    });

    it('should call etherscan for ropsten', async () => {
      let txs = await web3provider.data._getRawTxs('ropsten', walletAddress, startBlock);
      assert.equal(requestGetStub.callCount, 1);
      assert.equal(queryStub.callCount, 1);
      assert.equal(txs, 'txResult');
      assert.equal(requestGetStub.firstCall.args[0], 'https://ropsten.etherscan.io/api');
      assert.equal(queryStub.firstCall.args[0].address, walletAddress);
      assert.equal(queryStub.firstCall.args[0].startBlock, startBlock);
      assert.equal(getBlockNumberStub.callCount, 0);
    });

    it('should call etherscan for rinkeby', async () => {
      let txs = await web3provider.data._getRawTxs('rinkeby', walletAddress, startBlock);
      assert.equal(requestGetStub.callCount, 1);
      assert.equal(queryStub.callCount, 1);
      assert.equal(txs, 'txResult');
      assert.equal(requestGetStub.firstCall.args[0], 'https://rinkeby.etherscan.io/api');
      assert.equal(queryStub.firstCall.args[0].address, walletAddress);
      assert.equal(queryStub.firstCall.args[0].startBlock, startBlock);
      assert.equal(getBlockNumberStub.callCount, 0);
    });

    it('should call etherscan for main', async () => {
      let txs = await web3provider.data._getRawTxs('main', walletAddress, startBlock);
      assert.equal(requestGetStub.callCount, 1);
      assert.equal(queryStub.callCount, 1);
      assert.equal(txs, 'txResult');
      assert.equal(requestGetStub.firstCall.args[0], 'https://etherscan.io/api');
      assert.equal(queryStub.firstCall.args[0].address, walletAddress);
      assert.equal(queryStub.firstCall.args[0].startBlock, startBlock);
      assert.equal(getBlockNumberStub.callCount, 0);
    });

    it('should search block if network is not on etherscan', async () => {
      await web3provider.data._getRawTxs('private', walletAddress, startBlock);
      assert.equal(requestGetStub.callCount, 0);
      assert.equal(queryStub.callCount, 0);
      assert.equal(getBlockNumberStub.callCount, 1);
    });
  });
});

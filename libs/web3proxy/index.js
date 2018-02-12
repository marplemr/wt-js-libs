const accounts = require('./accounts');
const contracts = require('./contracts');
const utils = require('./utils');
const data = require('./data');
const deploy = require('./deploy');
const transactions = require('./transactions');

const getInstance = function (web3) {
    if (! web3) {
        throw new Error("Uninitialized web3 proxy");
    }
    const initializedContracts = contracts(web3);
    const initializedUtils = utils(web3);
    return {
        // TODO web3 won't be exposed in the end
        web3: web3,
        accounts: accounts(web3, initializedUtils),
        utils: initializedUtils,
        contracts: initializedContracts,
        data: data(web3, initializedUtils, initializedContracts),
        deploy: deploy(web3, initializedUtils, initializedContracts),
        transactions: transactions(web3, initializedUtils, initializedContracts),
    }
};

module.exports = {
    getInstance: getInstance,
};
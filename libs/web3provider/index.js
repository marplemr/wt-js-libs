const accounts = require('./accounts');
const contracts = require('./contracts');
const utils = require('./utils');
const data = require('./data');
const deploy = require('./deploy');
const transactions = require('./transactions');
const errors = require('./errors');

const getInstance = function (web3) {
    if (! web3) {
        throw new Error("Uninitialized web3 proxy");
    }
    const initializedContracts = contracts(web3);
    const initializedUtils = utils(web3);
    return {
        web3: web3,
        accounts: accounts(web3, initializedUtils),
        errors: errors,
        utils: initializedUtils,
        contracts: initializedContracts,
        data: data(web3, initializedUtils, initializedContracts),
        deploy: deploy(web3, initializedUtils, initializedContracts),
        transactions: transactions(web3, initializedUtils),
    }
};

module.exports = {
    getInstance: getInstance,
};
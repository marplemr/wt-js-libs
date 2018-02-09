const _ = require('lodash');
const utf8 = require('utf8');
const moment = require('moment');
const currencyCodes = require('currency-codes');

const testnetId = 77;
const defaultGas = 4700000;
const zeroBytes8 = '0x0000000000000000';
const zeroAddress = '0x0000000000000000000000000000000000000000';
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Returns the date from a single integer in format DD/MM/YYYY
function parseDate(date) {
  return moment([1970, 0, 1]).add(date, 'days').toDate();
};

// Returns the date formatted in days since 1970 0 1
function formatDate(date) {
  return Math.round(new Date(date).getTime()/86400000);
};

function isZeroBytes8(val) {
  return val === zeroBytes8;
}

function isZeroBytes32(val) {
  return val === zeroBytes32;
};

function isZeroAddress(val) {
  return val === zeroAddress;
};

function isZeroString(val) {
  return (val.length) ? false : true;
};

function isZeroUint(val) {
  return parseInt(val) === 0;
};

function isInvalidOpcodeEx(e) {
  return e.message.search('invalid opcode') >= 0;
};

function priceToUint(price) {
  return price.toFixed(2) * 100;
}

function bnToPrice(uint) {
  uint = (typeof uint === 'Object') ? uint.toNumber() : uint;
  return (uint/100).toFixed(2);
}

function locationToUint(longitude, latitude) {
  return {
    long : Math.round((90 + longitude) * 10e5),
    lat: Math.round((180 + latitude) * 10e5),
  }
};

function locationFromUint(longitude, latitude) {
  latitude = parseInt(latitude);
  longitude = parseInt(longitude);
  return {
    lat: parseFloat((latitude - (180 * 10e5)) / 10e5).toFixed(6),
    long: parseFloat((longitude - (90 * 10e5)) / 10e5).toFixed(6)
  }
};

function bytes32ToString(hex) {
  var str = "";
  var i = 0, l = hex.length;
  if (hex.substring(0, 2) === '0x') {
      i = 2;
  }
  for (; i < l; i+=2) {
      var code = parseInt(hex.substr(i, 2), 16);
      if (code === 0)
          break;
      str += String.fromCharCode(code);
  }

  return utf8.decode(str);
};

function splitCamelCaseToString(s) {
  return s.split(/(?=[A-Z])/).map(function(p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
};

/**
 * Traverses a solidity array and returns an array of all its non-zero elements
 * @param {Function} getAtIndex reference to a getter method (e.g. getImage)
 * @param {Number}   length solidity array's length
 * @param {Function} zeroComparator e.g isZeroAddress
 * @return {Promise} Array
 */
async function jsArrayFromSolidityArray(getAtIndex, length, zeroComparator) {
  const arr = [];

  for (let i = 0; i < length; i++){
    let item = await getAtIndex(i).call();
    arr.push(item)
  };

  return (zeroComparator !== undefined)
    ? arr.filter(item => !zeroComparator(item))
    : arr;
}

function currencyCodeToHex(web3, code) {
  if (typeof code !== 'number')
    throw new Error();

  const hex = web3.utils.toHex(code);
  return web3.utils.padLeft(hex, 16);
}

function lifWei2Lif(web3, value) {
  return web3.utils.fromWei(value, 'ether');
};

function lif2LifWei(web3, value) {
  return web3.utils.toWei(''+value, 'ether');
};

async function addGasMargin(web3, gas, gasMargin) {
  const id = await web3.eth.net.getId();
  return (id === testnetId)
    ? defaultGas
    : Math.round(gas * gasMargin);
}

module.exports = function (web3) {
  return {
    parseDate: parseDate,
    formatDate: formatDate,
    zeroAddress: zeroAddress,
    zeroBytes8: zeroBytes8,
    zeroBytes32: zeroBytes32,
    isZeroBytes8: isZeroBytes8,
    isZeroBytes32: isZeroBytes32,
    isZeroAddress: isZeroAddress,
    isZeroString: isZeroString,
    isZeroUint: isZeroUint,
    isInvalidOpcodeEx: isInvalidOpcodeEx,
    lifWei2Lif: _.partial(lifWei2Lif, web3),
    lif2LifWei: _.partial(lif2LifWei, web3),
    currencyCodes: currencyCodes,
    currencyCodeToHex: _.partial(currencyCodeToHex, web3),
    priceToUint: priceToUint,
    bnToPrice: bnToPrice,
    bytes32ToString: bytes32ToString,
    locationToUint: locationToUint,
    locationFromUint: locationFromUint,
    addGasMargin: _.partial(addGasMargin, web3),
    jsArrayFromSolidityArray: jsArrayFromSolidityArray,
  }
}

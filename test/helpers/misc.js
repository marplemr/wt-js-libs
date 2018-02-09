const _ = require('lodash');

/**
 * Generates a random string of len `length`
 * @param  {Number} length
 * @return {String}        random alpha-numeric id
 */
function randomString(length){
  let text = "";
  const char_list = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const range = _.range(0, length);
  for (let index of range){
    text += char_list.charAt(Math.floor(Math.random() * char_list.length));
  }
  return text;
}

module.exports = {
  randomString: randomString,
}


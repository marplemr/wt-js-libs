/**
 * Generates a random string of len `length`
 * @param  {Number} length
 * @return {String}        random alpha-numeric id
 */
function randomString (length) {
  let text = '';
  const charList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  while (text.length <= length) {
    text += charList.charAt(Math.floor(Math.random() * charList.length));
  }
  return text;
}

module.exports = {
  randomString: randomString,
};

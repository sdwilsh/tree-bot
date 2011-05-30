var fs = require("fs");

var committers = JSON.parse(fs.readFileSync('committers.json', 'utf8'));
exports.lookup = function lookup(email, certain, guess)
{
  if (committers.hasOwnProperty(email)) {
    return certain(committers[email]);
  }
  var guessMatch = /(.+)@(.+)/.exec(email);
  if (guessMatch) {
    return guess(guessMatch[1]);
  }
  return guess(undefined);
}



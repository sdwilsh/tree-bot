var kDatabase = 'committers.json';
var config = require("./jsondb")(kDatabase);

var committers = config.db;

exports.lookup = function lookup(email, certain, guess)
{
  if (committers.hasOwnProperty(email)) {
    return certain(committers[email]);
  }
  var guessMatch = /([A-Za-z0-9]+)@(.+)/.exec(email);
  if (guessMatch) {
    return guess(guessMatch[1]);
  }
  return guess(undefined);
};

exports.add = function add(email, nick) {
  committers[email] = nick;
  config.markDirty();
};

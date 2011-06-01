var fs = require("fs");

var kDatabase = 'committers.json';

var committers = JSON.parse(fs.readFileSync(kDatabase, 'utf8'));
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

var saveInProgress = false;
var dbDirty = false;

function saveDatabase() {
  saveInProgress = true;
  var count = Object.keys(committers).length;
  fs.writeFile(kDatabase, JSON.stringify(committers), 'utf8', function (err) {
    if (err) {
      console.error("Got error trying to save committer database: " + e);
    } else {
      console.log("Saved new version of committers database with " + count + " entries");
    }
    saveInProgress = false;
    if (dbDirty) {
      saveDatabase();
    }
  });
  dbDirty = false;
}

exports.add = function add(email, nick) {
  committers[email] = nick;
  dbDirty = true;
  if (saveInProgress)
    return;
  saveDatabase();
};

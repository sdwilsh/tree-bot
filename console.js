var channels = require("./channels");
var updater = require("./updater");
var session = require("./sessionrestore");

var kChannelName = '<console>';

updater.restart = function () {
  console.log("It's less awkward if I just exit");
  process.exit()
}

var backend = {
  say: console.log,
  pm: console.log,
  isAuthorizedUser: function (who) { return true; },
  channelStateChanged: session.updateChannelState.bind(session, kChannelName),
};

session.restore(function (name, cb) {
  if (name === kChannelName) {
    return cb(backend);
  }
});

var channel = channels.get(kChannelName);
if (channel === undefined) {
  channel = channels.add(kChannelName, backend);
}

process.stdin.resume();
process.stdin.on('data', function (text) {
  channel.handleCommand('', text.toString('utf8').trim());
});


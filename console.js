var channels = require("./channels");
var updater = require("./updater");
updater.restart = function () {
  console.log("It's less awkward if I just exit");
  process.exit()
}

var channel = channels.add('<console>', {
  say: console.log,
  pm: console.log,
  isAuthorizedUser: function (who) { return true; }
});
process.stdin.resume();
process.stdin.on('data', function (text) {
  channel.handleCommand('', text.toString('utf8').trim());
});


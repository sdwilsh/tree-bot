var irc = require("irc");
var channels = require("./channels");
var updater = require("./updater");

var mode = 'irc';
if (process.argv.length > 2)
  mode = process.argv[2];
if (mode === 'console') {
  updater.restart = function () {
    console.log("It's less awkward if I just exit");
    process.exit()
  }
  // Console channel
  var consoleChannel = channels.add('<console>', console.log);
  process.stdin.resume();
  process.stdin.on('data', function (text) {
    consoleChannel.handleCommand('', text.toString('utf8').trim());
  });
  return;
}

// Connect to IRC
var kNick = 'afrosdwilsh';
var kAuthorizedUsers = [
  'sdwilsh', 'robarnold'
];

function isAuthorizedUser(user) {
  return kAuthorizedUsers.indexOf(user) !== -1;
}

var client = new irc.Client("irc.mozilla.org", kNick, {
  userName: kNick,
  realName: "Permasheriff Extraordinaire",
  channels: [],
  secure: true,
  port: 6697
});

updater.restart = function () {
  client.disconnect("Updating...hopefully don't need metaafrosdwilsh");
  require("child_process").spawn('node', [__filename], { customFds: [0, 1, 2] });
  process.exit();
};

client.on("invite", function (channel, from) {
  if (isAuthorizedUser(from)) {
    // TODO: solve race condition here
    client.join(channel, function () {
      var backend = {
        say: client.say.bind(client, channel),
        pm: client.say.bind(client),
        isAuthorizedUser: isAuthorizedUser
      };
      channels.add(channel, backend);
    });
  }
});
client.addListener("error", function(m) {
  console.error(m);
});
client.addListener("message", function(from, to, message) {
  var channel = channels.get(to);

  if (channel === undefined)
    return;

  var match = /(.+): (.*)/.exec(message);
  if (match) {
    target = match[1];
    text = match[2];

    if (target === kNick) {
      channel.handleCommand(from, text);
    }
  }
});

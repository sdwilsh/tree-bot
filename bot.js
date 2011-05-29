var irc = require("irc");
var format = require("./format");
var reporter = require("./reporter");
var builds = require("./builds");
var welshify = require("./welshify");
var mehdify = require("./mehdify");

function interceptFormat(interceptor, originalfn)
{
  return function () {
    var args = arguments;
    interceptor(args[0], function (fmt) {
      args[0] = fmt;
      originalfn.apply(null, args);
    });
  };
}

function say()
{
  var text = format.apply(null, arguments);
  client.say(kChannels[0], text);
}

var interceptors = [
  { 'chance' : 0.01, 'fn' : welshify },
  { 'chance' : 0.10, 'fn' : mehdify },
];

function chooseCallbackFunction()
{
  var chance = Math.random();
  var fn = undefined;
  for (var i = 0; i < interceptors.length; i++) {
    if (interceptors[i].chance < chance) {
      fn = interceptors[i].fn;
      break;
    }
    chance -= interceptors[i].chance;
  }
  if (fn === undefined) {
    return say;
  } else {
    return interceptFormat(fn, say);
  }
}

function makeReporter(reporter)
{
  return function (event) {
    var cb = chooseCallbackFunction();
    reporter(cb, event);
  }
}

var watcher = new builds.Watcher();
watcher.on("success", makeReporter(reporter.success));
watcher.on("warning", makeReporter(reporter.warning));
watcher.on("failure", makeReporter(reporter.failure));

var kChannels = [
  "#afrosdwilsh",
];

var client = new irc.Client("irc.mozilla.org", "afrosdwilsh", {
  debug: true,
  channels: kChannels,
});

client.addListener("error", function(m) {
  console.error(m);
});
client.addListener("message", function(from, to, message) {
  var action = /ACTION (.+)/.exec(message);
  if (action) {
    console.log(" * " + from + " " + action[1]);
  }
  else {
    console.log("<" + from + "> " + message);
  }
});

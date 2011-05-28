var irc = require("irc");
var translate = require("translate");
var format = require("./format");
var reporter = require("./reporter");
var builds = require("./builds");

var kWelshChance = 0.01;

function welshify(text, callback)
{
  translate.text({input:'English',output:'Welsh'}, text, function (err, result) {
    callback(err ? text : result);
  });
}

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

function makeReporter(reporter)
{
  return function (event) {
    var cb = say;
    if (Math.random() < kWelshChance) {
      cb = interceptFormat(welshify, cb);
    }
    reporter(cb, event);
  }
}

builds.on("success", makeReporter(reporter.success));
builds.on("warning", makeReporter(reporter.warning));
builds.on("failure", makeReporter(reporter.failure));

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

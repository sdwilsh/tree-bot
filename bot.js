var irc = require("irc");
var format = require("./format");
var reporter = require("./reporter");
var builds = require("./builds");
var welshify = require("./welshify");
var mehdify = require("./mehdify");
var randompicker = require("./randompicker");

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

function say (channel)
{
  var text = format.apply(null, Array.prototype.slice.call(arguments, 1));
  client.say(channel, text);
}

var interceptors = [
  { 'chance' : 0.01, 'fn' : welshify },
  { 'chance' : 0.10, 'fn' : mehdify },
];

function chooseCallbackFunction(origfn)
{
  var fn = randompicker(interceptors, 'fn');
  if (fn === undefined) {
    return orignfn;
  } else {
    return interceptFormat(fn, origfn);
  }
}

function Channel(name) {
  var self = this;
  this.name = name;
  this.trees = {};
  this.say = say.bind(this, name);
}

Channel.prototype = {
  watch: function (name) {
    if (this.trees.hasOwnProperty(name))
      return;
    var tree = this.trees[name] = new builds.Watcher(tree);
    tree.on("success", this.makeReporter(reporter.success));
    tree.on("warning", this.makeReporter(reporter.warning));
    tree.on("failure", this.makeReporter(reporter.failure));
  },
  makeReporter: function (reporter) {
    var fn = this.say;
    return function (event) {
      var cb = chooseCallbackFunction(fn);
      reporter(cb, event);
    }
  }
};

var kAuthorizedUsers = [
  'sdwilsh', 'robarnold'
];

var channels = {};
function addChannel(name) {
  if (channels.hasOwnProperty(name))
    return;
  var channel = channels[name] = new Channel(name);
  client.join(name, function () {
    reporter.greet(channel.say);
    channel.watch('try');
    channel.watch('mozilla-central');
  });
}

var client = new irc.Client("irc.mozilla.org", "afrosdwilsh", {
  debug: true,
  userName: "afrosdwilsh",
  realName: "Permasheriff Extraordinaire",
  channels: [],
});

client.on("invite", function (channel, from) {
  if (kAuthorizedUsers.indexOf(from) !== -1) {
    addChannel(channel);
  }
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

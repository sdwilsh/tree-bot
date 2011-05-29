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
    if (args[0] === "")
      return;
    interceptor(args[0], function (fmt) {
      args[0] = fmt;
      originalfn.apply(null, args);
    });
  };
}

function prepend(text)
{
  return function (orig, cb) {
    cb(text + orig);
  };
}

var interceptors = [
  { 'chance' : 0.01, 'fn' : welshify },
  { 'chance' : 0.10, 'fn' : mehdify },
];

function chooseCallbackFunction(origfn)
{
  var fn = randompicker(interceptors, 'fn');
  if (fn === undefined) {
    return origfn;
  } else {
    return interceptFormat(fn, origfn);
  }
}

function Channel(name, output) {
  this.name = name;
  this.trees = {};
  this.say = function () {
    var text = format.apply(null, arguments);
    if (text !== "")
      output(text);
  };
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
  },
  tell: function (person) {
    var self = this;
    return function () {
      var cb = chooseCallbackFunction(self.say);
      cb = interceptFormat(prepend(person + ": "), cb);
      cb.apply(self, arguments);
    };
  },
  handleCommand: function (from, text) {
    var self = this;
    function tryCommand(matcher, cb) {
      var match = matcher.exec(text);
      if (match) {
        cb.apply(self, Array.prototype.slice.call(match, 1));
      }
      return match != null;
    }
    tryCommand(/^watch (.+)$/, this.watch);
  }
};

var kNick = 'afrosdwilsh';
var kAuthorizedUsers = [
  'sdwilsh', 'robarnold'
];

var channels = {};
function addChannel(name) {
  if (channels.hasOwnProperty(name))
    return;
  var channel = channels[name] = new Channel(name, client.say.bind(client, name));
  client.join(name, function () {
    reporter.greet(channel.say);
  });
}

var client = new irc.Client("irc.mozilla.org", kNick, {
  debug: true,
  userName: kNick,
  realName: "Permasheriff Extraordinaire",
  channels: [],
  secure: true,
  port: 6697
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
  if (!channels.hasOwnProperty(to))
    return;

  var channel = channels[to];
  var match = /(.+): (.*)/.exec(message);
  if (match) {
    target = match[1];
    text = match[2];

    if (target === kNick) {
      channel.handleCommand(from, text);
    }
  }
});

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
  this.controller = new ChannelController(this);
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
      if (person !== '')
        cb = interceptFormat(prepend(person + ": "), cb);
      cb.apply(self, arguments);
    };
  },
  handleCommand: function (from, text) {
    this.controller.handleCommand(from, text);
  }
};

function ChannelController(channel)
{
  this.channel = channel;
}

ChannelController.prototype = {
  watch: function (from, tree) {
    this.channel.watch(tree);
    this.channel.tell(from)("Now watching {0}", tree);
  },
  handleCommand: function (from, text) {
    var self = this;
    function tryCommand(matcher, cb) {
      var match = matcher.exec(text);
      if (match) {
        Array.prototype.splice.call(match, 0, 1, from);
        cb.apply(self, match);
      }
      return match != null;
    }
    tryCommand(/^watch (.+)$/, this.watch);
  }
};

var channels = {};
exports.add = function (name, output) {
  var channel = channels[name] = new Channel(name, output);
  reporter.greet(channel.say);
  return channel;
};

exports.has = function (name) {
  return channels.hasOwnProperty(name);
};

exports.get = function (name) {
  if (!channels.hasOwnProperty(name))
    return undefined;
  return channels[name];
};

var format = require("./format");
var reporter = require("./reporter");
var builds = require("./builds");
var welshify = require("./welshify");
var mehdify = require("./mehdify");
var randompicker = require("./randompicker");
var committers = require("./committers");
var textutils = require("./textutils");
var TemporalCache = require("./temporalcache");

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
    var tree = this.trees[name] = {
      watcher: new builds.Watcher(tree),
      success: this._treeStatusCallback.bind(this, name, 'success', reporter.success),
      warning: this._treeStatusCallback.bind(this, name, 'warning', reporter.warning),
      failure: this._treeStatusCallback.bind(this, name, 'failure', reporter.failure),
      reportStatus: new TemporalCache(),
    };
    tree.watcher.on("success", tree.success);
    tree.watcher.on("warning", tree.warning);
    tree.watcher.on("failure", tree.failure);
  },
  _treeStatusCallback: function (name, type, reporter, event) {
    var cb = chooseCallbackFunction(this.say);
    var tree = this.trees[name];
    if (tree === undefined)
      return;
    var status = tree.reportStatus.get(event.rev);
    if (status === undefined || event.result > status) {
      // Remember status for 4 hours
      tree.reportStatus.add(event.rev, event.result, 12);
      reporter(cb, event);
    }
  },
  unwatch: function (name) {
    if (!this.trees.hasOwnProperty(name))
      return;
    var tree = this.trees[name];
    tree.watcher.removeListener("success", tree.success);
    tree.watcher.removeListener("warning", tree.warning);
    tree.watcher.removeListener("failure", tree.failure);
    delete this.trees[name];
  },
  tell: function (person) {
    var self = this;
    return function () {
      var cb = chooseCallbackFunction(self.say);
      if (person !== '')
        cb = interceptFormat(textutils.prepend(person + ": "), cb);
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
    var trees = textutils.naturalJoin(Object.keys(this.channel.trees));
    this.channel.tell(from)("Now watching: {0}", trees);
  },
  unwatch: function (from, tree) {
    this.channel.unwatch(tree);
    this.channel.tell(from)("No longer watching {0}", tree);
  },
  identify: function (from, email, name) {
    // Identity is reflexive, canonicalize order if necessary
    if (/(.+)@(.+)/.test(name)) {
      var tmp = name;
      name = email;
      email = tmp;
    }
    committers.add(email, name);
    this.channel.tell(from)("thank you!");
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
    tryCommand(/^unwatch (.+)$/, this.unwatch);
    tryCommand(/^(.+) is (.+)$/, this.identify);
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

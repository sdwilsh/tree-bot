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

function fprintf(output)
{
  return function () {
    var text = format.apply(null, arguments);
    if (text !== "")
      output(text);
  }
}

function Channel(name, backend) {
  this.name = name;
  this.trees = {};
  this.watches = new TemporalCache();
  if (typeof backend ==='function') {
    backend = {
      say: backend,
      pm: backend
    };
  }
  this.backend = backend;
  this.say = fprintf(backend.say);
  this.pm = function (who) {
    var output = backend.pm.bind(backend, who);
    return fprintf(output);
  };
  this.controller = new ChannelController(this);
}

Channel.prototype = {
  watch: function (name) {
    if (this.trees.hasOwnProperty(name))
      return;
    var tree = this.trees[name] = {
      watcher: new builds.Watcher(name),
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
      // Remember status for 12 hours
      tree.reportStatus.add(event.rev, event.result, 12);
      reporter(cb, event);
    }
  },
  watchChangeset: function (treeName, rev, who) {
    var key = treeName+rev+who;
    var cb = this.pm(who);
    var watcher = new builds.Watcher(treeName);
    // Do individual success reports matter?
    //watcher.on("success", reporter.success.bind(reporter, cb));
    watcher.on("warning", reporter.warning.bind(reporter, cb));
    watcher.on("failure", reporter.failure.bind(reporter, cb));
    // Watch for 12 hours - then no more
    this.watches.add(key, watcher, 12);
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
  watchTree: function (from, rev, tree, who) {
    if (who === undefined) {
      this.channel.watchChangeset(tree, rev, from);
      this.channel.tell(from)("I'll let you know if {0} burns {1}", rev, tree);
    } else {
      if (who === 'me') {
        who = from;
      }
      this.channel.watchChangeset(tree, rev, who);
      this.channel.tell(from)("I'll let {2} know if {0} burns {1}", rev, tree, who);
    }
  },
  identify: function (from, email, name) {
    // Identity is reflexive, canonicalize order if necessary
    if (/(.+)@(.+)/.test(name)) {
      var tmp = name;
      name = email;
      email = tmp;
    }
    if (name === 'me' || name === 'I')
      name = from;
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
    tryCommand(/^watch ([A-Za-z-]+)$/, this.watch);
    tryCommand(/^unwatch (.+)$/, this.unwatch);
    tryCommand(/^(.+) is (.+)$/, this.identify);
    tryCommand(/^(.+) am (.+)$/, this.identify);
    tryCommand(/^watch ([A-Fa-f0-9]{12}) on ([A-Za-z-]+)(?: for (.+))?/, this.watchTree);
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

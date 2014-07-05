var format = require("./format");
var reporter = require("./reporter");
var builds = require("./builds");
var welshify = require("./welshify");
var mehdify = require("./mehdify");
var randompicker = require("./randompicker");
var committers = require("./committers");
var textutils = require("./textutils");
var TemporalCache = require("./temporalcache");
var updater = require("./updater");
var naturaltyping = require("./naturaltyping");
var eliza = require("./eliza");

var kIssueTrackerUrl = 'https://github.com/sdwilsh/tree-bot/issues/new';
var treeNames = require('./jsondb')('treenames.json').db;

var kSession = "session.json";
var sessioninfo = require("./jsondb")(kSession);

function canonicalizeTreeName(name) {
  if (treeNames.hasOwnProperty(name))
    return treeNames[name];
  return name;
}

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

function filterEventsByRev(rev, cb) {
  return function (event) {
    if (event.rev === rev)
      cb(event);
  }
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
  return naturaltyping.type(function () {
    var text = format.apply(null, arguments);
    if (text !== "")
      output(text);
  });
}

function Channel(name, backend) {
  this.name = name;
  this.trees = {};
  this.watches = new TemporalCache();
  this.backend = backend;
  this.say = fprintf(backend.say);
  this.pm = function (who) {
    var output = backend.pm.bind(backend, who);
    return fprintf(output);
  };
  this.controller = new ChannelController(this);
}

Channel.prototype = {
  configDidChange: function () {
    if (this.restoring)
      return;
    // TODO: include changeset watches
    var state = {
      trees: Object.keys(this.trees)
    };
    this.backend.channelStateChanged(state);
  },
  restoring: false,
  restoreState: function (state) {
    this.restoring = true;
    state.trees.forEach(this.watch.bind(this));
    this.restoring = false;
  },
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
    this.configDidChange();
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
    watcher.on("warning", filterEventsByRev(rev, reporter.warning.bind(reporter, cb)));
    watcher.on("failure", filterEventsByRev(rev, reporter.failure.bind(reporter, cb)));
    // Watch for 12 hours - then no more
    this.watches.add(key, watcher, 12, treeName, rev, who);
    this.configDidChange();
  },
  unwatchChangeset: function (treeName, rev, who) {
    var key = treeName+rev+who;
    var isWatching = this.watches.has(key);
    if (isWatching) {
      this.watches.remove(key);
      this.configDidChange();
    }
    return isWatching;
  },
  unwatch: function (name) {
    if (!this.trees.hasOwnProperty(name))
      return false;
    var tree = this.trees[name];
    tree.watcher.removeListener("success", tree.success);
    tree.watcher.removeListener("warning", tree.warning);
    tree.watcher.removeListener("failure", tree.failure);
    delete this.trees[name];
    this.configDidChange();
    return true;
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
  // TODO: allow more than one instance per channel
  this.eliza = new eliza.ElizaBot();
  this.eliza.memSize = 100;
  this.eliza.reset();
}

ChannelController.prototype = {
  watch: function (from, tree) {
    tree = canonicalizeTreeName(tree);
    try {
      this.channel.watch(tree);
      var trees = textutils.naturalJoin(Object.keys(this.channel.trees));
      this.channel.tell(from)("I'm now watching: {0}", trees);
    } catch (e) {
      this.channel.tell(from)("I'm sorry, but I don't know anything about that tree.  If it's real, please file an issue at {0}", kIssueTrackerUrl);
    }
  },
  unwatch: function (from, tree) {
    tree = canonicalizeTreeName(tree);
    if (this.channel.unwatch(tree)) {
      this.channel.tell(from)("I'm longer watching {0}", tree);
    } else {
      this.channel.tell(from)("I wasn't watching {0}", tree);
    }
  },
  watchTree: function (from, rev, tree, who) {
    tree = canonicalizeTreeName(tree);
    try {
      if (who === undefined || who === 'me') {
        this.channel.watchChangeset(tree, rev, from);
        this.channel.tell(from)("I'll let you know if {0} burns {1}", rev, tree);
      } else {
        this.channel.watchChangeset(tree, rev, who);
        this.channel.tell(from)("I'll let {2} know if {0} burns {1}", rev, tree, who);
      }
    } catch (e) {
      this.channel.tell(from)("I'm sorry, but I don't know anything about that tree.  If it's real, please file an issue at {0}", kIssueTrackerUrl);
    }
  },
  unwatchTree: function (from, rev, tree, who) {
    tree = canonicalizeTreeName(tree);
    if (who === undefined || who === 'me') {
      if (this.channel.unwatchChangeset(tree, rev, from)) {
        this.channel.tell(from)("No longer watching if {0} burns {1}", rev, tree);
      } else {
        this.channel.tell(from)("I wasn't watching {0} on {1} for you", rev, tree);
      }
    } else {
      if (this.channel.unwatchChangeset(tree, rev, who)) {
        this.channel.tell(from)("I'll stop letting {2} know if {0} burns {1}", rev, tree, who);
      } else {
        this.channel.tell(from)("I wasn't watching {0} on {1} for {2}", rev, tree, who);
      }
    }
  },
  identify: function (from, email, name) {
    // Identity is reflexive, canonicalize order if necessary
    if (/(.+)@(.+)/.test(name)) {
      var tmp = name;
      name = email;
      email = tmp;
    } else if (!/(.+)@(.+)/.test(email)) {
      // This is not the command they were looking for (likely eliza)
      return false;
    }
    if (name === 'me' || name === 'I')
      name = from;
    committers.add(email, name);
    this.channel.tell(from)("thank you!");
  },
  help: function (from) {
    this.channel.tell(from)("See https://github.com/sdwilsh/tree-bot/blob/master/README for a list of commands");
  },
  version: function (from) {
    this.channel.tell(from)("I am running version {0}", updater.version);
  },
  update: function (from) {
    if (this.channel.backend.isAuthorizedUser(from))
      updater.update(this.channel.tell(from));
  },
  restart: function (from) {
    if (this.channel.backend.isAuthorizedUser(from))
      updater.restart();
  },
  currently: function(from){
    var trees = textutils.naturalJoin(Object.keys(this.channel.trees));
    this.channel.tell(from)("I'm currently watching: {0}", trees);

    this.channel.tell(from)("Listing user-specific watches:");
    var watches = this.channel.watches.show();
    var count = 0;
    for (var x in watches){
      this.channel.tell(from)("* Watching revision {0} for {1} on {2}",watches[x].rev,watches[x].name,watches[x].tree);
      count++;
    }
    if(count == 0){
      this.channel.tell(from)("Not watching any user-specific watches!");
    }else{
      this.channel.tell(from)("...and that's all I'm watching right now.");
    }
  },
  handleCommand: function (from, text) {
    var self = this;
    function tryCommand(matcher, name) {
      var cb = self[name];
      var match = matcher.exec(text);
      if (match) {
        Array.prototype.splice.call(match, 0, 1, from);
        var result = cb.apply(self, match);
        // Some commands may have more complex conditions that they check
        if (result !== undefined)
          return result;
      }
      return match !== null;
    }
    var handled = this.commands.reduce(function (skip, cmd) {
      if (skip) return skip;
      return tryCommand.apply(null, cmd);
    }, false);
    if (!handled) {
      this.channel.tell(from)(this.eliza.transform(text));
    }
  },
  commands: [
    [/^watch ([A-Za-z-]+)$/, "watch"],
    [/^unwatch ([A-Za-z-]+)$/, "unwatch"],
    [/^((?:\w|@|\.|\+)+) is ((?:\w|@|\.|\+)+)$/, "identify"],
    [/^(\w) am (.+)$/, "identify"],
    [/^watch ([A-Fa-f0-9]{12}) on ([A-Za-z-]+)(?: for (.+))?/, "watchTree"],
    [/^unwatch ([A-Fa-f0-9]{12}) on ([A-Za-z-]+)(?: for (.+))?/, "unwatchTree"],
    [/^h[ae]lp/, "help"],
    [/^version$/, "version"],
    [/^update/, "update"],
    [/^restart$/, "restart"],
    [/^currently$/, "currently"],
    [/^list$/, "currently"],
  ]
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

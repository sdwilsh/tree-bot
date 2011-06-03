var builds = require("../builds.js");
var pulse = require("pulse");
var testCase = require("nodeunit").testCase;
var http = require("http");
var assert = require("assert");
var fs = require("fs");
var events = require("events");

// Before we do anything, we need to modify BuildConsumer so that it does not
// actually try to connect to pulse.
var gBuildConsumer = undefined;
function MockBuildConsumer()
{
  gBuildConsumer = this;
}
MockBuildConsumer.prototype = Object.create(pulse.BuildConsumer.prototype);
pulse.BuildConsumer = MockBuildConsumer;

////////////////////////////////////////////////////////////////////////////////
//// Test Functions

exports.test_no_work_until_listener = function(test) {
  test.expect(2);
  var w = new builds.Watcher();
  test.strictEqual(gBuildConsumer, undefined);

  w.on("success", function() {});
  test.ok(gBuildConsumer);
  test.done();
};

exports.test_Watcher_prototype = function(test) {
  test.expect(1);
  var events = require("events");
  var w = new builds.Watcher();
  test.ok(w instanceof events.EventEmitter);
  test.done();
};

exports.events = testCase({
  setUp: function(callback)
  {
    // These tests will end up calling http.get to get data from some other
    // service.  The test is responsible for establishing what is supposed to
    // be returned, but we'll mock out get for them so they don't have to.
    this._originalGet = http.get;

    this.hosts = {};
    http.get = function(options, callback) {
      console.log(options.host + options.path);
      assert.ok(options.host in this.hosts);
      var paths = this.hosts[options.host];
      assert.ok(options.path in paths);

      // Create a mock response object...
      var res = new events.EventEmitter();
      res.setEncoding = function() { };
      callback(res);

      // ...and then respond with our predefined data.
      res.emit("data", paths[options.path]);
      res.emit("end");
      return new events.EventEmitter();
    }.bind(this);

    // There's no need to delay in loading tinderbox data for tests.
    this._originalTboxDelay = builds.Watcher.kTboxDelay;
    builds.Watcher.kTboxDelay = 0;

    callback();
  },
  tearDown: function(callback)
  {
    http.get = this.originalGet;
    builds.Watcher.kTboxDelay = this._originalTboxDelay;
    gBuildConsumer = undefined;
    callback();
  },

  test_success_event: function(test) {
    test.expect(8);
    this.hosts["hg.mozilla.org"] = {
      "/try/json-pushes?changeset=e8cdbbadcd0a":
        fs.readFileSync("json-pushes.e8cdbbadcd0a.json", "utf8"),
    };
    var w = new builds.Watcher("try");
    w.on("success", function(build) {
      test.ok(build.key);
      test.equal(build.type, "mochitest-plain-2");
      test.equal(build.platform, "macosx64");
      test.equal(build.slave, "talos-r3-snow-037");
      test.equal(build.rev, "e8cdbbadcd0a");
      test.equal(build.result, builds.Watcher.kBuildbotSuccess);
      test.equal(build.tree, "try");
      test.equal(build.pusher, "async.processingjs@yahoo.com");
      test.done();
    });
    var response = JSON.parse(fs.readFileSync("mochitest-plain-2.success.json",
                                              "utf8"));
    gBuildConsumer.emit("message", response);
  },

  test_warning_event: function(test) {
    test.expect(9);
    this.hosts["hg.mozilla.org"] = {
      "/try/json-pushes?changeset=fc3192320c5f":
        fs.readFileSync("json-pushes.fc3192320c5f.json", "utf8"),
    };
    this.hosts["tinderbox.mozilla.org"] = {
      "/Try/json2.js": fs.readFileSync("tinderbox.json2.json", "utf8"),
    };
    var w = new builds.Watcher("try");
    w.on("warning", function(build) {
      test.ok(build.key);
      test.equal(build.type, "mochitest-plain-4");
      test.equal(build.platform, "macosx");
      test.equal(build.slave, "talos-r3-leopard-051");
      test.equal(build.rev, "fc3192320c5f");
      test.equal(build.result, builds.Watcher.kBuildbotWarning);
      test.equal(build.tree, "try");
      test.equal(build.pusher, "ibukanov@mozilla.com");
      test.equal(build.logfile, "http://tinderbox.mozilla.org/showlog.cgi?log=Try/1306719139.1306723720.10280.gz");
      test.done();
    });
    var response = JSON.parse(fs.readFileSync("mochitest-plain-4.warning.json",
                                              "utf8"));
    gBuildConsumer.emit("message", response);
  },
});

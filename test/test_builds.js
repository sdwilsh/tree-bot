var builds = require("../builds.js");
var pulse = require("pulse");
var testCase = require("nodeunit").testCase;

// Before we do anything, we need to modify BuildConsumer so that it does not
// actually try to connect to pulse.
function MockBuildConsumer()
{
  this.called = true;
}
MockBuildConsumer.prototype = Object.create(pulse.BuildConsumer.prototype);
pulse.BuildConsumer = MockBuildConsumer;

////////////////////////////////////////////////////////////////////////////////
//// Test Functions

exports.test_no_work_until_listener = function(test) {
  test.expect(1);
  var w = new builds.Watcher();
  test.ok(!w.called);
  test.done();
};

exports.test_Watcher_prototype = function(test) {
  test.expect(1);
  var events = require("events");
  var w = new builds.Watcher();
  test.ok(w instanceof events.EventEmitter);
  test.done();
};

var kSession = "session.json";
var session = require("./jsondb")(kSession);
var channels = require("./channels");

exports.onNewChannel = function (name) {
  session.db.channels[name] = {};
  session.markDirty();
};

exports.updateChannelState = function (name, state) {
  session.db.channels[name].state = state;
  session.markDirty();
};

exports.restore = function (createbackend) {
  var name;
  var backend;
  for (name in session.db.channels) {
    createbackend(name, function (backend) {
      channels.add(name, backend).restoreState(session.db.channels[name].state);
    });
  }
};

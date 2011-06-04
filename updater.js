var exec = require('child_process').exec;

var version;
var restart;

exec('git rev-parse HEAD', function (error, stdout, stderr) {
  if (error !== null) {
    console.log("Got error trying to grab current version");
  } else {
    version = stdout.trim();
  }
});

exports.__defineGetter__('version', function () { return version; });
exports.__defineGetter__('restart', function () { return restart; });
exports.__defineSetter__('restart', function (r) { restart = r; });
exports.update = function update(cb) {
  exec('git fetch', function (error, stdout, stderr) {
    if (error !== null) {
      return cb("Had trouble fetching a new version: {0}", stderr);
    }
    exec('git rev-parse origin/master', function (error, new_version, stderr) {
      if (error !== null) {
        return cb("Had trouble parsing fetched version: {0}", stderr);
      }
      if (new_version.trim() === version) {
        return cb("Looks like I'm up to date!");
      }
      exec('git rebase origin/master', function (error, stdout, stderr) {
        if (error !== null) {
          return cb("Had trouble rebasing: {0}", error);
        }
        cb("Updating to {0}. See you soon I hope!", new_version.trim());
        restart();
      });
    });
  });
};

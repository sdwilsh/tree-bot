var url = require("url");
var shorturl = require("shorturl");
var randompicker = require('./randompicker');
var committers = require('./committers');

var greetings = [
  { chance: 0.1, text: "o hai" },
  { chance: 0.1, text: "The permasheriff is, uh...back" },
  { chance: 0.1, text: "Greetings!" },
  { chance: 0.1, text: "Never fear, the permasheriff has arrived" },
  { chance: 0.1, text: "Today feels like a good day to sheriff" },
  { chance: 0.1, text: "There better not be any red on my watch" },
  { chance: 0.1, text: "Don't mess with the fro" },
  { chance: 0.1, text: "Green is my favorite colour.  Let's keep the tree that way today." },
  { chance: 0.1, text: "I dislike orange and red.  Let's make sure I don't see any of that today" },
  { chance: 0.1, text: "I've got $10 on an intermittent orange being fixed today.  I'll share some of that to whoever fixes one first!" },
];

exports.greet = function greet(cb)
{
  var text = randompicker(greetings, 'text');
  cb(text);
}

var successes = [
  { chance: 0.0003, text: "Another successful build. Good job, team!" },
  { chance: 0.0001, text: "Code compiled and passed tests...we're not totally fucked!" },
  { chance: 0.9996, text: "" }
];

exports.success = function success(cb, event)
{
  var text = randompicker(successes, 'text');
  cb(text);
}

exports.warning = function warning(cb, event)
{
  committers.lookup(event.pusher, function (name) {
    cb("{0}: I see test failures in {1} on {2} with your push of {3} to {4}", name, event.type, event.platform, event.rev, event.tree);
  }, function (name) {
    if (name === undefined) {
      cb("Who the hell is {0} and why did they make {1} go orange?", event.pusher, event.tree);
    } else {
      cb("Who the hell is {0} ({2}?) and why did they make {1} go orange?", event.pusher, event.tree, name);
    }
  });
}

exports.failure = function failure(cb, event)
{
  var logurl = url.format({
    protocol: 'http',
    host: 'tbpl.mozilla.org',
    pathname: '/php/getTinderboxSummary.php',
    // TODO: make this not hardcoded
    query: {tree:'Firefox',id:event.logfile}
  });
  shorturl(logurl, 'goo.gl', function (shorturl) {
    lookupPusher(event.pusher, function (name) {
      cb("{0}: Did you try compiling before pushing? There's a build failure on {1}, see {2} for details", name, event.platform, shorturl);
    }, function (name) {
      if (name === undefined) {
        cb("Who the hell is {0} and why did they break {1}? See {2} for details.", event.pusher, event.tree, shorturl);
      } else {
        cb("Who the hell is {0} ({2}?) and why did they break {1}? See {3} for details", event.pusher, event.tree, name, shorturl);
      }
    });
  });
}

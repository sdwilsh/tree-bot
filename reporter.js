var url = require("url");
var shorturl = require("shorturl");
var randompicker = require('./randompicker');

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
  { chance: 0.01, text: "Another successful build. Good job, team!" },
  { chance: 0.01, text: "Code compiled and passed tests...we're not totally fucked!" },
  { chance: 0.98, text: "" }
];

exports.success = function success(cb, event)
{
  var text = randompicker(successes, 'text');
  cb(text);
}

exports.warning = function warning(cb, event)
{
  cb("Rev {0} on {1} doesn't look so hot...", event.rev, event.platform);
}

exports.failure = function failure(cb, event)
{
  var logurl = url.format({
    protocol: 'http',
    host: 'tbpl.mozilla.org',
    pathname: '/php/getTinderboxSummary.php',
    query: {tree:'Firefox',id:event.logfile}
  });
  shorturl(logurl, 'goo.gl', function (shorturl) {
    cb("Looks like rev {0} on {1} had an oopsie", event.rev,  event.platform);
    cb("See {0} for more details", shorturl);
  });
}

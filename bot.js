var irc = require("irc");
var translate = require("translate");
var url = require("url");
var shorturl = require("shorturl");
var format = require("./format");
var builds = require("./builds");

function welshify(text, callback)
{
  translate.text({input:'English',output:'Welsh'}, text, function (err, result) {
    callback(err ? text : result);
  });
}

function say()
{
  var args = arguments;
  var text = format.apply(null, args);
  client.say(kChannels[0], text);
}

builds.on("problem", function (event) {
  var logurl = url.format({
    protocol: 'http',
    host: 'tbpl.mozilla.org',
    pathname: '/php/getTinderboxSummary.php',
    query: {tree:'Firefox',id:event.logfile}
  });
  shorturl(logurl, 'goo.gl', function (shorturl) {
    say("Looks like rev {0} on {1} had an oopsie", event.rev,  event.platform);
    say("See {0} for more details", shorturl);
  });
});

var kChannels = [
  "#afrosdwilsh",
];

var client = new irc.Client("irc.mozilla.org", "afrosdwilsh", {
  debug: true,
  channels: kChannels,
});

client.addListener("error", function(m) {
  console.error(m);
});
client.addListener("message", function(from, to, message) {
  var action = /ACTION (.+)/.exec(message);
  if (action) {
    console.log(" * " + from + " " + action[1]);
  }
  else {
    console.log("<" + from + "> " + message);
  }
});

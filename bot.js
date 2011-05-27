var irc = require("irc");
var translate = require("translate");

function welshify(text, callback)
{
  translate.text({input:'English',output:'Welsh'}, text, function (err, result) {
    callback(err ? text : result);
  });
}

function say(text)
{
  client.say(kChannels[0], text);
}

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

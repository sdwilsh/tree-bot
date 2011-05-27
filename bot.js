var irc = require("irc");
var translate = require("translate");

function welshify(text, callback) {
  translate.text({input:'English',output:'Welsh'}, text, function (err, result) {
    callback(err ? text : result);
  });
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
  console.log(from + " -> " + to + ":" + message)
});

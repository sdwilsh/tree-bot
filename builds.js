var pulse = require("pulse");
var http = require("http");

var kTboxDelay = 60 * 1000; // 60 seconds

function createBuildData(m)
{
  var builddata = {
    key: m._meta.routing_key,
    buildid: undefined,
    platform: undefined,
    slave: undefined,
    rev: undefined,
  };

  // Scan through the properties object to find the data we care about.  I
  // really wish this was formatted in a more usable manner.
  m.payload.properties.forEach(function(property) {
    switch (property[0]) {
      case "buildid":
        builddata.buildid = property[1];
        break;
      case "platform":
         builddata.platform = property[1];
        break;
      case "slavename":
        builddata.slave = property[1];
        break;
      case "revision":
        builddata.rev = property[1].substr(0, 12);
        break;
    }
  });

  if (!builddata.rev) {
    console.error(m.payload.properties);
  }

  return builddata;
}

function getLogPath(cset, slave, callback)
{
  console.info("Looking for " + cset + " on " + slave);
  // Get the JSON because Pulse knows nothing about where the logs are :(
  var req = http.get({host: "tinderbox.mozilla.org",
                      path: "/Firefox/json.js"}, function(res) {
    var str = "";
    res.setEncoding("utf8");
    res.on("data", function(chunk) {
      str += chunk;
    });
    res.on("end", function() {
      var stuff = eval(str);
      /* Format looks like:
      scrape: 
       { '1306485307.1306486083.3549.gz': 
          [ ' s: talos-r3-xp-008',
            '<a href=http://hg.mozilla.org/mozilla-central/rev/1fdd03bc2f19 title="Built from revision 1fdd03bc2f19">rev:1fdd03bc2f19</a>',
            ' crashtest<br/>1838/0/55' ],
      */
      for (var change in stuff.scrape) {
        if (stuff.scrape[change][0].indexOf(slave) != -1 &&
            stuff.scrape[change][1].indexOf(cset) != -1) {
          console.info(cset + ": " + change);
          return;
        }
      }
      console.error("no dice, so trying again for " + cset);

      // We didn't find it.  Reschedule ourselves to look again...
      setTimeout(function() { getLogPath(cset, slave, callback); }, kTboxDelay);
    });
  }).on("error", function(e) {
    console.error(e.stack);
  });
}

function messageConsumer(message)
{
  var key = message._meta.routing_key;
  // Filter on mozilla-central.  Do not need to do this after bug 659776 is
  // fixed.
  if (key.substr(0, key.indexOf("_")) != "build.mozilla-central") {
    return;
  }

  var data = createBuildData(message);

  var handleLog = function() {
    console.info("got a callback (:");
  };

  // Give tinderbox time to process the log file.  It may not happen by, then
  // though...
  setTimeout(function() { getLogPath(data.rev, data.slave, handleLog); },
             kTboxDelay);
}

var topics = [
  "build.#.step.#.maybe_rebooting.finished",
];
var conn = new pulse.BuildConsumer("node-pulse-test", messageConsumer, topics);

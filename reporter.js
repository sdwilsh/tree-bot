var url = require("url");
var shorturl = require("shorturl");

exports.success = function success(cb, event)
{
  cb("Another successful build. Good job, team!");
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

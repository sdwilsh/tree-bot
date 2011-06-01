exports.naturalJoin = function (args) {
  if (args.length === 0)
    return "";
  if (args.length === 1)
    return args[0];
  if (args.length === 2)
    return Array.prototype.join.call(args, " and ");
  var last = Array.prototype.splice.call(args, -1, 1);
  return Array.prototype.join.call(args, ", ") + ", and " + last;
}

exports.prepend = function prepend(text)
{
  return function (orig, cb) {
    // Lower the first letter of the original text if it's not I/I'll/I'm
    var lowered;
    if (orig.length >= 2 && orig[0] === 'I' && (orig[1] === "'" || orig[1] === ' ')) {
      lowered = orig;
    }
    else {
      lowered = orig.slice(0, 1).toLowerCase() + orig.slice(1);
    }
    cb(text + lowered);
  };
}


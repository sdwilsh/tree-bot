exports.naturalJoin = function (args) {
  if (args.length === 0)
    return "";
  if (args.length === 1)
    return args[0];
  var last = Array.prototype.splice.call(args, -1, 1);
  return Array.prototype.join.call(args, ", ") + ", and " + last;
}

exports.prepend = function prepend(text)
{
  return function (orig, cb) {
    // Lower the first letter of the original text
    var lowered = orig.slice(0, 1).toLowerCase() + orig.slice(1);
    cb(text + lowered);
  };
}


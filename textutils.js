exports.naturalJoin = function (args) {
  if (args.length === 0)
    return "";
  if (args.length === 1)
    return args[0];
  var last = Array.prototype.splice.call(args, -1, 1);
  return Array.prototype.join.call(args, ", ") + ", and " + last;
}

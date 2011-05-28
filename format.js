module.exports = function format(formatstr)
{
  var i = 0;
  var n = formatstr.length;
  var end;
  var argidx;
  var result = ""
  while (i < n) {
    var c = formatstr[i];
    if (c === '{') {
      end = i;
      while (formatstr[end] !== '}') {
        end++;
        if (end === n) {
          throw new Error("malformed format string");
        }
      }
      argidx = parseInt(formatstr.substring(i+1, end), 10);
      result += arguments[argidx+1];
      i = end;
    }
    else {
      result += c;
    }
    i++;
  }
  return result;
}

var translate = require("translate");

module.exports = function welshify(text, callback)
{
  translate.text({input:'English',output:'Welsh'}, text, function (err, result) {
    callback(err ? text : result);
  });
};

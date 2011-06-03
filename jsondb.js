var fs = require("fs");

function Config(path)
{
  this.path = path;
  this.db = JSON.parse(fs.readFileSync(path, 'utf8'));
}

Config.prototype = {
  isDirty: false,
  saveInProgress: false,
  markDirty: function () {
    this.isDirty = true;
    if (!this.saveInProgress)
      this.save();
  },
  save: function () {
    this.saveInProgress = true;
    var count = Object.keys(this.db).length;
    fs.writeFile(this.path, JSON.stringify(this.db), 'utf8', this._saveComplete.bind(this, count));
    this.isDirty = false;
  },
  _saveComplete: function (count, err) {
    if (err) {
      console.error("Got error trying to save database to " + this.path + ": " + e);
    } else {
      console.log("Saved new version of database to " + this.path + " with " + count + " entries");
    }
    this.saveInProgress = false;
    if (this.isDirty) {
      this.save();
    }
  }
};

module.exports = function (path) {
  return new Config(path);
}

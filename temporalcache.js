var assert = require("assert");

// Default is hours
var kMSPerCacheUnit = 1000 * 60 * 60;

function Cache()
{
  this.cache = {};
  this.info = {};
}

Cache.prototype = {
  has: function (name) {
    return this.cache.hasOwnProperty(name);
  },
  get: function (name) {
    if (this.has(name)) {
      return this._get(name).value;
    }
    return undefined;
  },
  _get: function (name) {
    assert.ok(this.has(name));
    return this.cache[name];
  },
  add: function (name, value, time, treeName, rev, who) {
    if (this.has(name))
      this.remove(name);
    this.cache[name] = {
      value: value,
      timer: setTimeout(this.remove.bind(this, name), kMSPerCacheUnit * time)
    };
    this.info[name]={
      rev: rev,
      name: who,
      tree: treeName
    };
  },
  remove: function (name) {
    assert.ok(this.has(name));
    var entry = this._get(name);
    if (entry.timer)
      clearTimeout(entry.timer);
    delete this.cache[name];
    delete this.info[name];
    return entry.value;
  },
  show: function(){
    //for(var x in this.cache){
    //  console.log(x);
    //  console.log(this.info[x])
    //}
    return this.info;
  },
};

module.exports = Cache;

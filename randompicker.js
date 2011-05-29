module.exports = function randompicker(objects, propname) {
  var chance = Math.random();
  for (var i = 0; i < objects.length; i++) {
    if (chance < objects[i].chance) {
      return objects[i][propname];
    }
    chance -= objects[i].chance;
  }
  return undefined;
}

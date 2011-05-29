module.exports = function randompicker(objects, propname) {
  var chance = Math.random();
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].chance < chance) {
      return objects[i][propname];
    }
    chance -= objects[i].chance;
  }
  return undefined;
}

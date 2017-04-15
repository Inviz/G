G.meta = function() {

}

// Compare two arrays of arguments 
G.meta.equals = function(meta1, meta2) {
  if (meta1 == meta2)
    return true;
  if ((!meta1 && meta2) || (meta1 && !meta2) || meta1.length !== meta2.length)
    return false;
  for (var i = 0; i < meta1.length; i++)
    if (meta1[i] !== meta2[i])
      return false;
  return true;
};

G.meta.compare = function(meta1, meta2) {
  var left  = meta1 && meta1[0];
  var right = meta2 && meta2[0];
  var type = typeof left;
  if (type == typeof right) {
    if (type == 'number') {
      return left > right ? -1 : left === right ? 0 : 1;
    } else if (left && left.comparePosition && right && right.comparePosition) {
      return left.comparePosition(right);
    }
  }
}

G.meta.set = function(op, meta) {
  while (meta && meta.length < 2 && (meta[0] == null || meta[0] instanceof Array))
    meta = meta[0] || undefined
  if (meta)
    op.$meta = meta
}

G.meta.isPriority = function(op) {
  return !op.$meta
};

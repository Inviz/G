/*
  Operational transformation is a mechanism
  for lossless synchronization of concurrent data changes 
  that does not require manual conflict resolution.

  Each operation over data is recorded into a log,
  which is sent to other parties for synchronization.
  If two parties produced operations over the
  same value or object, each of those should rebase
  their changes against other's history. Rebase produces
  a new set of operations for both peers in conflict.
  When those are applied, they will have the same 
  deterministic state of values.  

  This mechanism is often used in collaborative 
  editing environments, e.g. Google Docs.
  G supports excellent jot (http://github.com/JoshData/jot)  
  library by @JoshData, which provides additional methods
  for math operations, working with dictionaries and arrays.

  Jot has optional mechanism that compares
  two JSON objects for changes and generates operation log,
  but it is rather expensive to run over big JSON trees.

  G provides a wrapper to avoid running diff logic for
  code that uses G objects. G maintains the list of changes
  to data and detects conflicts. It generates jot operations 
  and applies the changes on demand. 

  There are two ways to use op transforms in G:
  1. Only invoke jot on detected concurrent changes.
     (only syncing 1-way, e.g. by manually saving document)
  2. Generate jot operations on each change 
     (e.g. to sync with peers in real time)



*/
G.transformation = function() {

};

G.onStateChange = function(value, old) {
  var root = G.$operating;
  if (!root) return;

  for (var context = value || old; context = context.$context;)
    if (context === root)
      break;
  if (!root) return;

  var key = (value || old).$key;
  var log = G.$operations[key];
  var ops = G.$operations.ops;
  if (!value) {
    ops.push(new jot.REM(key, old && old.valueOf()))
  } else {
    var v = value.valueOf();
    if (typeof v == 'object' && v && v.clean)
      v = v.clean();

    var o = old && old.valueOf();
    if (typeof o == 'object' && o && o.clean)
      o = o.clean();

    if (value.$multiple) {
      for (var index = 0, prev = value; prev = prev.$previous;)
        index++;
      ops.push(new jot.APPLY(key, 
        new jot.SPLICE(index, [], [v])));
    } else if (!old) {
      ops.push(new jot.PUT(key, v))
    } else {
      ops.push(new jot.APPLY(key, 
        new jot.SET(o, v)))
    }
  }
  
};

G.transformation.transact = function(object) {
  G.$operating = object;
  G.$operations = new jot.LIST([]);
};

G.transformation.commit = function(root) {
  var operations = G.$operations;
  G.$operations = G.$operating = null;
  return operations.simplify()
}
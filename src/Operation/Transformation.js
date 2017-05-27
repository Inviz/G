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
  G uses O (http://github.com/Inviz/O) library that 
  provides additional methods for math operations, 
  working with dictionaries and arrays.

  G maintains the list of changes to data and can
  apply list of other changes concurrently.

  G applies "our" changes right away, so UI feels responsive.
  When syncing, history of unsaved operations is inverted
  to go back to shared state, and then on top of that
  it is rebased together with concurrent changes.

*/

// custom application logic that mutates G object
G.transformation = function(object, ours, args) {
  if (args) {
    if (args.rebase) {
      // generate commands to go back to shared history
      // then re-apply our history concurrently with theirs
      ours = args.rebase(ours) || ours
      var result = ours
      args = undefined
    }
  }

  switch (ours.type[1]) {
    case 'LIST':

      for (var i = 0; i < ours.ops.length; i++)
        object = G.transformation(object, ours)

      return object;

    case 'APPLY':

      switch (ours.type[0]) {
        case 'objects':

          for (var key in ours.ops) {
            var value = G.transformation(object[key], ours.ops[key], [object, key]);
            if (value == null)
              continue
            if (typeof value === 'object' && Object.keys(value).length == 0) {
              if (object[key])
                object[key].uncall(); // key was removed
            }
            else
              object.set(key, value)
          }

          return result || object;

      }

      break;

    case 'SPLICE':

      switch (ours.type[0]) {
        case 'sequences':
          if (object.$multiple) {
            
            var index = 0;
            ours.hunks.forEach(function(hunk) {
              index += hunk.offset;
              // Append unchanged content before this hunk.
              G.Array.prototype.splice.apply(object, [index, hunk.old_value.length].concat(hunk.new_value))
            });
            return
          };
      }

  }

  // for all other commands fall back to jot apply() implementation
  return ours.apply(object, args);
};

G.transformation.options = {
  dontRename: true,
  words: true
}

G.transformation.push = function(value, old) {
  var root = G.$operating;
  if (!root) return;


  for (var context = value || old; context = context.$context;) {
    if (context.$merging)                             // Ignore operations within object that is being constructed
      return;                                         //   let object assignment op invoke `jot.diff()` instead
                                                      // i.e. this.set('key', {abc: 123})

    if (context === root)                             // only record operations that can be reached from root
      break;                                          //   e.g. root.object.key
  }
  if (!context) return;


  var key = (value || old).$key;
  var log = G.$operations[key];

  var o = old && old.valueOf();
  if (typeof o == 'object' && o && o.clean)
    o = o.clean();
  if (!value) {
    if (old.$multiple) {
      for (var from = 0, prev = G.Array.getPrevious(old); prev ;prev = prev.$previous)
        from++;
      var op = new jot.APPLY(key, 
          new jot.DEL(from, [o])
      )
    } else {
      var op = new jot.REM(key, o)
    }
  } else {
    var v = value.valueOf();
    if (typeof v == 'object' && v && v.clean)
      v = v.clean();

    if (value.$multiple) {
      for (var to = 0, prev = value; prev = prev.$previous;)
        to++;
      if (value === old) {
        for (var from = 0, prev = value.$oldPrevious; prev = prev && prev.$previous;)
          from++;

        //var op = new jot.APPLY(key, 
        //  new jot.MOVE(from, 1, to));

        // current MOVE implementation does not resolve conflicts with SPLICE, so 
        // we use DEL + INS for now 
        var op = ['move', from, 1, to]
        //  new jot.APPLY(key, 
        //      new jot.DEL(from, [v]).compose(new jot.INS(to, [v]))
        //  )
      } else {

        var op = new jot.APPLY(key, 
          new jot.SPLICE(to, [], [v]));
      }
    } else if (!old) {
      var op = new jot.PUT(key, v)
    } else {
      var op = new jot.APPLY(key, 
        new jot.diff(o, v, G.transformation.options))
    }
  }

  var cursor = op;
  for (var context = value || old; context = context.$context;)
    if (context !== root) {
      cursor = new jot.APPLY(context.$key, cursor)
    } else {
      G.$operations.ops.push(cursor)
      break;
    }
  
  return cursor;  
};

G.transformation.transact = function(object) {
  G.$operating = object;
  G.$operations = new jot.LIST([]);
};

G.transformation.commit = function() {
  var operations = G.$operations;
  G.$operations = G.$operating = null;
  return operations.simplify()
}
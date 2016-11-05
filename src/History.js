/*
  History allows concurrent state modification.
  Values from different sources make a stack,
  of which the top value is used. When top value
  is recalled, the previous value is applied.

  Different sources are identified by extra arguments
  (or lack of thereof)

  object.set('a', 1);               // will write 1 with meta of undefined
  object.set('a', 2);               // will rewrite 1, because meta matches
  object.set('a', 3, 'super pony'); // makes stack of of 2 and 3 (distinct meta)
  object.a.recall('super pony');    // pops 3 from stack, reverts to 2
*/

// Find operation in group or history that matches meta of a given operation 
G.match = function(meta, old) {
  // Allow meta to be passed as array
  if (meta && meta.length == 1 && (!meta[0] || meta[0] instanceof Array))
    meta = meta[0];

  if (G._compareMeta(old.$meta, meta))            // 1. Current value matches
    return old;

  for (var other = old; other = other.$previous;) 
    if (G._compareMeta(other.$meta, meta))        // 2. Group value matched
      return other;

  for (other = old; other;) {                     
    if (G._compareMeta(other.$meta, meta))        // 3. Value in history matched
      return other;
    other = other.$preceeding
  }
};

// Iterate all values in stack that match meta & value
G.stack = function(context, key, value, meta, callback) {
  var current = context[key]
  if (!current) return;
  
  for (var old = current; old = G.match(meta, old); old = next) {
    var next = old.$previous || old.$preceeding;
    for (var head = old; head != current && head.$next;)
      head = head.$next;
    if (head === current
    && (value === undefined || value === old.valueOf())) {      
      callback(old)
      current = context[key]
    }
    if (!current || !next) break;
  }
}


// Replace one operation in history with another 
// Removed value keeps its pointers
// so it can be re-applied in place in future
G.rebase = function(old, value) {
  if (value) {                                      // 1. Switching value in history
    if (value.$succeeding = old.$succeeding)        //    Steal neighbour pointers
      value.$succeeding.$preceeding = value;        //    Assign foreign pointers
    if (value.$preceeding = old.$preceeding)        //    Keep pointers on replaced value
      value.$preceeding.$succeeding = value;
  } else {                                          // 2. Removing value from history
    if (old.$succeeding != null)                    //    Remove points on neighbour values
      old.$succeeding.$preceeding = old.$preceeding;//    Keep pointers on removed value
    if (old.$preceeding != null)
      old.$preceeding.$succeeding = old.$succeeding;
  }
  return value;
};

// Attempt to perform soft update, one that only changes references 
G.update = function(value, old, other) {
  if (other === value) {                            // 1. Op is already in history, so it's redo
    return value;                                   //    Not changing history
  } else if (other === old) {                       // 2. New value matches meta of old value 
    G.rebase(old, value);                           //    Switch in place
    return value;                                   //    Return new value
  } else if (other) {                               // 3. Value matches
    G.rebase(other, value);                         //    Replace it in history
    return old;
  }
};

// Compare two arrays of arguments 
G._compareMeta = function(meta1, meta2) {
  if (meta1 == meta2)
    return true;
  if ((!meta1 && meta2) || (meta1 && !meta2) || meta1.length !== meta2.length)
    return false;
  for (var i = 0; i < meta1.length; i++)
    if (meta1[i] !== meta2[i])
      return false;
  return true;
};

G._setMeta = function(op, meta) {
  if (meta) {
    if (meta.length < 2 && (meta[0] == null || meta[0] instanceof Array))
      op.$meta = meta[0] || undefined
    else
      op.$meta = meta
  }
}

G._isUserData = function(op) {
  return !op.$meta
};

G.verbs = {
  // Bypass stack of values and write over 
  assign: function(value, old) {
    return value;
  },

  // Reassignment - Sets operation as head of the stack 
  set: function(value, old) {

    if (!G._isUserData(value) && G._isUserData(old))
      for (var last = old; last.$preceeding && G._isUserData(last);)
        last = last.$preceeding

    if (last) {
      value.$preceeding = last.$preceeding;
      last.$preceeding = value;
      value.$succeeding = last;
      return old;
    } else {
      if (value.$source)
        value = G.reify(value)
      if (value.$succeeding = old.$succeeding)
        value.$succeeding.$preceeding = value
      old.$succeeding = value;
      value.$preceeding = old;
      return value;
    }
  },

  // Preassignment - Puts value at stack bottom, will not fire callbacks 
  preset: function(value, old) {

    if (G._isUserData(value))
      for (var last = old; last.$preceeding && G._isUserData(last);)
        last = last.$preceeding

    if (last) {
      if (last == old && value.$source)
        value = G.reify(value)
      value.$succeeding = last.$succeeding;
      last.$succeeding = value;
      value.$preceeding = last;
      if (last == old)
        return value
      else
        return old;
    } else {
      for (var first = old; first.$preceeding;)
        first = first.$preceeding;
      first.$preceeding = value;
      value.$succeeding = first;
      value.$preceeding = undefined;
    }
    return false;
  },

  // Attempt to place value optimistically where it once belonged
  restore: function(value, old) {
    if (value.$succeeding) {
      value.$succeeding = old;
      value.$preceeding = old.$preceeding;
      old.$preceeding = value;
      return false
    } else {
      value.$preceeding = old;
      value.$succeeding = old.$succeeding;
      old.$succeeding = value;
      return value;
    }
  },


  // merge two objects
  merge: function(value, old, meta) {
    if (typeof value.valueOf() != 'object' || typeof old.valueOf() != 'object')
      return G.verbs.set(value, old, meta || value.$meta);
    if (value.watch) {
      old.observe(value, false, meta || value.$meta, 'merge')
    } else {
      old.merge(value, meta)
    }
    return old;
  },

  // merge object underneath another
  defaults: function(value, old, meta) {
    if (typeof value.valueOf() != 'object' || typeof old.valueOf() != 'object')
      return G.verbs.preset(value, old, meta || value.$meta);
    if (value.watch) {
      old.observe(value, true, meta || value.$meta, 'defaults')
    } else {
      old.defaults(value, meta)
    }
    return old;
  }

};

G.verbs.merge.partial = 
G.verbs.defaults.partial = 
G.verbs.merge.reifying = 
G.verbs.defaults.reifying = 
G.verbs.set.reifying = 
G.verbs.preset.reifying = true;
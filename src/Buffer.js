/*
  Buffer allows concurrent state modification.
  Values from different sources make a stack,
  of which the top value is used. When top value
  is recalled, the previous value is applied.

  Different sources are identified by extra arguments
  (or lack of thereof)

  object.set('a', 1);               // will write 1 with meta of undefined
  object.set('a', 2);               // will rewrite 1, because meta matches
  object.set('a', 3, 'super pony'); // makes stack of of 2 and 3 (distinct meta)
  object.a.recall();                // pops 3 from stack, reverts to 2
*/

// Find operation in the stack that matches meta of a given operation 
G.match = function(meta, old, verb) {
  if (verb && verb.multiple) {
    //if (verb.unique) {}

    //for (var item = old; old; old = old.$previous)
    //  for (var other = old; other; other = other.$preceeding)
    //    if (G._compareMeta(other.$meta, meta))
    //      return other;
  } else {
    if (G._compareMeta(old.$meta, meta))                  // Check current value
      return old;

    for (var other = old; other = other.$previous;)       // Check values in group
      if (G._compareMeta(other.$meta, meta))
        return other;

    for (other = old; other; other = other.$preceeding)   // Check values in history
      if (G._compareMeta(other.$meta, meta))
        return other;
  }
};

// Replace one operation in the stack with another 
G.rebase = function(old, value) {
  if (value) {
    if (value.$succeeding = old.$succeeding)
      value.$succeeding.$preceeding = value;
    if (value.$preceeding = old.$preceeding)
      value.$preceeding.$succeeding = value;
  } else {
    if (old.$succeeding != null)
      old.$succeeding.$preceeding = old.$preceeding;
    if (old.$preceeding != null)
      old.$preceeding.$succeeding = old.$succeeding;
  }
  return value;
};

// Attempt to perform soft update, one that only changes references 
G.update = function(value, old, other) {
  if (other.valueOf() === value.valueOf()) {        // 1. Op is already in stack, so it's redo
    return value;                                   //    Not changing history
  } else if (other === old) {                       // 2. New value matches meta of old value 
    G.rebase(old, value);                           //    Switch in place
    return value;                                   //    Return new value
  } else if (other) {                               // 3. Value matches
    G.rebase(other, value);
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


G.verbs = {
  // Bypass stack of values and write over 
  assign: function(value, old) {
    return value;
  },

  // Reassignment - Sets operation as head of the stack 
  set: function(value, old) {
    value.$preceeding = old;
    old.$succeeding = value;
    value.$succeeding = undefined;
    return value;
  },

  // Preassignment - Puts value at stack bottom, will not fire callbacks 
  preset: function(value, old) {
    var first;
    first = old;
    while (first.$preceeding) {
      first = first.$preceeding;
    }
    first.$preceeding = value;
    value.$succeeding = first;
    value.$preceeding = undefined;
    return;
  },

  restore: function(value, old) {
    return value;
  }
};
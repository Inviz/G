/*
  Stack is a history of changes to value done by
  different codepaths concurrently. It is sort of changelog,
  of which the last entry is current. When last value
  is recalled, the previous value is applied.

  Extra arguments provided to setter determine identity of value.
  When value changes, but the stack already has another value with
  the same identity, the entry in the stack is updated. If the
  updated value was not current, the change is invisible to observers.

    object.set('a', 1, 'user1');  // will write `1` with meta of undefined
    object.set('a', 2, 'user1');  // will rewrite `1`, because meta matches
    object.set('a', 3, 'user2');  // makes stack of of `2` and `3` (distinct meta)
    object.a.uncall();            // pops `3` from stack, `object.a` is `2` again
    object.a.uncall()             // empties the stack, `object.a` becomes `undefined`

  Values without extra arguments are treated as more important and 
  can't be shadowed by values with meta. Still there can be only one
  such value in the stack at time. 

  Stack is a handy mechanism that enables default values, as well as
  exclusive concurrent state changes. It is useful for dynamic declarative
  programming, where multiple rules could have effects over the same
  variables and can be toggled dynamically to recompute the state.

  Example would be a question "Should we send notification to Joe?"
  The answer can be influenced by Joe's status or subscription, 
  importance of the event, chatroom being current and other rules. 
  A complicated algorithmic if/else tree can be
  simplified: Mutually exclusive (nested else branches) could 
  be groupped together and turned into independent declarative rules.
  For example, Joe being offline and Joe having "Do not disturb" 
  status could become a single "availability" stack of values. Chat-room
  wide messages shoutiness and messages in inactive channels could use
  a single "importance" stack of values. The best kind of code for this
  would be 

  When a new rule matches (Joe's online now!) 
  or stops matching (Joe went to other chatroom) within life-cycle of
  an application, it is possible for the system to know how 
  visible that change is, and only run computations
  that listen for that specific piece of state change. 

  
*/

// Find operation in group or history that matches meta of a given operation 
G.stack = function(value, old, verb) {
  if (!verb && value.$multiple)
    for (var prec = value; prec = prec.$preceeding;) 
      if (G.Array.contains(old, prec)) 
        return prec;

  if (G.stack.isReplacing(value, old, verb))    // If key is supposed to have singular value
    return G.stack.match(value.$meta, old)      //   Attempt to find value with same meta in history 
};

// Decide if multiple values with same identity 
// will make a list or one will replace another
G.stack.isReplacing = function(value, old, verb) {
  if (!verb || !old)
    return;
  if ((verb.multiple || !verb.reifying) && !verb.once)
    return;
  if (value instanceof G
    && (!verb.multiple 
    || value.$context != old.$context 
    || value.$key != old.$key))

    return
  return true;
}

// Check if value was ejected from its stack
G.stack.isLinked = function(value) {
  if (G.value.current(value) === value)
    return true;
  if (value.$succeeding && value.$succeeding.$preceeding === value)
    return true;
  if (value.$preceeding && value.$preceeding.$succeeding === value)
    return true;
  return false;
}

// Check if value is/was in the stack
G.stack.hasLinks = function(value) {
  return value.$succeeding || value.$preceeding
}

// Find first value in the stack/array tree that matches meta.
// The function can be given the result of its own execution 
// to be used as iterator and find multiple values: 
//     while ((value = G.stack.match(meta, value))) {}
G.stack.match = function(meta, old) {
  // Allow meta to be passed as array
  if (meta && meta.length == 1 && (!meta[0] || meta[0] instanceof Array))
    meta = meta[0];

  if (G.meta.equals(old.$meta, meta))            // 1. Current value matches
    return old;

  for (var other = old; other = other.$previous;) 
    if (G.meta.equals(other.$meta, meta))        // 2. Group value matched
      return other;

  for (other = old; other;) {                     
    if (G.meta.equals(other.$meta, meta))        // 3. Value in history matched
      return other;
    other = other.$preceeding
  }
};

// Iterate all values in stack that match meta & value
G.stack.matches = function(context, key, value, meta, callback) {
  var current = G.value.get(context, key);
  if (!current) return;
  
  for (var old = current; old = G.stack.match(meta, old); old = next) {
    var next = old.$previous || old.$preceeding;
    if ((value === undefined || value == old.valueOf())) {      
      var result = callback ? callback(old) : old;
      current = G.value.get(context, key);
    }
    if (!current || !next) break;
  }
  return result;
}


// Replace one operation in history with another 
// Removed value keeps its pointers
// so it can be re-applied in place in future
G.stack.rebase = function(old, value) {
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
G.stack.update = function(value, old, other) {
  if (other === value) {                            // 1. Op is already in history, so it's redo
    return value;                                   //    Not changing history
  } else if (other === old) {                       // 2. New value matches meta of old value 
    G.stack.rebase(old, value);                   //    Switch in place
    return value;                                   //    Return new value
  } else if (other) {                               // 3. Value matches
    G.stack.rebase(other, value);                 //    Replace it in history
    return undefined;                               //    Keep old value assigned
  }
};

G.verbs = {

  // Reassignment - Sets operation as head of the stack 
  set: function(value, old) {
    // values without meta come after ones with meta
    if (!G.meta.isPriority(value) && G.meta.isPriority(old))
      for (var last = old; last.$preceeding && G.meta.isPriority(last);)
        last = last.$preceeding

    if (last) {
      value.$preceeding = last.$preceeding;
      last.$preceeding = value;
      value.$succeeding = last;
      return false;
    } else {
      if (value.$source)
        value = G.value.reify(value)
      if (value.$succeeding = old.$succeeding)
        value.$succeeding.$preceeding = value
      old.$succeeding = value;
      value.$preceeding = old;
      return value
    }
  },

  // Preassignment - Puts value at stack bottom, will not fire callbacks 
  preset: function(value, old) {
    // values without meta come after ones with meta
    if (G.meta.isPriority(value))
      for (var last = old; last.$preceeding && G.meta.isPriority(last);)
        last = last.$preceeding

    if (last) {
      if (last == old && value.$source)
        value = G.value.reify(value)
      value.$succeeding = last.$succeeding;
      last.$succeeding = value;
      value.$preceeding = last;
      if (last !== old)
        return false;
      return value;
    } else {
      for (var first = old; first.$preceeding;)
        first = first.$preceeding;
      first.$preceeding = value;
      value.$succeeding = first;
      value.$preceeding = undefined;
      return false;
    }
  },


  // Attempt to place value optimistically where it once belonged
  restore: function(value, old) {
    if (value.$multiple)
      return value;
    var last = value;
    for (var succ = value; succ = succ.$succeeding;) {
      if (succ.$preceeding !== last)
        break;
      if (succ === old)
        return value;
      last = value;
    }
    var last = value;
    for (var prec = value; prec = prec.$preceeding;) {
      if (prec.$succeeding !== last)
        break;
      if (prec === old)
        return value;
      last = value;
    }
    if (value.$succeeding) {
      value.$succeeding = old;
      value.$preceeding = old.$preceeding;
      old.$preceeding = value;
    } else {
      value.$preceeding = old;
      value.$succeeding = old.$succeeding;
      old.$succeeding = value;
    }
    return value;
  },
  // merge two objects
  merge: function(value, old, meta) {
    if (typeof value.valueOf() != 'object' || typeof old.valueOf() != 'object')
      return G.verbs.set(value, old, meta);
    if (value.watch) {
      old.observe(value, 'merge', meta)
    } else {
      old.merge(value, meta)
    }
    return false;
  },

  // merge object underneath another
  defaults: function(value, old, meta) {
    if (typeof value.valueOf() != 'object' || typeof old.valueOf() != 'object')
      return G.verbs.preset(value, old, meta);
    if (value.watch) {
      old.observe(value, 'defaults', meta)
    } else {
      old.defaults(value, meta)
    }
    return false;
  }

};

G.verbs.merge.partial = 
G.verbs.defaults.partial = 
G.verbs.merge.reifying = 
G.verbs.defaults.reifying = 
G.verbs.set.reifying = 
G.verbs.preset.reifying = true;

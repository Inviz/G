/*

Operations have three pairs of mutable pointers that 
make up linked lists:

Effect  - $before/$after + $caller
A graph of causation, doubles up as transaction. 

History - $preceeding/$succeeding 
A stack of concurrent values for the key of specific context

Group   - $previous/$next 
A groupping of values, similar to array.

*/

// Maintain depth-first double linked list of current operations 
// It is used to compute difference in state and quickly 
// switch branches of state without recomputation 


// Process pure value transformations 
G.format = function(value, old) {
  var formatters = value.$context.$formatters;      // Formatters configuration for whole context
  if (formatters)                                   // is stored in sub-object
    var group = formatters[value.$key];

  var current = G.formatted(value)                  // Use value as it was formatted previously
  if (current.$formatted === group) {               // 1. Value is already properly formatted 
    return current                                  //    return it
  } else {                                          // 2. Value not (yet) properly formatted
    var result = G.unformatted(value)               //    get original value
    var after = current.$after                      //    remember next operation
    if (group) {                            
      for (var i = 0, j = group.length; i < j; i++) // Context has formatters for key
        result = G.callback(result, group[i], old); //   apply formatters in order
      result.$formatted = group                     //   store formatting configuration
    }
    G.rebase(value, result);                        // Replace value in the stack of values for key
    G.link(result, after)
    return result;                                   
  }
},

// Process all side effects for the value. 
// When value is applied initially, it invokes all observers
// When value is re-applied, it attempts to reuse effects
G.affect = function(value, old) {
  var watchers = value.$context.$watchers;        // Watchers configuration for whole context
  if (watchers)                                   // is stored in sub-object
    var group = watchers[value.$key]

  var observers = value.$context.$observers;
  var iterators = value.$iterators;
  var present, removed

  // Reapply 
  for (var after = value; after = after.$after;) {
    if (after.$caller !== value) continue;
    var cause = after.$cause;
    if (!(cause.$getter || cause).$properties)
    if (observers && observers.indexOf(cause) > -1
    ||  group     &&     group.indexOf(cause) > -1) {
      if (!after.ondetach) {
        after.call('restore');
        (present || (present = [])).push(cause)
      }
    } else if (!iterators || iterators.indexOf(after) == -1) {
      (removed || (removed = [])).push(after)
    }
  }
  if (removed)
    for (var i = 0; i < removed.length; i++) {
      var recalled = G.revoke(removed[i]);
      if (value.$after == recalled)
        value.$after = G.formatted(removed[i]).$after
    }
  if (group)
    for (var i = 0; i < group.length; i++)
      if (!present || present.indexOf(group[i]) == -1)
        G.callback(value, group[i], old, true);
      else if ((group[i].$getter || group[i]).$properties)
        G._observeProperties(value, group[i]);
  if (observers)
    for (var i = 0; i < observers.length; i++)
      if (!present || present.indexOf(observers[i]) == -1)
        G.callback(value, observers[i], old, true);
  return value;
}

// Stack of callers (they do not always reference each other)
G.$callers = [];

// References current operation 
G.$caller = G.$called = null;

// register operation in graph
G.record = function(value, old) {
  G.record.causation(value, old);
  G.record.sequence(value, old);
}

G.record.sequence = function(value, old) {
  if (old && old.$after && old.$after !== value)      // 1. Updating effect graph:
    if (!old.$multiple && !value.$multiple)
      value.$after = old.$after;                      //    Remember old value's next op (1-way)
  if (old && old.$caller === G.$caller && !value.$multiple) { //    If new value has the same caller as old
    G.link(G.unformatted(old).$before, value);        //    Connect new value to old's previous ops
  } else if (G.$called) {                             // 2. Tracking side effects:  
    G.link(G.$called, G.unformatted(value), true)     //    Continue writing at parent's point
    G.$called = value;
  } else if (G.$caller){
    G.link(G.head(G.$caller), G.unformatted(value))
  }
  return value;
}

G.record.push = function(value) {
  G.$callers.push(G.$caller);
  return G.$caller = G.$called = value               // Reassign call stack pointers 
};

G.record.pop = function() {
  G.$caller = G.$callers.pop();                       // Revert global pointers to previous values 
  if (!G.$caller || !G.$caller.$context) {            // Reset $called pointer on top level
    if (G.$called && G.$called.$after)                // Patch up graph to point to next ops
      G.link(G.$called, G.$called.$after)             
    G.$called = null;
  }
};

// Record transformed value as a local effect
G.record.transformation = function(value, old, last, transform) {
  value.$transform = transform;                       //    Store transformation function
  G.link(last, value)                                 //    Keep reference to input value 
  return value
}

// Write pointers to parent stack frame and to a triggering callback
G.record.causation = function(value) {
  if (G.$caller)
    value.$caller = G.$caller; 
  if (G.$cause)
    value.$cause = G.$cause;
}

// Reuse state change and it's effects, set new caller. 
// Rewind to the end
G.record.reuse = function(value) {
  var last = G.last(value); 
  if (value.$caller != G.$caller) {
    G.link(value.$before, last.$after);               // detach effect from old graph
    G.record.causation(value);                        // set new caller
    last.$after = undefined
  }
  G.record.sequence(value);                           // rewrite left side
  return G.record.write(last);                        // rewind to last effect
}

G.record.continue = function(value, old) {
  G.record.causation(value);
  G.record.sequence(value, old);
  return G.record.write(value);
}

G.record.write = function(value) {
  G.$called = G.$caller && G.$caller.$context && value;
  return value;
}

G.record.find = function(value) {
  var prev = value;
  for (var after = value; after = after.$after;) {
    if (after.$before != value) break;
    if (after.$cause == G.$cause)
      return prev;
    var prev = after;
  }
  return value;
}

// Make a two-way connection between two operations in graph
G.link = function(old, value) {
  if (old == value)
    throw new Error('Cant link to itself')
  if ((old.$after = value)){
    old.$after.$before = old;
  }
}

// Remove all operations from the graph in span between `from` and `to`
G.unlink = function(from, to, hard) {
  if (from.$before) {                           // If there're operation before
    if (from.$before.$after == from)
      G.link(from.$before, to.$after);            //   Connect previous & next operations
  } else if (to.$after) {                       // Or if it was first,
    to.$after.$before = undefined               //   Shift history 
  }
  for (var c = from; c; c = c.$after) {
    if (c.ondetach) c.ondetach();
    if (c == to) break;
  }
  if (hard)                                     // A top-level recall() needs to
    to.$after = undefined                       // clean last op's reference to next operations
},

// Helper to create transaction operation
G.transact = function(value) {
  return G.$caller = value || new G
},

// Undo all state changes since transaction has started
G.abort = function(value) {
  G.$recaller = value
  last = G.effects(value, G.uncall)
  G.$recaller = null
  if (G.$caller == value)
    G.$caller = null
  return last;
},

// Reapply previously aborted transaction
G.commit = function(value) {
  return G.effects(value, G.call);
};

G.finalize = function() {
  G.$caller = null;
}

// Find last operation in graph
G.head = function(value) {
  while (value.$after)
    value = value.$after
  return value
}

// Find result of last transformation over value
G.formatted = function(value) {
  while (value.$after && value.$after.$transform)
    value = value.$after
  return value
},

// Find value before transformations
G.unformatted = function(value) {
  while (value.$transform)
    value = value.$before
  return value
},

// Iterate side effects caused by value 
G.effects = function(value, callback, argument) {
  for (var after = value; after = after.$after;)
    if (after.$caller === value)
      var last = callback(after, argument) || after;
  return last;
}

G.effects.caused = function(value, watcher, old) {
  var effects
  for (var next = value; next; next = next.$after) {
    if (next.$cause == watcher && next.$caller == value)
      (effects || (effects = [])).push(next)
  }
  return effects
}

G.effects.clean = function(value, effects) {
  for (var i = 0; i < effects.length; i++) {
    for (var next = value; next; next = next.$after)
      if (next === effects[i])
        break;
      else if (next === G.$called) {
        next = undefined;
        break;
      }
    if (!next)
      G.uncall(effects[i])
  }  
}

G.last = function(value) {
  var last = value;
  for (var after = value; after = after.$after;)
    if (after.$caller === value)
      last = after;
  if (last !== value)
    return G.last(last)
  else
    return last;
} 

G.isLinked = function(value) {
  return value.$caller && (!value.$before || value.$before.$after == value);
}

// find used properties in callbacks like this.author.name
G.$findProperties = /[a-zA-Z0-9_]+\s*\.\s*(?:[_a-zA-Z-0-9.\s]+)\s*(?:\()?/g
// clean up property, cut off chained method call
G.$cleanProperty = /(?:.|^)\s*([_a-zA-Z-0-9]+)\s*(\()|\s*/g


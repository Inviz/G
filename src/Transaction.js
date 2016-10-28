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

// Process side effects 
G.affect = function(value, old, observers) {
  if (observers == null) {                          // migrate automatically
    var watchers = value.$context.$watchers;        // Watchers configuration for whole context
    if (watchers)                                   // is stored in sub-object
      var group = watchers[value.$key]

    var observers = value.$context.$observers;
    var iterators = value.$context[value.$key].$iterators;
    var present, removed

    // Reapply 
    for (var after = value; after = after.$after;) {
      if (after.$caller !== value) continue;
      var cause = after.$cause;
      if (observers && observers.indexOf(cause) > -1
      ||  iterators && iterators.indexOf(cause) > -1
      ||  group     &&     group.indexOf(cause) > -1) {
        after.call('restore');
        (present || (present = [])).push(cause)
      } else {
        (removed || (removed = [])).push(after)
      }
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
  if (observers)
    for (var i = 0; i < observers.length; i++)
      if (!present || present.indexOf(observers[i]) == -1)
        G.callback(value, observers[i], old, true);
  if (iterators)
    for (var i = 0; i < iterators.length; i++)
      if (!present || present.indexOf(iterators[i]) == -1)
        if (!value.$iterators || value.$iterators.indexOf(iterators[i]) == -1)
          G.callback(value, iterators[i], old, true);

  return value;
}

G.$callers = [];


// register operation in graph
G.record = function(value, old) {
  
}

G.record.sequence = function(value, old) {
  if (old && old.$after && old.$after !== value)      // 1. Updating effect graph:
    if (!old.$multiple && !value.$multiple)
      value.$after = old.$after;                      //    Remember old value's next op (1-way)
  if (old && G.$caller && old.$caller == G.$caller) {       //    If new value has the same caller as old
    G.link(G.unformatted(old).$before, value);        //    Connect new value to old's previous ops
  } else if (G.$called) {                             // 2. Tracking side effects:  
    G.link(G.$called, G.unformatted(value))           //    Continue writing at parent's point
  } else if (G.$caller){
    G.link(G.head(G.$caller), G.unformatted(value))
  }
  return value;
}

G.record.push = function(value) {
  G.$callers.push(G.$caller);
  return G.$caller  = G.$called = value                    // Reassign call stack pointers 
};

G.record.pop = function() {
   
  if (G.$called && G.$called.$after)                // When updating side effects, link to next ops is 1-way 
    G.link(G.$called, G.$called.$after)             // Foreign pointer is set here
    
  G.$caller = G.$callers.pop();                               // Revert global pointers to previous values 
  if (!G.$caller || !G.$caller.$context)
    G.$called = null;
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

G.record.rewrite = function(value) {
  G.record.sequence(value);
  return G.record.write(value);  
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

G.reify = function(value, target) {
  if (!target) target = value;
  if (value.$source.$context == target.$context     // If origin matches context and key
    && value.$source.$key == target.$key) {                
    return value.$source;                           // Use origin object instead of reference
  } else {
    var result = new G(value);                     
    result.$key = target.$key;
    result.$context = target.$context;
    result.$meta = value.$meta;
    return result;
  }
}

G.reify.reuse = function(target, source) {          // If plain JS object was referenced
  if (!source.$source.observe) {                    // Use G object as value
    target.$meta = source.$meta;
    return target;
  } else {
    return source
  }
}

// Make a two-way connection between two operations in graph
G.link = function(old, value) {
  if ((old.$after = value))
    old.$after.$before = old;
}

// Remove all operations from the graph in span between `from` and `to`
G.unlink = function(from, to, hard) {
  if (from.$before) {                           // If there're operation before
    //if (from.$before.$after == to)
    G.link(from.$before, to.$after);            //   Connect previous & next operations
  } else if (to.$after) {                       // Or if it was first,
    to.$after.$before = undefined               //   Shift history 
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

// find used properties in callbacks like this.author.name
G.$findProperties = /[a-zA-Z0-9_]+\s*\.\s*(?:[_a-zA-Z-0-9.\s]+)\s*(?:\()?/g
// clean up property, cut off chained method call
G.$cleanProperty = /(?:.|^)\s*([_a-zA-Z-0-9]+)\s*(\()|\s*/g


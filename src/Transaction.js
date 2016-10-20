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
  if (formatters)                                   // is stored in weak map
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
  var caller = G.$caller; 
  var called = G.$called;                           // For duration of function call
  G.$caller  = G.$called = value                    // Reassign call stack pointers 
  

  if (observers == null) {                          // migrate automatically
    var context = value.$context
    var watchers = context.$watchers           // Formatters configuration for whole context
    if (watchers)                                     // is stored in weak map      
      var group = watchers[value.$key]

    var observers = context.$observers;
    var present, removed

    // Reapply 
    for (var after = value; after = after.$after;) {
      if (after.$caller !== value) continue;
      var cause = after.$cause;
      if (observers && observers.indexOf(cause) > -1
           || group &&     group.indexOf(cause) > -1) {
        G.restore(after.$context, after.$key, after, after.$meta);
        (present || (present = [])).push(cause)
      } else {
        (removed || (removed = [])).push(after)
      }
    }
    if (removed)
      for (var i = 0; i < removed.length; i++) {
        var recalled = G.uncall(removed[i]);
        if (value.$after == recalled)
          value.$after = G.formatted(removed[i]).$after
      }
    if (group)
      for (var i = 0; i < group.length; i++)
        if (!present || present.indexOf(group[i]) == -1)
          G.callback(value, group[i], old, true);
  }
  if (observers)
    for (var i = 0; i < observers.length; i++)
      if (!present || present.indexOf(observers[i]) == -1)
        G.callback(value, observers[i], old, true);

   
  if (G.$called && G.$called.$after)                             // When updating side effects, link to next ops is 1-way 
    G.link(G.$called, G.$called.$after)             // Foreign pointer is set here
  G.$caller = caller;                               // Revert global pointers to previous values 
  G.$called = called;
  return value;
}

// register operation in graph
G.record = function(value, old, method, last, transform) {
  if (transform) {                                  // 1. Formatting values        
    value.$transform = transform;                   //    Store transformation function
    G.link(last, value)                             //    Keep reference to input value 
  } else {
    if (value.$value) {                                   // If shallow reference is used as value
      var origin = value;
      value = new G(origin.$value);
      value.$key = origin.$key
      value.$context = origin.$context
    }
    var caller = G.$caller;                         // Store pointer to caller operation
    if (caller) {
      value.$caller = caller; 
      var called = G.$called || G.head(caller)      // Rewind transaction to last operation
    }
    if (G.$cause)
      value.$cause = G.$cause;
    if (old && old.$after !== value)                // 2. Updating effect graph:
      value.$after = old.$after;                    //    Remember old value's next op (1-way)
    if (old && caller && old.$caller == caller) {   //    If new value has the same caller as old
      G.link(G.unformatted(old).$before, value);    //    Connect new value to old's previous ops
    } else if (called) {                            // 3. Tracking side effects:  
      G.link(called, G.unformatted(value))          //    Continue writing at parent's point
    }   
    if (G.$called) G.$called = value;               // Global: Remember operation as last
  }
  return value;
},

// Run callback with the given value
G.callback = function(value, watcher, old, cause) {
  if (watcher.$transform) {
    watcher = watcher.$transform
  } else if (watcher.$getter) {
    var computed = G.compute(watcher);                //    Invoke computation callback
    if (computed == null) {                           //    Proceed if value was computed
      var current = watcher.$context[watcher.$key];
      if (current)
        G.uncall(current, watcher.$meta)
      return
    } else {
      var result = G.extend(computed, watcher.$context, watcher.$key);
      result.$meta = watcher.$meta;
      return G.call(result, 'set')
    }
  // live merging objects
  } else if (typeof watcher == 'object') {
    if (watcher.$value) { // merge observer
      if (watcher.$method) {
        return G[watcher.$method](watcher.$context[watcher.$key], value.$key, value, watcher.$meta)
      } else {
        return G.set(watcher.$value, value.$key, value)
      }
    } else {
      return G.set(watcher, value.$key, value)
    }
  }
  if (cause) {
    var caused = G.$cause
    G.$cause = watcher;
  }
  var transformed = watcher(value, old);
  if (cause)
    G.$cause = caused;
  if (transformed == null)
    return value;
  if (!transformed.$context) {
    transformed = G.fork(transformed, value);
  }
  return G.record(transformed, old, null, value, watcher);
},

// Make a two-way connection between two operations in graph
G.link = function(old, value) {
  if ((old.$after = value))
    old.$after.$before = old;
},

// Remove all operations from the graph in span between `from` and `to`
G.unlink = function(from, to, hard) {
  if (from.$before) {                           // If there're operation before
    G.link(from.$before, to.$after);            //   Connect previous & next operations
  } else if (to.$after) {                       // Or if it was first,
    to.$after.$before = undefined               //   Shift history 
  }    
  if (hard)                                     // A top-level recall() needs to
    to.$after = undefined                       // clean last op's reference to next operations
},

// Run computed property callback if all properties it uses are set
G.compute = function(value) {
  var getter = value.$getter;
  var args = getter.$arguments;
  if (!args)
    args = G.analyze(getter).$arguments;
  for (var i = 0; i < args.length; i++)
    if (value.$context[args[i]] === undefined)
      return;
  return getter.call(value.$context);
},

// Parse function to see which properties it uses
G.analyze = function(fn) {
  if (!fn.$arguments) {
    var string = String(fn)
    fn.$arguments = []
    for (var match; match = G.$findProperties.exec(string);)
      if (!match[2])
        fn.$arguments.push(match[1])
  }
  return fn;
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
},

// Find last operation in graph
G.head = function(value) {
  while (value.$after)
    value = value.$after
  return value
},

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

G.$findProperties = /this\s*\.\s*([_a-zA-Z-0-9]+)\s*(\()?/g


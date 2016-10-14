G.Modules.Observer = {

  // Maintain depth-first double linked list of current operations 
  // It is used to compute difference in state and quickly 
  // switch branches of state without recomputation 
  record: function(value, old, method, previous, transform) {
    if (transform) {                                          // I. Formatting values        
      value.$transform = transform;                           // Store transformation function
      value.$before = previous;                               // Keep reference to input value 
      value.$before.$after = value;                           // Make value aware of transformation
      if (previous.$after && !previous.$after.$transform) {   // Connect to operations coming next
        value.$after = previous.$after;
      }
    } else {
      if (G.callee) {
        value.$callee = G.callee;
      }
      if (method) {                                           // II. Updating effect graph:
        if (old) {                                            // Switch operation in state graph 
          if (old.$after !== value) {                         // Does not update foreign pointer
            value.$after = old.$after;                        //   until the end of affect() call 
          }
        }   
        if (G.called) {                                       // III. Tracking side effects:  
          value.$before = G.called;                           // Connect current and previous ops
          value.$before.$after = value;                       // in dependency graph
        }
        G.called = value;                                     // Global: Remember operation as last
      }                                                       //   until the end of affect() call
    }
    if (value.$after === value ||                             // Sanity check dev assert
      (value.$before && 
        value.$before.$after === value.$before)) {
      throw 'zomg circular';
    }
    return value;
  },

  // Process pure value transformations 
  format: function(value, old) {
    var formatters = G.formatters.get(value.$context)         // Formatters configuration for whole context
    if (formatters)                                           // is stored in weak map
      var group = formatters[value.$key];
  
    var given = value
    while (value.$after && value.$after.$transform)           // Use value as it was formatted previosly
      value = value.$after;

    if (G.formatterz.get(value) === group) {                  // I: Value is already properly formatted 
      return value                                            //   return it
    } else {                                                  // II: Value not (yet) properly formatted
      var after = value.$after                                //   remember pointer to next operation
      while (value.$transform)                                //   get original value
        value = value.$before;
      if (group && group.length) {                            
        for (var i = 0, len = group.length; i < len; i++)     // Context has formatters for key
          value = G.callback(value, group[i], old);           //   apply formatters in order
        G.formatterz.set(value, group);                       //   remember formatting configuration
      } else if (value.$after.$transform) {                   // Context doesnt have formatters for key
        G.formatterz["delete"](value);                        //   clean up old configuration
      }
      value.$after = after;                                   // Connect formatted value to next operation 
      if (after)
        after.$before = value;
      G.rebase(given, value);                                 // Replace value in the stack of values for key
    }
    return value;
  },

  // Process side effects 
  affect: function(value, old) {
    var current;
    var watchers = G.watchers.get(value.$context)
    if (watchers)                                           
      var group = watchers[value.$key]

    // Set GLOBAL pointers 
    var callee = G.callee;                                 // For duration of function call
    var called = G.called;                                 // Reassign call stack pointers 
    G.called = G.callee = value;
    
    var current = G.watcherz.get(value)                       
    if (current) {    
      if (current === group) {                             // I: Side effects are already propagated
        var reapplied = G.effects(value, G.call);          // Attempt to find them in graph
      } else {                                             // II: Watcher configuration has changed
        G.effects(value, G.recall);                        // Recall previous effects
      }                                                 
    }

    if (!reapplied) {                                       
      if (group && group.length) {                         // III: Watchers need to be notified of new value 
        G.watcherz.set(value, group);                      // Store watcher configuration for the value
        for (var i = 0, len = group.length; i < len; i++)  // Invoke callbacks in order
          value = G.callback(value, group[i], old);
      } else if (current) {                                // IV: Previous watchers are removed
        G.watcherz.delete(value)                           // Delete watcher configuration
      }
    }
   
    G.callee = callee;                                     // Revert global pointer to previous source 
    G.called = callee && called;
    return value;
  },
  reaffect: function(value) {},

  // Remove side effects 
  effects: function(value, callback) {
    var after, last;
    after = value;
    while (after = after.$after) {
      if (after.$callee === value) {
        last = callback(after) || true;
      }
    }
    return last;
  },

  // Run callback with the given value
  callback: function(value, watcher, old) {
    var transform, transformed;
    transform = typeof watcher === 'function' ? watcher : watcher.$transform;
    transformed = transform(value, old);
    if (transformed == null) {
      return value;
    }
    if (!transformed.$context) {
      transformed = G.fork(transformed, value);
    }
    return G.record(transformed, old, null, value, transform);
  }
};


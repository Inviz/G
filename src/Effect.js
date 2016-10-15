// Maintain depth-first double linked list of current operations 
// It is used to compute difference in state and quickly 
// switch branches of state without recomputation 

G.Modules.Observer = {

  // Process pure value transformations 
  format: function(value, old) {
    var formatters = G.formatters.get(value.$context) // Formatters configuration for whole context
    if (formatters)                                   // is stored in weak map
      var group = formatters[value.$key];
  
    var formatted = G.Formatted(value)                // Use value as it was formatted previously
    var current = G.formatters.get(formatted)         // Get formatter configuration for the value
    if (current === group) {                          // 1. Value is already properly formatted 
      return formatted                                //    return it
    } else {
    var after = formatted.$after                                          // 2. Value not (yet) properly formatted
      var result = G.Unformatted(value)               //    get original value
      if (group) {                            
        for (var i = 0, j = group.length; i < j; i++) // Context has formatters for key
          result = G.callback(result, group[i], old); //   apply formatters in order
        G.formatters.set(result, group);              //   remember formatting configuration
      }
      if (value != result) {
        G.rebase(value, result);                      // Replace value in the stack of values for key
      }
      if (result.$after = after)
        result.$after.$before = result;               // Connect formatted value to next operation 
      
      return result;                                   
    }
  },

  // Process side effects 
  affect: function(value, old) {
    var current;
    var watchers = G.watchers.get(value.$context)     // Formatters configuration for whole context
    if (watchers)                                     // is stored in weak map      
      var group = watchers[value.$key]

    var caller = G.$caller, called = G.$called;       // For duration of function call
    G.$caller = G.$called = value                     // Reassign call stack pointers 
    
    var current = G.watchers.get(value)               
    if (current) {    
      if (current === group) {                        // 1. Side effects are already propagated
        var reapplied = G.Effects(value, G.call);     //    Attempt to find them in graph
      } else {                                        // 2. Watcher configuration has changed
        var recalled = G.Effects(value, G.recall);    //    Recall previous effects
      }                                                 
    }

    if (group && !reapplied) {                        // 3. Watchers need to be notified of new value 
      G.watchers.set(value, group);                   //    Store watcher configuration for the value
      for (var i = 0, j = group.length; i < j; i++)   //    Invoke callbacks in order
        value = G.callback(value, group[i], old);
    } else if (recalled) {                            // 4. All watchers were recalled, 
      value.$after = recalled.$after &&               //    Value needs to point to next op after
                     G.Formatted(recalled.$after)     //    last recalled effect
    }
     
    if (G.$called && G.$called.$after)                // When updating side effects, link to next ops is 1-way 
      G.link(G.$called, G.$called.$after)             // So foreign pointer needs to be set after
    G.$caller = caller;                               // Revert global pointer to previous values 
    G.$called = called;
    return value;
  },

  // register operation in graph
  record: function(value, old, method, last, transform) {
    if (transform) {                                  // 1. Formatting values        
      value.$transform = transform;                   //    Store transformation function
      G.link(last, value)                             //    Keep reference to input value 
      if (last.$after && !last.$after.$transform)     //    Connect to operations coming next
        value.$after = last.$after;
    } else {
      var caller = G.$caller;                         // Store pointer to caller operation
      if (caller) {
        value.$caller = caller   
        var called = G.$called || G.Head(caller)      // Rewind transaction to last operation
      }                                               
      if (method) {                                   
        if (old && old.$after !== value)              // 2. Updating effect graph:
          value.$after = old.$after;                  //    Remember old value's next op (1-way)
        if (old && caller && old.$caller == caller) { //    If new value has the same caller as old
          G.link(G.Unformatted(old).$before, value);  //    Connect new value to old's previous ops
        } else if (called) {                          // 3. Tracking side effects:  
          G.link(called, G.Unformatted(value))        //    Continue writing at parent's point
        } 
        if (G.$called) G.$called = value;             // Global: Remember operation as last
      }                                               // until the end of affect() call
    }

    if (value.$after === value ||  (value.$before && value.$before.$after === value.$before))
      throw 'zomg circular';                          // dev assert

    return value;
  },

  // Run callback with the given value
  callback: function(value, watcher, old) {
    if (watcher.$transform)
      watcher = watcher.$transform
    var transformed = watcher(value, old);
    if (transformed == null)
      return value;
    if (!transformed.$context)
      transformed = G.fork(transformed, value);
    return G.record(transformed, old, null, value, watcher);
  },

  // Make a two-way connection between two operations in graph
  link: function(old, value) {
    old.$after = value;
    old.$after.$before = old;
  },

  // Find last operation in graph
  Head: function(value) {
    while (value.$after)
      value = value.$after
    return value
  },

  // Find result of last transformation over value
  Formatted: function(value) {
    while (value.$after && value.$after.$transform)
      value = value.$after
    return value
  },

  // Find value before transformations
  Unformatted: function(value) {
    while (value.$transform)
      value = value.$before
    return value
  },

  // Iterate side effects caused by value 
  Effects: function(value, callback) {
    var after, last;
    after = value;
    while (after = after.$after) {
      if (after.$caller === value) {
        last = callback(after) || true;
      }
    }
    return last;
  }
};


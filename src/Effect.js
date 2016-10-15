G.Modules.Observer = {

  // Maintain depth-first double linked list of current operations 
  // It is used to compute difference in state and quickly 
  // switch branches of state without recomputation 
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
        var called = G.$called  || G.Head(caller)     // Rewind transaction to last operation
      }                                               
      if (method) {                                   
        if (old && old.$after !== value)              // 2. Updating effect graph:
          value.$after = old.$after;                  //    Remember old value's next op
        if (old && value.$caller &&                   // If new value has the same caller as old
            old.$caller == value.$caller) {
          G.link(G.Unformatted(old).$before, value);  // Connect new value to old's previous ops
        } else if (called) {                          // 3. Tracking side effects:  
          G.link(called, G.Unformatted(value))        // Continue writing at parent's point
        } 
        if (G.$called) G.$called = value;             // Global: Remember operation as last
      }                                               // until the end of affect() call
    }

    if (value.$after === value ||  (value.$before && value.$before.$after === value.$before))
      throw 'zomg circular';                          // dev assert

    return value;
  },

  // Process pure value transformations 
  format: function(value, old) {
    var formatters = G.formatters.get(value.$context) // Formatters configuration for whole context
    if (formatters)                                   // is stored in weak map
      var group = formatters[value.$key];
  
    var given = value
    while (value.$after && value.$after.$transform)   // Use value as it was formatted previosly
      value = value.$after;

    var current = G.formatters.get(value)
    if (current === group) {                          // I: Value is already properly formatted 
      return value                                    //   return it
    } else {                                          // II: Value not (yet) properly formatted
      var after = value.$after                        //   remember pointer to next operation
      while (value.$transform)                        //   get original value
        value = value.$before;
      if (group) {                            
        for (var i = 0, j = group.length; i < j; i++) // Context has formatters for key
          value = G.callback(value, group[i], old);   //   apply formatters in order
        G.formatters.set(value, group);               //   remember formatting configuration
      }
      value.$after = after;                           // Connect formatted value to next operation 
      if (after)
        after.$before = value;
      if (given != value)
        G.rebase(given, value);                       // Replace value in the stack of values for key
    }
    return value;
  },

  // Process side effects 
  affect: function(value, old) {
    var current;
    var watchers = G.watchers.get(value.$context)     // Formatters configuration for whole context
    if (watchers)                                     // is stored in weak map      
      var group = watchers[value.$key]

    var caller = G.$caller;                           // For duration of function call
    var called = G.$called;                           // Reassign call stack pointers 
    G.$caller = value;
    G.$called = value
    
    var current = G.watchers.get(value)               
    if (current) {    
      if (current === group) {                        // I: Side effects are already propagated
        var reapplied = G.effects(value, G.call);     // Attempt to find them in graph
      } else {                                        // II: Watcher configuration has changed
        var last = G.effects(value, G.recall);        // Recall previous effects
      }                                                 
    }

    if (group && !reapplied) {                        // III: Watchers need to be notified of new value 
      G.watchers.set(value, group);                   // Store watcher configuration for the value
      for (var i = 0, j = group.length; i < j; i++)   // Invoke callbacks in order
        value = G.callback(value, group[i], old);
    } else if (last) {
      if (value.$after = last.$after)
        while (value.$after.$after && value.$after.$after.$transform)
          value.$after = value.$after.$after
    }
     
    var last = G.$called || value
    if (last.$after)
      last.$after.$before = last
    G.$caller = caller;                               // Revert global pointer to previous source 
    G.$called = called;
    return value;
  },

  // Iterate side effects caused by value 
  effects: function(value, callback) {
    var after, last;
    after = value;
    while (after = after.$after) {
      if (after.$caller === value) {
        last = callback(after) || true;
      }
    }
    return last;
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

  link: function(old, value) {
    old.$after = value 
    old.$after.$before = old
  },

  Head: function(value) {
    while (value.$after)
      value = value.$after
    return value
  },

  Formatted: function() {
    while (value.$after && value.$after.$transform)
      value = value.$after
    return value
  },

  Unformatted: function(value) {
    while (value.$transform)
      value = value.$before
    return value
  }
};


/*

Operations also have three pairs of pointers that 
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
    } else {                                          // 2. Value not (yet) properly formatted
      var result = G.Unformatted(value)               //    get original value
      var after = formatted.$after                    //    remember next operation
      if (group) {                            
        for (var i = 0, j = group.length; i < j; i++) // Context has formatters for key
          result = G.callback(result, group[i], old); //   apply formatters in order
        G.formatters.set(result, group);              //   store formatting configuration
      }
      G.rebase(value, result);                        // Replace value in the stack of values for key
      G.link(result, after)
      return result;                                   
    }
  },

  // Process side effects 
  affect: function(value, old) {
    var current;
    var watchers = G.watchers.get(value.$context)     // Formatters configuration for whole context
    if (watchers)                                     // is stored in weak map      
      var group = watchers[value.$key]

    var caller = G.$caller; 
    var called = G.$called;                            // For duration of function call
    G.$caller  = G.$called = value                     // Reassign call stack pointers 
    
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
     
    if (G.$called.$after)                             // When updating side effects, link to next ops is 1-way 
      G.link(G.$called, G.$called.$after)             // Foreign pointer is set here
    G.$caller = caller;                               // Revert global pointer to previous values 
    G.$called = called;
    return value;
  },

  // register operation in graph
  record: function(value, old, method, last, transform) {
    if (transform) {                                  // 1. Formatting values        
      value.$transform = transform;                   //    Store transformation function
      G.link(last, value)                             //    Keep reference to input value 
    } else {
      var caller = G.$caller;                         // Store pointer to caller operation
      if (caller) {
        value.$caller = caller; 
        var called = G.$called || G.Head(caller)      // Rewind transaction to last operation
      } 
      if (old && old.$after !== value)              // 2. Updating effect graph:
        value.$after = old.$after;                  //    Remember old value's next op (1-way)
      if (old && caller && old.$caller == caller) { //    If new value has the same caller as old
        G.link(G.Unformatted(old).$before, value);  //    Connect new value to old's previous ops
      } else if (called) {                          // 3. Tracking side effects:  
        G.link(called, G.Unformatted(value))        //    Continue writing at parent's point
      } 
      if (G.$called) G.$called = value;             // Global: Remember operation as last
    }
    return value;
  },

  // Run callback with the given value
  callback: function(value, watcher, old) {
    if (watcher.$transform) {
      watcher = watcher.$transform
    } else if (watcher.$getter) {
      return G.set(watcher.$context, watcher.$key, watcher)
    }
    var transformed = watcher(value, old);
    if (transformed == null)
      return value;
    if (!transformed.$context)
      transformed = G.fork(transformed, value);
    return G.record(transformed, old, null, value, watcher);
  },

  // Make a two-way connection between two operations in graph
  link: function(old, value) {
    if ((old.$after = value))
      old.$after.$before = old;
  },

  // Remove all operations from the graph in span between `from` and `to`
  unlink: function(from, to, hard) {
    if (from.$before) {                           // If there're operation before
      G.link(from.$before, to.$after);            //   Connect previous & next operations
    } else if (to.$after) {                       // Or if it was first,
      to.$after.$before = undefined               //   Shift history 
    }    
    if (hard)                                     // A top-level recall() needs to
      to.$after = undefined                       // clean last op's reference to next operations
  },

  // Run computed property callback if all properties it uses are set
  compute: function(value) {
    var getter = value.$getter;
    var args = getter.$arguments;
    if (!args)
      args = G.analyze(getter).$arguments;
    for (var i = 0; i < args.length; i++)
      if (value.$context[args[i]] === undefined)
        return;
    return getter.call(value.$context);
  },

  analyze: function(fn) {
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
  transact: function(value) {
    return G.$caller = value || new G
  },

  // Undo all state changes since transaction has started
  abort: function(value) {
    last = G.Effects(value, G.recall, false)
    if (G.$caller == value)
      G.$caller = undefined
    return last;
  },

  // Reapply previously aborted transaction
  commit: function(value) {
    return G.Effects(value, G.call, false);
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
  Effects: function(value, callback, argument) {
    var after, last;
    after = value;
    while (after = after.$after) {
      if (after.$caller === value) {
        last = callback(after, argument) || after;
      }
    }
    return last;
  }
};

G.$findProperties = /this\s*\.\s*([_a-zA-Z-0-9]+)\s*(\()?/g


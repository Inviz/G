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
  var caller = G.$caller; 
  var called = G.$called;                           // For duration of function call
  G.$caller  = G.$called = value                    // Reassign call stack pointers 
  

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

   
  if (G.$called && G.$called.$after)                // When updating side effects, link to next ops is 1-way 
    G.link(G.$called, G.$called.$after)             // Foreign pointer is set here
  G.$caller = caller;                               // Revert global pointers to previous values 
  if (caller && caller.$context) {
  }
  else
    G.$called = called;
  return value;
}

// register operation in graph
G.record = function(value, old) {
  var caller = G.$caller;                         
  if (caller) {
    var called = G.record.causation(value)        // Store pointer to caller operation
              || G.head(caller);                  // Rewind transaction to last operation
  }
  if (old && old.$after && old.$after !== value)  // 1. Updating effect graph:
    if (!old.$multiple && !value.$multiple)
      value.$after = old.$after;                    //    Remember old value's next op (1-way)
  if (old && caller && old.$caller == caller) {   //    If new value has the same caller as old
    G.link(G.unformatted(old).$before, value);    //    Connect new value to old's previous ops
  } else if (called) {                            // 2. Tracking side effects:  
    G.link(called, G.unformatted(value))          //    Continue writing at parent's point
  }
  return value;
}


// Record transformed value as a local effect
G.record.transformation = function(value, old, last, transform) {
  value.$transform = transform;                   //    Store transformation function
  G.link(last, value)                             //    Keep reference to input value 
  return value
}

// Write pointers to parent stack frame and to a triggering callback
G.record.causation = function(value) {
  if (G.$caller && G.$caller.$key == 'price')
    debugger
  value.$caller = G.$caller; 
  value.$cause = G.$cause;
  return G.$called
}

G.record.rewrite = function(value) {
  G.link(G.$called, value)
  G.$called = G.$caller && G.$caller.$context && value;
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
// Run callback with the given value
G.callback = function(value, watcher, old, cause) {
  if (typeof watcher == 'object') {
    if (watcher.$getter) {
      return G.callback.property(value, watcher);
    } else {
      return G.callback.proxy(value, watcher)
    }
  } else if (watcher.$properties) {
    return G.callback.iterator(value, old, cause, watcher);
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
  return G.record.transformation(transformed, old, value, watcher);
};

G.callback.iterator = function(value, old, cause, watcher) {

  if (watcher.$iteratee) // iterator called itself recursively, abort
    return

  var called = G.$called;
  var caller = G.$caller;
  var caused = G.$cause;
  G.$cause = watcher;

  if (!value.$iterators || value.$iterators.indexOf(watcher) == -1) {
    // if property changed, use its context
    G.$called =  G.$caller = value = value.$context;
  }
  if (value.$after) {
    var effects;
    for (var next = value; next; next = next.$after) {
      if (next.$cause == watcher && next.$caller == value)
        (effects || (effects = [])).push(next)
    }
  }
  var iteratee = watcher.$iteratee || null;
  watcher.$iteratee = value;

  watcher(value, old);
  watcher.$iteratee = iteratee
  if (effects) {
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
  G.$called = called;
  G.$caller = caller;
  G.$cause  = caused;

  return value
}

G.callback.proxy = function(value, watcher) {
  if (watcher.$source) { // merge observer
    if (watcher.$method) {
      return G[watcher.$method](watcher.$target, value.$key, value, watcher.$meta)
    } else {
      return G.set(watcher.$target, value.$key, value, watcher.$meta)
    }
  } else {
    return G.set(watcher, value.$key, value)
  }
}

G.callback.property = function(value, watcher) {
  var computed = G.compute(watcher, value);                //    Invoke computation callback
  var current = watcher.$context[watcher.$key];
  if (computed == null) {                           //    Proceed if value was computed
    if (current)
      G.uncall(current, watcher.$meta)
    return
  } else {
    if (computed.valueOf() == current)
      return;
    var result = G.extend(computed, watcher.$context, watcher.$key);
    result.$meta = watcher.$meta;
    return result.call('set')
  }
}

G.callback.transformation = function() {

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

// Run computed property callback if all properties it uses are set
G.compute = function(watcher, trigger) {
  var getter = watcher.$getter;
  var args = getter.$arguments;
  if (!args)
    args = G.analyze(getter).$arguments;
  for (var i = 0; i < args.length; i++) {
    var context = watcher.$context;
    var bits = args[i]
    for (var j = 0; j < bits.length; j++) {       
      if (trigger && trigger.$key == bits[j]     
        && trigger instanceof G) {               // When observer returned object
        trigger.watch(bits[j + 1], watcher);     //   Observe object for next key in path
      }
      if (!(context = context[bits[j]]))         // Proceed if argument has value
        return;
    }
  }
  return getter.call(watcher.$context);
},

// Parse function to see which properties it uses
G.analyze = function(fn) {
  if (!fn.$arguments) {
    var string = String(fn)
    var target = 'this'
    if (fn.length) {                                  // check if first argument is something else than value
      var args = string.match(/\(\s*([^\),\s]*)/)[1];
      if (args && args != 'value') {
        fn.$properties = []
        target = args
      }
    }
    if (string.indexOf('return') > -1)                // check if function returns any value
      fn.$mutating = true;                            // todo: better check
    fn.$arguments = [] 
    var m = string.match(G.$findProperties);          // find all property accessors
    for (var i = 0; i < m.length; i++) {     
      if (m[i].substring(0, target.length) != target  // proceed if starts with `this.` or `arg.`
       || m[i].charAt(target.length) != '.')
        continue
      var clean = m[i].substring(target.length + 1)   // skip prefix
                      .replace(G.$cleanProperty, ''); // clean out tail method call
      if (clean.length) {
        if (target == 'this')
          fn.$arguments.push(clean.split('.'))
        else
          fn.$properties.push(clean.split('.'))
      }
    }
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


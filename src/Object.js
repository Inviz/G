G.Modules.Object = {
  // Add observer for key, call it if there's a value with that key
  watch: function(context, key, watcher, pure) {
    var source = pure ? G.formatters : G.watchers
    var watchers = source.get(context)
    if (!watchers)
      source.set(context, watchers = {});
    if (watchers[key]) {                              // Adding watcher creates new array
      watchers[key] = watchers[key].concat(watcher);  // Array's identity is used as a tag to 
    } else {                                          // recompute stale values
      watchers[key] = [watcher];
    }

    var value = context[key]
    if (value) {
      while (value.$transform)        
        value = value.$before;
      if (!value.$context) {                          // 1. Value was not unboxed yet
        return G.set(context, key, value);            //    Apply primitive value 
      } else if (pure) {                              // 2. New formatter is added 
        return G.call(value, 'set');                  //    Re-apply value 
      } else {                                        // 3. New value observer       
        return G.affect(value);                       //    Update side effects    
      }
    }
  },

  // Remove key observer and undo its effects
  unwatch: function(context, key, watcher, pure) {
    var source = pure ? G.formatters : G.watchers
    var watchers = watchers = source.get(context);
    if (watchers && watchers[key]) {                  
      watchers[key] =                                 // Removing a watcher creates new array 
        watchers[key].filter(function(other) {        // Array's identity is used as a tag to  
          return other !== watcher;                   // recompute stale values
        });
      if (!watchers[key].length)
        watchers[key] = undefined
    }

    if (value = context[key]) {      
      if (pure) {                                     // 1. Removing a value formatter
        return G.call(value, 'set');                  //    Reapply value
      } else {                                        // 2. Removing an observer
        return G.affect(value);                       //    Update side effects
      }
    }
  },

  // Merge two objects
  merge: function(context, object, meta, scope) {
    var key, op, value;
    for (key in object) {
      value = object[key];
      op = G(context, key, value, meta, scope);
    }
    return op;
  }
};

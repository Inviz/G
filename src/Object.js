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

  define: function(context, key, watcher) {
    G.analyze(watcher);
    var observer = new G(context, key)
    observer.$getter = watcher
    observer.$meta = new Array(arguments.length - 3);
    for (var i = 0; i < arguments.length - 3; i++)
      observer.$meta[i] = arguments[i + 3]
    for (var i = 0; i < watcher.$arguments.length; i++)
      G.watch(context, watcher.$arguments[i], observer, false)
  },

  undefine: function(context, key, watcher) {
    var value = context[key];
    if (value) {
      if (arguments.length > 3) {
        var args = new Array(arguments.length - 3);
        for (var i = 0; i < arguments.length - 3; i++)
          args[i] = arguments[i + 3]
      }
      value = G.match(args, value);
      if (value)
        G.recall(value)
    }
  },

  // Merge two objects
  merge: function(context, object, meta, scope) {
    var key, op, value;
    for (key in object) {
      value = object[key];
      op = G.set(context, key, value, meta, scope);
    }
    return op;
  },
  
  get: function(context, key, value) {
    if (context[key] == null || !context[key].$context)
      return context[key];

    var offset = 2;
    if (value == null)
      offset++
    if (arguments.length > offset) {
      var meta = new Array(arguments.length - offset); 
      for (var i = 0; i < arguments.length - offset; i++)
        meta[i] = arguments[i + offset]
    }
    return G.match(meta, context[key]);
  }
};

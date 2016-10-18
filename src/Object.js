// Add observer for key, call it if there's a value with that key
G.watch = function(context, key, watcher, pure) {
  if (pure) {
    var watchers = context.$formatters
    if (!watchers) watchers = context.$formatters = {}
  } else {
    var watchers = context.$watchers
    if (!watchers) watchers = context.$watchers = {}
  }
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
G.unwatch = function(context, key, watcher, pure) {
  var watchers = pure ? context.$formatters : context.$watchers
  if (watchers && watchers[key]) {                  
    watchers[key] =                                 // Removing a watcher creates new array 
      watchers[key].filter(function(other) {        // Array's identity is used as a tag to  
        return other !== watcher;                   // recompute stale values
      });
    if (!watchers[key].length)
      watchers[key] = undefined
  }

  var value = context[key];
  if (value) {      
    if (pure) {                                     // 1. Removing a value formatter
      return G.call(value, 'set');                  //    Reapply value
    } else {                                        // 2. Removing an observer
      return G.affect(value);                       //    Update side effects
    }
  }
};

// Add computed property
G.define = function(context, key, watcher) {
  G.analyze(watcher);
  var observer = new G(context, key)
  observer.$getter = watcher
  var offset = 3;
  observer.$meta = new Array(arguments.length - offset);
  for (var i = 0; i < arguments.length - offset; i++)
    observer.$meta[i] = arguments[i + offset]
  for (var i = 0; i < watcher.$arguments.length; i++)
    G.watch(context, watcher.$arguments[i], observer, false)
}

// Remove computed property
G.undefine = function(context, key, watcher) {
  var value = context[key];
  if (value) {
    var offset = 3;
    if (arguments.length > offset) {
      var args = new Array(arguments.length - offset);
      for (var i = 0; i < arguments.length - offset; i++)
        args[i] = arguments[i + offset]
    }
    value = G.match(args, value);
    if (value)
      G.recall(value)
  }
}

// Get value that matches meta arguments
G.get = function(context, key, value) {
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

// Check if key is enumerable
G.has = function(context, key) {
  return (context.hasOwnProperty(key)
   && typeof context[key] != 'function' 
   && key.charAt(0) != '$')
}


// Merge two objects
G.merge = function(context, object) {
  for (var key in object) {
    if (object.hasOwnProperty(key)
    &&  G.has(object, key)) { 
      var value = object[key];
      var op = G.set(context, key, value);
    }
  }
  return op;
}

// Merge two objects and subscribe for updates
G.observe = function(context, watcher) {
  if (context.watch)
    if (context.$observers)
      context.$observers.push(watcher)
    else 
      context.$observers = [watcher]

  return G.merge(context, watcher);
}
// Iterate keys
G.each = function(context, callback) {
  for (var key in context) {
    if (context.hasOwnProperty(key)
    &&  G.has(context, key)) {
      callback.call(context, key, context[key]);
    }
  }
  return context;
},

// Export to clean javascript object
G.clean = function(context) {
  var result = {}
  for (var key in context) {
    if (!G.has(context, key)) continue;
    result[key] = context[key];
  }
  return result
},

// Serialize to json
G.stringify = function(context) {
  return JSON.stringify(G.clean(context))
}



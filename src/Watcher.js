/*
  Three kinds of lightweight observers:
  1) `watch/unwatch`:               Watch object key for changes
    1.1) Value transformer          – Returns altered copy of value
    1.2) Watcher with side effects  – Sets other valused in response to changes
  2) `observe/unobserve`:           Observe all object keys for changes
    2.1) Callback with side effects – Triggers a function when any of keys change
    2.2) Another object as callback – merges objects and propagates changes 
  3) `define/undefine`:             Computed property 
    Observes multiple keys, creates a single value updates when keys change. 

  None of those method create a state change, so they should not be nested 
  into each other. Developer is responsible to call pair undoing method
  if observer needs to be removed.
*/

// Add observer for key, call it if there's a value with that key
G.prototype.watch = function(key, watcher, pure) {
  if (pure) {
    var watchers = this.$formatters
    if (!watchers) watchers = this.$formatters = {}
  } else {
    var watchers = this.$watchers
    if (!watchers) watchers = this.$watchers = {}
  }
  if (watchers[key]) {                              // Adding watcher creates new array
    watchers[key] = watchers[key].concat(watcher);  // Array's identity is used as a tag to 
  } else {                                          // recompute stale values
    watchers[key] = [watcher];
  }
  var value = this[key]
  if (value) {
    while (value.$transform)        
      value = value.$before;
    if (!value.$context) {                          // 1. Value was not unboxed yet
      return G.set(this, key, value);               //    Apply primitive value 
    } else if (pure) {                              // 2. New formatter is added 
      return G.call(value, 'set');                  //    Re-apply value 
    } else {                                        // 3. New value observer       
      var after = value.$after;                     // Get pointer to next operation
      G.record.push(value)
      var method = G.callback.dispatch(watcher)
      method(value, watcher);
      G.record.pop(value)
      if (after)
        G.link(G.head(value), after)                // Patch graph
    }
  }
}

// Remove key observer and undo its effects
G.prototype.unwatch = function(key, watcher, pure) {
  var watchers = pure ? this.$formatters 
                      : this.$watchers;
  if (watchers && watchers[key]) {                  
    watchers[key] =                                 // Removing a watcher creates new array 
      watchers[key].filter(function(other) {        // Array's identity is used as a tag to  
        return other !== watcher;                   // recompute stale values
      });
    if (!watchers[key].length)
      watchers[key] = undefined
  }

  var value = this[key];
  if (value) {      
    if (pure) {                                     // 1. Removing a value formatter
      return G.call(value, 'set');                  //    Reapply value
    } else {                                        // 2. Removing an observer
      G.record.push(value)
      G.callback.revoke(value, watcher);                       //    Update side effects
      G.record.pop(value)
      return value;
    }
  }
};

G.prototype.unwatch.object = function(context, key, value) {    
  var parent = context.$watchers[key];              
  if (parent) {   
    for (var i = 0; i < parent.length; i++) {       // Check if this key was observed
      if (!parent[i].$getter) continue;    
      var args = parent[i].$getter.$arguments;      //   by a watcher with complex arguments
      if (!args) continue;   
      for (var j = 0; j < args.length; j++) {       // check if it observed a property in current object
        if (args[i].length > 1) {   
          var anchor = args[i].indexOf(key);        // find property in accessor chain
          var prop = args[i][anchor + 1];           // get next property if any
          value.unwatch(prop, parent[i]);           // remove observer from detached object
        }
      }
    }
  }
}

// Add computed property
G.prototype.define = function(key, callback) {
  G.analyze(callback);
  var observer = new G(this, key)
  observer.$getter = callback
  if (arguments.length > 2)
    observer.$meta = Array.prototype.slice.call(arguments, 2);
  for (var i = 0; i < callback.$arguments.length; i++)
    G.watch(this, callback.$arguments[i][0], observer, false)
}

// Remove computed property
G.prototype.undefine = function(key, callback) {
  for (var i = 0; i < callback.$arguments.length; i++) {
    var args = callback.$arguments[i]
    var argument = callback.$arguments[i];

    var context = this;
    for (var j = 0; j < args.length; j++) {
      var watchers = context.$watchers[argument[j]];
      for (var k= 0; k < watchers.length; k++) {
        if (watchers[k].$getter == callback && watchers[k].$key == key) {
          G.unwatch(context, args[j], watchers[k], false)
        }
      }
      context = context[args[j]]
      if (!context)
        break;
    }
  }
}

// Merge two objects
G.prototype.merge = function(object) {
  if (typeof object != 'string') {
    if (object.watch)
      return G.verbs.merge(object, this);

    var keys = Object.keys(object);
    for (var i = 0, key; key = keys[i++];)
      if (key.charAt(0) != '$')
        G.set(this, key, object[key]);
    return this;
  }
  return G.prototype.$merge.apply(this, arguments);
}

// Merge object underneath (not shadowing original values)
G.prototype.defaults = function(object) {
  if (typeof object != 'string') {
    if (object.watch)
      return G.verbs.defaults(object, this);

    var keys = Object.keys(object);
    for (var i = 0, key; key = keys[i++];)
      if (key.charAt(0) != '$')
        G.preset(this, key, object[key]);
    return this;
  }
  return G.prototype.$defaults.apply(this, arguments);
}

// Merge two G objects and subscribe for updates
G.prototype.observe = function(source, preset) {
  if (!source.watch) {
    return this.merge(source);
  } else if (source.$source) {
    var target = source;
    target.$target = this;
    source = source.$source;
    if (!source.watch) {
      return this.merge(source);
    }
  } else {
    var target = this;
  }
  var watchers = [target]

  if (!this.$chain) {
    this.$chain = [source]
  } else if (preset) {
    this.$chain.unshift(source)
  } else {
    this.$chain.push(source)
  }
  if (source.$observers)
    source.$observers.push(target)
  else 
    source.$observers = [target]
  
  var keys = Object.keys(source);
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$') {
      G.record.push(source[key])
      G.callback.proxy(source[key], target);
      G.record.pop()
    }
  return this;
};

G.prototype.unobserve = function(source) {
  if (source.$source) {
    var target = source;
    source = source.$source;
  } else {
    var target = this;
  }
  var index = this.$chain.indexOf(source);
  if (index > -1)
    this.$chain.splice(index, 1)
  var index = source.$observers.indexOf(target);
  if (index == -1)
    return this;
  source.$observers.splice(index, 1);
  var keys = Object.keys(source);
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$') {
      G.record.push(source[key]);
      G.callback.revoke(source[key], target)
      G.record.pop()
    }
}
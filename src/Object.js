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
      return G.set(this, key, value);            //    Apply primitive value 
    } else if (pure) {                              // 2. New formatter is added 
      return G.call(value, 'set');                  //    Re-apply value 
    } else {                                        // 3. New value observer       
      return G.affect(value);                       //    Update side effects    
    }
  }
},

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
      return G.affect(value);                       //    Update side effects
    }
  }
};

// Add computed property
G.prototype.define = function(key, watcher) {
  G.analyze(watcher);
  var observer = new G(this, key)
  observer.$getter = watcher
  if (arguments.length > 2)
    observer.$meta = Array.prototype.slice.call(arguments, 2);
  for (var i = 0; i < watcher.$arguments.length; i++)
    G.watch(this, watcher.$arguments[i], observer, false)
}

// Remove computed property
G.prototype.undefine = function(key, watcher) {
  var value = this[key];
  if (value) {
    if (arguments.length > 2)
      var meta = Array.prototype.slice.call(arguments, 2);
    var found = G.match(meta, value);
    if (found)
      G.uncall(found)
  }
}

// Get value that matches meta arguments
G.prototype.get = function(key, value) {
  if (this[key] == null || !this[key].$context)
    return this[key];
  var arity = (this.watch ? 1 : 2) + (value == null ? 0 : 1)
  if (arguments.length > arity)
    var meta = Array.prototype.slice.call(arguments, arity);
  return G.match(meta, this[key]);
}

// Check if key is enumerable
G.prototype.has = function(key) {
  return (this.hasOwnProperty(key)
   && typeof this[key] != 'function' 
   && key.charAt(0) != '$')
}


// Merge two objects
G.prototype.merge = function(object) {
  for (var key in object) {
    if (object.hasOwnProperty(key)
    &&  G.has(object, key)) { 
      var value = object[key];
      var op = G.set(this, key, value);
    }
  }
  return op;
}

// Merge two objects and subscribe for updates
G.prototype.observe = function(watcher) {
  if (this.watch)
    if (this.$observers)
      this.$observers.push(watcher)
    else 
      this.$observers = [watcher]

  return G.merge(this, watcher);
};

// Iterate keys
G.prototype.each = function(callback) {
  var keys = Object.keys(this);
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$')
      callback.call(this, key, this[key]);
  return this;
};

// Export to clean javascript object
G.prototype.clean = function() {
  var result = {}
  var keys = Object.keys(this);
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$')
      result[key] = this[key]
  return result
};

// Serialize to json
G.prototype.stringify = function() {
  return JSON.stringify(G.clean(this))
};



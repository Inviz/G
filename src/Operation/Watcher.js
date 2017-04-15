/*
  Three kinds of lightweight observers:
  1) `watch/unwatch`:               Watch object key for changes
  2) `observe/unobserve`:           Observe all object keys for changes
    2.1) Callback with side effects – Triggers a function when any of keys change
    2.2) A  her object as callback – merges objects and propagates changes 
  3) `define/undefine`:             Producing new values
    3.1) Value transformer          – Returns altered copy of value
    3.2) Compound value             – Observes multiple keys

  None of those method create a state change, so they should not be nested 
  into each other. Developer is responsible to call pair undoing method
  if observer needs to be removed.

  Functions in this file are exported as:
  - object methods, like `object.watch(key, callback)`
  - generics, like `G.watch(object, key, callback)`
*/

// Add observer for key, call it if there's a value with that key
G.prototype.watch = function(key, watcher, watching) {
  if (!watcher || (typeof watcher != 'function' && !watcher.$context)) 
    watcher = G.callback.pass;
  
  if (!watcher.$arguments)
    G.analyze(watcher);
  var value = this[key], meta;
  if (watcher.$returns) {
    var cb = watcher;
    watcher = new G.future(this, key)
    watcher.$getter = cb
    watcher.$future = true
    watcher.valueOf = G.future._getValue;
  }
  if (G._addWatcher(this, key, watcher, '$watchers') === false)
    return
  if (watcher.$computing) return;
      
  if (value) {
    while (value.$transform)        
      value = value.$before;
    if (!value.$context) {                          // 1. Value was not unboxed yet
      return G.set(this, key, value);               //    Apply primitive value 
    } else {                                        // 2. New value observer
      var head = value;
      while (head.$previous)
        head = head.$previous;
      for (; head; head = head.$next) {       
        var after = head.$after;                     // Get pointer to next operation
        G.record.push(head)
        var method = G.callback.dispatch(watcher)
        method(head, watcher);
        G.record.pop(head)
        if (after)
          G.record.link(G.record.head(head), after);  // Patch graph
      }
    }
  }

  G.future.watch(this, key, watcher);
  return watcher;
};


// Remove key observer and undo its effects
G.prototype.unwatch = function(key, watcher, pure) {
  var value = this[key];
  G._removeWatcher(this, key, watcher, '$watchers');
  //G._revokeEffect(value, watcher)
  if (value) {      
    G.record.push(value)
    G.callback.revoke(value, watcher);              //    Update side effects
    G.record.pop(value)
  }
  G.future.unwatch(this, key, watcher);
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
  if (callback == null) {
    callback = key;
    key = undefined
  }
  G.analyze(callback);
  if (!callback.$arguments.length) {                  // 1. Adding value formatter
    G._addWatcher(this, key, callback, '$formatters');
    var current = this[key];
    if (!current) return;
    if (current.$previous) {
      var values = G.Array.slice(this[key]);
      for (var i = 0; i < values.length; i++)
        var result = G.call(values[i])
    } else {
      if (!current.$context) {                        // If Value was not unboxed yet
        var result = G.set(this, key, current);       //   Turn primitive value to G op 
      } else {
        var result = G.call(current, null);           // Re-apply value 
      }
    }
    return result;
  } else {                                            
    var observer = new G.future(this, key)            // 2. Adding computed property
    if (!key) {
      observer.$future = true;
      observer.valueOf = G.future._getValue
    }
    observer.$getter = callback
    if (arguments.length > 2)
      observer.$meta = Array.prototype.slice.call(arguments, 2);

    G.future.watch(this, key, observer)
    return observer;
  }
}

// Remove computed property
G.prototype.undefine = function(key, callback) {
  if (callback == null) {
    callback = key;
    key = undefined
  }
  if (!callback.$arguments.length) {
    G._removeWatcher(this, key, callback, '$formatters');
    var current = this[key];
    if (!current) return;
    if (current.$previous) {
      var values = G.Array.slice(this[key]);
      for (var i = 0; i < values.length; i++)
        var result = G.call(values[i])
    } else {
      var result = G.call(current, null)
    }
  } else {
    G.future.unwatch(this, key, callback);
  }
}

// Merge two objects
G.prototype.merge = function(object) {
  if (typeof object != 'string') {
    var meta;
    for (var i = 0; i < arguments.length - 1; i++)
      (meta || (meta = []))[i] = arguments[i + 1];

    if (object.watch)
      return G.verbs.merge(object, this, meta);

    var keys = Object.keys(object);
    for (var i = 0, key; key = keys[i++];) {
      var value = object[key];
      if (key.charAt(0) != '$' && value != null) {
        if (value.$computed)
          value = value(this);

        if (value != null && value.valueOf().constructor === Array) {
          for (var j = 0; j < object[key].length; j++)
            G.push(this, key, object[key][j], meta);
        } else {
          G.merge(this, key, value, meta);
        }
      }
    }
    return this;
  }
  return G.prototype._merge.apply(this, arguments);
}

// Merge object underneath (will not shadow own values)
G.prototype.defaults = function(object) {
  if (typeof object != 'string') {
    var meta
    for (var i = 0; i < arguments.length - 1; i++)
      (meta || (meta = []))[i] = arguments[i + 1];

    if (object.watch)
      return G.verbs.defaults(object, this, meta);

    var keys = Object.keys(object);
    for (var i = 0, key; key = keys[i++];) {
      var value = object[key];
      if (key.charAt(0) != '$' && value != null) {
        if (typeof value == 'function')
          value = value(this);

        if (typeof value == 'object' && 'length' in object[key]) {
          for (var j = value.length; j--;)
            G.unshift(this, key, value[j], meta);
        } else {
          G.defaults(this, key, value, meta);
        }
      }
    }
    return this;
  }
  return G.prototype._defaults.apply(this, arguments);
}

// Merge two G objects and subscribe for updates
G.prototype.observe = function(source, method, meta) {
  if (method === true)
    method = 'defaults';
  else if (!method)
    method = 'merge';
  if (typeof this[method] != 'function') {
    meta = method;
    method = 'merge';
  }

  
  if (typeof source == 'function' || source.$future){// 1. Trigger callback when any of object keys change
    var target = source;                             // source.observe(function(){})
    var source = this;

  } else if (!source.watch) {                        // 2. Merge plain static javascript object
    return this[method].apply(this, arguments);      //    source.observe({a: 1})
  
  } else if (source.$source) {                       // 3. Chain G.Object by shallow-reference
    if (!meta) meta = source.$meta;                  //    source.observe(reference)
    if (!source.$source.watch) {
      source.$method = method;
      source.$target = this;
      G.meta.set(source, meta);
      return this[method](source.$source, meta);
    }
    source = source.$source;
    var target = source;
    G.meta.set(target, meta);
    target.$method = method;
    target.$target = this;
  
  } else if (meta == null) {                          // 4. Chain G.Object (merge & subscribe)
    var target = this;

  } else {
    var target = new G.future;                        // 5. Chain G.Object with explicit meta
    G.meta.set(target, meta);                         //    source.observe(target, null, ['meta1', 'meta2'])
    target.$method = method;
    target.$target = this;
  }

  if (source !== this) {
    if (!this.$chain) {
      this.$chain = [source]
    } else if (method === 'defaults') {
      this.$chain.unshift(source)
    } else {
      this.$chain.push(source)
    }
  }
  if (source.$observers)                              // Subscribe to future changes
    source.$observers.push(target)
  else 
    source.$observers = [target]
  
  var keys = Object.keys(source);                     
  var called = G.$called;                             
  var cause = G.$cause;
  G.$cause = this; 
  var callback = G.callback.dispatch(target);         
  for (var i = 0, key; key = keys[i++];)              // Iterate keys in source object
    if (key.charAt(0) != '$') {
      G.record.push(source[key], true)                // Record effects to source value's graph
      callback(source[key], target);                  // Invoke callback 
      G.record.pop()                                  
    }
  G.$cause = cause;
  G.$called = called;
  return this;
};

G.prototype.unobserve = function(source) {
  if (source.$source) {
    var target = source.$target || source;
    var meta = source.$meta;
    source = source.$source;
  } else if (typeof source == 'function' || source.$future) {
    var target = source;
    source = this;
  } else {
    var target = this;
  }
  if (source.$observers) {
    var i = this.$chain.indexOf(source);
    if (i > -1)
      this.$chain.splice(i, 1)
    for (var i = 0; i < source.$observers.length; i++) {
      if (source.$observers[i] == target ||
          source.$observers[i].$target == target)
        break;

    }
    if (i == source.$observers.length)
      return this;
    source.$observers.splice(i, 1);
  }
  var keys = Object.keys(source);
  var called = G.$called;
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$') {
      var issuer = source.watch ? source[key] : target;
      G.record.push(issuer);
      if (source[key] instanceof G && this[key] instanceof G && this[key] != source[key]) {
        this[key].unobserve(source[key])
      } else {
        if (source.watch)
          G.callback.revoke(source[key], target)
        else
          target.unset(key, source[key], meta)
      }
      G.record.pop()
    }
  G.$called = called;
}

G._observeProperties = function(array, callback) {
  var properties = (callback.$getter || callback).$properties
  if (properties) {
    for (var j = 0; j < properties.length; j++)
      G.watch(array, properties[j][0], callback)
  }
}

G._unobserveProperties = function(array, callback) {
  var properties = (callback.$getter || callback).$properties
  if (properties) {
    for (var j = 0; j < properties.length; j++)
      G.unwatch(array, properties[j][0], callback)
  }
}

G._addWatcher = function(self, key, watcher, property) {
  var watchers = self[property]
  if (!watchers) watchers = self[property] = {}
  if (watchers[key]) {                              // Adding watcher creates new array
    if (watchers[key].indexOf(watcher) > -1)
      return false
    watchers[key] = watchers[key].concat(watcher);  // Array's identity is used as a tag
  } else {                                          // to recompute stale values
    watchers[key] = [watcher];
  }  
}

G._removeWatcher = function(self, key, watcher, property) {
  var watchers = self[property];
  if (watchers && watchers[key]) {                  
    watchers[key] =                                 // Removing a watcher creates new array 
      watchers[key].filter(function(other) {        // Array's identity is used as a tag 
        return other !== watcher                    // to recompute stale values
            && other.$getter !== watcher;           
      });
    if (!watchers[key].length)
      watchers[key] = undefined
  }
}

G._revokeEffect = function(value, cause) {
  var effects = G.effects.caused(value, cause);
  if (effects) {
    for (var i = 0; i < effects.length; i++) {
      G.revoke(effects[i])
    }
  }
}


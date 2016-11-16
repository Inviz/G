

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
    if (key.charAt(0) != '$') {
      if (this[key] && this[key] instanceof G) {
        result[key] = this[key].clean()
      } else {
        result[key] = this[key]
      }
    }
  return result
};

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

G.prototype.unset = function(key, value) {
  if (value.$future) {
    return G.Future.unsubscribe(this, key, value);
  }
  var arity = 2;
  if (arguments.length > arity)                         // Use/merge extra arguments as meta
    for (var meta = [], i = 0; i < arguments.length - arity; i++)
      meta[i] = arguments[i + arity];

  G.stack(this, key, value, meta, G.uncall);
}

// Serialize to json
G.prototype.stringify = function() {
  return JSON.stringify(G.clean(this))
};

G.notify = function(context, key, value, old) {
  if (key) {
    if (context.onChange)                               
      context.onChange(key, value, old)
    
    if (old instanceof G && context.$watchers) {
      context.unwatch.object(context, key, old);
    }
  }
}

G.reify = function(value, target) {
  if (value.$source && value.$source.$composable) { // Composable objects are adopted
    value.$source.$key = value.$key;                // Rewrite object's key/context to new owner
    value.$source.$context = value.$context;
    return value.$source;
  }
  if (value.$target && value.$target.$after)        // fixme: Reified before?
    return value.$target;
  if (!target) target = value;
  if (value.$source.$context == target.$context     // If origin matches context and key
    && value.$source.$key == target.$key) {                
    return value.$source;                           // Use origin object instead of reference
  } else {
    var result = new G(value);                     
    result.$key = target.$key;
    result.$context = target.$context;
    result.$meta = value.$meta;
    value.$target = result;
    return result;
  }
}

G.reify.reuse = function(target, source) {          // If plain JS object was referenced
  if (!source.$source.observe) {                    // Use G object as value
    target.$meta = source.$meta;
    return target;
  } else if (target.$key == source.$key && target.$context == source.$context && target.$chain && target.$chain.indexOf(source.$source || source) == -1) { // reusing previously reified object
    target.observe(source)
    return target;
  } else {
    return source
  }
}
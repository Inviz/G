

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



// Serialize to json
G.prototype.stringify = function() {
  return JSON.stringify(G.clean(this))
};

G.notify = function(context, key, value, old) {
  if (context.onChange)                               
    context.onChange(key, value, old)
  
  if (old instanceof G && context.$watchers) {
    context.unwatch.object(context, key, old);
  }
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
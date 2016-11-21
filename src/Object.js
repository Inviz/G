

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
  if (!this.hasOwnProperty(key) || this[key] == null || !this[key].$context)
    return this[key];
  var arity = (this.watch ? 1 : 2) + (value == null ? 1 : 0)
  if (arguments.length > arity)
    var meta = Array.prototype.slice.call(arguments, arity);
  return G.history.match(meta, this[key]);
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

  G.history.matches(this, key, value, meta, G.uncall);
}

// Serialize to json
G.prototype.stringify = function() {
  return JSON.stringify(G.clean(this))
};

G.prototype.transfer = function(context, key) {
  //if (value.$context && value.$key)
  this.$key = key;
  this.$context = context; 
  return this;
}

G.getLength = function(object) {
  var length = 0;
  var keys = Object.keys(object);
  for (var j = 0; j < keys.length; j++) {
    if (keys[j].charAt(0) == '$')
      continue
    length++;
  }
  return length;
}

G.notify = function(context, key, value, old) {
  if (key) {
    if (context.onChange)                               
      context.onChange(key, value, old)
    
    if (old instanceof G && context.$watchers) {
      context.unwatch.object(context, key, old);
    }
  }
}
/*
  Observable objects are dictionaries on steroids.
  They allow outside objects to listen for changes.
  
  G.Operation is a triplet of `context`, `key` and `value` 
  as in `context[key] = value`. G objects are containers 
  for named state changes.

  It is possible to treat any javascript object as observable
  with generic versions of the functions like:
    - `G.each(object, callback)`
    - `G.watch(object, key, callback)`
    - `G.set(object, key, value)`
*/

// Iterate keys
G.prototype.each = function(callback) {
  var keys = Object.keys(this);
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$')
      callback.call(this, key, this[key]);
  return this;
};

// Export to clean javascript object
G.prototype.clean = function(shallow) {
  var result = {}
  var keys = Object.keys(this);
  if (this instanceof Array)
    shallow = true;
  for (var i = 0, key; key = keys[i++];)
    if (key.charAt(0) != '$') {
      if (this[key] && this[key].$previous && !shallow) {
        var first = this[key]
        while (first.$previous)
          first = first.$previous;
        result[key] = [];
        for (var next = first; next; next = next.$next) {
          if (next && next instanceof G) {
            result[key].push(next.clean())
          } else {
            result[key].push(next)
          }
        }
      } else {
        if (this[key] && this[key] instanceof G) {
          result[key] = this[key].clean()
        } else {
          result[key] = this[key]
        }
      }
    }
  return result
};

// Serialize nested object to query string
G.prototype.toString = function(prefix) {
  var keys = Object.keys(this);
  var result = '';
  if (!prefix)
    prefix = '';
  for (var j = 0; j < keys.length; j++) {
    if (keys[j].charAt(0) == '$')
      continue;
    var value = this[keys[j]];
    if (value == null)
      continue;
    
    while (value.$previous)
      value = value.$previous; 
    if (value.$next) {
      var i = 0;
      for (var i = 0; value; i++) {
        if (typeof value.valueOf() == 'object') {
          var string = value.toString(prefix + keys[j] + '[' + i + ']');
          if (string)
            result += (result ? '&' : '') + string
        } else {
          var subkey = prefix ? prefix + '[' + keys[j] + ']' : keys[j];
          result += (result ? '&' : '') + subkey + '[]=' + encodeURIComponent(value);
        }
        value = value.$next;
      }
    } else {
      if (typeof value.valueOf() == 'object') {
        var string = value.toString(prefix + keys[j] + '[' + i + ']');
        if (string)
          result += (result ? '&' : '') + string;
      } else {
        var subkey = prefix ? prefix + '[' + keys[j] + ']' : keys[j];
        result += (result ? '&' : '') + subkey + '=' + encodeURIComponent(value)
      }
    }
  }
  return result;
}

// Get value that matches meta arguments
G.prototype.get = function(key, value) {
  if (!this.hasOwnProperty(key) || this[key] == null || !this[key].$context)
    return this[key];
  var arity = (this.watch ? 1 : 2) + (value == null ? 1 : 0)
  if (arguments.length > arity)
    for (var meta = [], i = 0; i < arguments.length - arity; i++)
      meta[i] = arguments[i + arity];
  return G.stack.match(meta, this[key]);
}

// Check if key is enumerable
G.prototype.has = function(key) {
  return (this.hasOwnProperty(key)
   && typeof this[key] != 'function' 
   && key.charAt(0) != '$')
}

G.prototype.unset = function(key, value) {
  if (value.$future) {
    return G.future.unsubscribe(this, key, value);
  }
  var arity = 2;
  if (arguments.length > arity)                         // Use/merge extra arguments as meta
    for (var meta = [], i = 0; i < arguments.length - arity; i++)
      meta[i] = arguments[i + arity];

  G.stack.matches(this, key, value, meta, G.uncall);
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

G.getLength = function(object, own) {
  var length = 0;
  var keys = Object.keys(object);
  for (var j = 0; j < keys.length; j++) {
    if (keys[j].charAt(0) == '$')
      continue
    /* Properties set explicitly (not within callback)
      will be discarded when all objects are unmerged 

      Example:
      var data = {title: 'author'};
      context.person                              // null
      var person = context.merge('person', data); // {title: 'author'}
      context.person.set('name', 'Bob');          // {title: 'author', name: 'Bob'}
      context.unmerge('person', person)           
      context.person                              // null (not {name: 123})
    */
    if (!own || object[keys[j]] == null || object[keys[j]].$cause)
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
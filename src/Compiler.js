// Wrap functions, export methods to G namespace
// This function will be called initially
G.compile = function() {
  var verbs = G.compile.struct(G, {})
  for (var name in G) {
    // Find Uppercase methods
    var first = name.charAt(0)
    if (first == first.toUpperCase() && first != first.toLowerCase())
      verbs = G.compile.struct(G[name])
  }
  for (var property in G.prototype)
    if (!G.Future.prototype[property])
      G.Future.prototype[property] = G.Future.catchAll(property)
}
G.compile.struct = function(struct) {
  // Convert G.watch to G.prototype.watch
  for (var property in struct.prototype) {
    if (struct.prototype.hasOwnProperty(property) 
    && property.charAt(0) != '_'
    && property.charAt(0) != '$'
    && typeof struct.prototype[property] == 'function') {
      // function that accept `self` as first argument,
      // are patched up to use `this` in their prototype variants
      var instance = G.compile.method(struct.prototype[property], 'self')
      if (instance && (!struct[property] || property == 'call')) {
        struct[property] = instance
      } 
    }
  }

  if (struct.verbs) {
    for (var verb in struct.verbs) {
      var handler = struct.verbs[verb]
      if (struct.multiple)                            // Pass flag that allows method to set
        handler.multiple = struct.multiple            // multiple values /w same meta in array 
      G.verbs[verb]  = handler;                       // Plain callback    `G.verbs.set(value, old)`
      if (handler.binary)
        G['$' + verb]  = G.compile.binary(verb);        // Gerneric function `G.before(old, value)`
      else
        G['$' + verb]  = G.compile.unary(verb);        // Gerneric function `G.set(context)`

      if (!G[verb])
        G[verb]      = G['$' + verb]      
      if (!struct[verb])
        struct[verb] = G['$' + verb]    
      struct.prototype['$' + verb] = G.compile.verb(verb)     // Prototype method  `context.set()`
      if (!struct.prototype[verb])  
        struct.prototype[verb] = struct.prototype['$' + verb];
      if (!G.prototype[verb])
        G.prototype[verb] = struct.prototype['$' + verb];
    }
  }

};


// object.class.push('abc', 'cde')
G.compile.verb = function(verb) {
  return function(key, value) {
    if (value != null) {

      switch (arguments.length) {
        case 1:
        case 2:  var op = G.create(this, key, value); break;
        case 3:  var op = G.create(this, key, value, arguments[2]); break;
        case 4:  var op = G.create(this, key, value, arguments[2], arguments[3]); break;
        default: var op = G.create(this, key, value, arguments[2], arguments[3], arguments[4]); break;
      }
      if (op)
        return op.call(verb)
    } else if (this[key] != null) {
      switch (arguments.length) {
        case 1:
        case 2:  return this[key].recall();
        case 3:  return this[key].recall(arguments[2]);
        case 4:  return this[key].recall(arguments[2], arguments[3]);
        default: return this[key].recall(arguments[2], arguments[3], arguments[4]);
      }
    }
  };
}

G.compile.unary = function(verb) {
  return function(context, key, value) {
    if (value != null) {
      switch (arguments.length) {
        case 3:  return G.create(context, key, value).call(verb);
        case 4:  return G.create(context, key, value, arguments[3]).call(verb);
        case 5:  return G.create(context, key, value, arguments[3], arguments[4]).call(verb);
        default: return G.create(context, key, value, arguments[3], arguments[4], arguments[5]).call(verb);
      }
    } else if (this[key] != null) {
      switch (arguments.length) {
        case 2:
        case 3:  return context[key].recall();
        case 4:  return context[key].recall(arguments[3]);
        case 5:  return context[key].recall(arguments[3], arguments[4]);
        default: return context[key].recall(arguments[3], arguments[4], arguments[5]);
      }
    }
  };
};

// G.before(context, 'key', value, anchor)
// G.before(value, anchor)
G.compile.binary = function(verb) {
  return function(c, k, v, o) {
    if (arguments.length < 3 ||  o == null || o.$context !== c ||  o.$key != k) {
      switch (arguments.length) {
        case 2:  return G.create(k.$context, k.$key, c).call(verb, k);
        case 3:  return G.create(k.$context, k.$key, c, o).call(verb, k);
        case 4:  return G.create(k.$context, k.$key, c, o, arguments[4]).call(verb, k);
        default: return G.create(k.$context, k.$key, c, o, arguments[4], arguments[5]).call(verb, k);
      }
    } else {
      switch (arguments.length) {
        case 3:  return G.create(c, k, v).call(verb, o);
        case 4:  return G.create(c, k, v, arguments[4]).call(verb, o);
        case 5:  return G.create(c, k, v, arguments[4], arguments[4]).call(verb, o);
        default: return G.create(c, k, v, arguments[4], arguments[4], arguments[5]).call(verb, o);
      }
    }
  };
}

G.compile.method = function(fn, scope) {
  return function(context) {
    switch (arguments.length) {
      case 1: return fn.call(context)
      case 2: return fn.call(context, arguments[1])
      case 3: return fn.call(context, arguments[1], arguments[2])
      case 4: return fn.call(context, arguments[1], arguments[2], arguments[3])
      case 5: return fn.call(context, arguments[1], arguments[2], arguments[3], arguments[4])
      case 6: return fn.call(context, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5])
    }
  }
}



if (typeof global !== "undefined")
  global.G = G;
if (typeof window !== "undefined")
  window.G = G;
if (typeof module != "undefined")
  module.exports = G;
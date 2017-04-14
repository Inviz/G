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
      var instance = G.compile.wrapper(struct.prototype[property], 'self')
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
        G['$' + verb]  = G.compile.generic.binary(verb);        // Gerneric function `G.before(old, value)`
      else
        G['$' + verb]  = G.compile.generic(verb);        // Gerneric function `G.set(context)`

      if (!G[verb])
        G[verb]      = G['$' + verb]      
      if (!struct[verb])
        struct[verb] = G['$' + verb]   
      if (handler.binary) 
        struct.prototype['_' + verb] = G.compile.method.binary(verb) 
      else
        struct.prototype['_' + verb] = G.compile.method(verb) 
        // Prototype method  `context.set()`
      if (!struct.prototype[verb])  
        struct.prototype[verb] = struct.prototype['_' + verb];
      if (!G.prototype[verb])
        G.prototype[verb] = struct.prototype['_' + verb];
    }
  }

};


// object.push('class', 'cde')
G.compile.method = function(verb) {
  return function(key, value, a1, a2, a3) {
    if (value != null) {
      switch (arguments.length) {
        case 1:
        case 2:  var op = G.create(this, key, value); break;
        case 3:  var op = G.create(this, key, value, a1); break;
        case 4:  var op = G.create(this, key, value, a1, a2); break;
        default: var op = G.create(this, key, value, a1, a2, a3); break;
      }
      if (op)
        return op.call(verb)
    } else if (this[key] != null) {
      switch (arguments.length) {
        case 1:
        case 2:  return this[key].recall();
        case 3:  return this[key].recall(a1);
        case 4:  return this[key].recall(a1, a2);
        default: return this[key].recall(a1, a2, a3);
      }
    }
  };
}
// object.replace('class', 'cde', object.class)
// object.class.replace('cde')
G.compile.method.binary = function(verb) {
  return function(key, value, a1, a2, a3) {
    if (typeof key == 'object' && key.$key == value.$key && key.$context == value.$context) {
      return key.call(verb, value)
    } else if (typeof key == 'string'){
      // context.overlay('key', 'value1')
      switch (arguments.length) {
        case 1:
        case 2:  var op = G.create(this, key, value); break;
        case 3:  var op = G.create(this, key, value, a1); break;
        case 4:  var op = G.create(this, key, value, a1, a2); break;
        default: var op = G.create(this, key, value, a1, a2, a3); break;
      }
      if (op)
        return op.call(verb)
    } else { // context.overlay(value1, value2)
      switch (arguments.length) {
        case 1:
        case 2:  var op = G.create(this, key.$key, value); break;
        case 3:  var op = G.create(this, key.$key, value, a1); break;
        case 4:  var op = G.create(this, key.$key, value, a1, a2); break;
        default: var op = G.create(this, key.$key, value, a1, a2, a3); break;
      }
      if (op)
        return op.call(verb, key)
  }
  };
}

G.compile.generic = function(verb) {
  return function(context, key, value, a1, a2, a3) {
    if (value != null) {
      switch (arguments.length) {
        case 3:  return G.create(context, key, value).call(verb);
        case 4:  return G.create(context, key, value, a1).call(verb);
        case 5:  return G.create(context, key, value, a1, a2).call(verb);
        default: return G.create(context, key, value, a1, a2, a3).call(verb);
      }
    } else if (this[key] != null) {
      switch (arguments.length) {
        case 2:
        case 3:  return context[key].recall();
        case 4:  return context[key].recall(a1);
        case 5:  return context[key].recall(a1, a2);
        default: return context[key].recall(a1, a2, a3);
      }
    }
  };
};

// G.before(context, 'key', value, anchor)
// G.before(value, anchor)
G.compile.generic.binary = function(verb) {
  return function(c, k, v, o, a1, a2, a3) {
    if (typeof k == 'string') {
      if (v != null) {
        switch (arguments.length) {
          case 3:  return G.create(c, k, v).call(verb);
          case 4:  return G.create(c, k, v, o).call(verb);
          case 5:  return G.create(c, k, v, o, a1).call(verb);
          default: return G.create(c, k, v, o, a1, a2).call(verb);
        }
      } else if (this[k] != null) {
        switch (arguments.length) {
          case 2:
          case 3:  return context[k].recall();
          case 4:  return context[k].recall(a1);
          case 5:  return context[k].recall(a1, a2);
          default: return context[k].recall(a1, a2, a3);
        }
      }
    } else {
      if (o && o.$context) {
        switch (arguments.length) {
          case 3:  return G.create(c, k, v).call(verb, o);
          case 4:  return G.create(c, k, v, a1).call(verb, o);
          case 5:  return G.create(c, k, v, a1, a2).call(verb, o);
          default: return G.create(c, k, v, a1, a2, a3).call(verb, o);
        }
      } else {
        switch (arguments.length) {
          case 2:  return G.create(k.$context, k.$key, c).call(verb, k);
          case 3:  return G.create(k.$context, k.$key, c, o).call(verb, k);
          case 4:  return G.create(k.$context, k.$key, c, o, a1).call(verb, k);
          case 5:  return G.create(k.$context, k.$key, c, o, a1, a2).call(verb, k);
          default: return G.create(k.$context, k.$key, c, o, a1, a2, a3).call(verb, k);
        }
      }
    }
  };
}

G.compile.wrapper = function(fn, scope) {
  return function(context, a1, a2, a3, a4, a5) {
    switch (arguments.length) {
      case 1: return fn.call(context)
      case 2: return fn.call(context, a1)
      case 3: return fn.call(context, a1, a2)
      case 4: return fn.call(context, a1, a2, a3)
      case 5: return fn.call(context, a1, a2, a3, a4)
      case 6: return fn.call(context, a1, a2, a3, a4, a5)
    }
  }
}

G.compile.togglers = {};
G.compile.toggler = function(name) {
  if (G.compile.togglers[name])
    return G.compile.togglers[name];
  G.compile.togglers[name] = function(object) {
    if (object[name] == null)
      object.set(name, true);
    else
      object.unset(name)
  }
  G.compile.togglers[name].$computed = true;
  return G.compile.togglers[name];
}

G.compile()

G.Location(location);


if (typeof global !== "undefined")
  global.G = G;
if (typeof window !== "undefined")
  window.G = G;
if (typeof module != "undefined")
  module.exports = G;
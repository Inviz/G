// Wrap functions, export methods to G namespace
// This function will be called initially
G.compile = function() {
  G.compile.struct(G)
  for (var name in G) {
    // Find Uppercase methods
    var first = name.charAt(0)
    if (first == first.toUpperCase() && first != first.toLowerCase())
      G.compile.struct(G[name])
  }

}
G.compile.struct = function(struct) {
  // Convert G.watch to G.prototype.watch
  for (var property in struct) {
    if (struct.hasOwnProperty(property) 
    && property.charAt(0) != '_'
    && property.charAt(0) != '$'
    && typeof struct[property] == 'function') {
      // function that accept `context` or `self` as first argument,
      // are patched up to use `this` in their prototype variants
      var instance = G.compile.method(struct[property], 'context')
                  || G.compile.method(struct[property], 'self')
      if (instance)
        struct.prototype[property] = instance
    }
  }

  if (struct.verbs) {
    for (var verb in struct.verbs) {
      var handler = struct.verbs[verb]
      handler.multiple = struct.multiple
      G.verbs[verb]          = handler;
      G[verb] = struct[verb] = G.compile.setter(handler);
      struct.prototype[verb] = G.compile.verb(handler)
    }
  }

  return struct;
};

G.compile.verb = function(verb) {
  return function(key, value) {
    if (value == null) {
      switch (arguments.length) {
        case 1:
        case 2:  return G.recall(this[key]);
        case 3:  return G.recall(this[key], arguments[2]);
        case 4:  return G.recall(this[key], arguments[2], arguments[3]);
        default: return G.recall(this[key], arguments[2], arguments[3], arguments[4]);
      }
    } else {
      switch (arguments.length) {
        case 1:
        case 2:  return G.call(G.create(this, key, value), verb);
        case 3:  return G.call(G.create(this, key, value, arguments[2]), verb);
        case 4:  return G.call(G.create(this, key, value, arguments[2], arguments[3]), verb);
        default: return G.call(G.create(this, key, value, arguments[2], arguments[3], arguments[4]), verb);
      }
    }
  };
}

G.compile.setter = function(verb) {
  return function(context, key, value) {
    if (value != null) {
      switch (arguments.length) {
        case 3:  return G.call(G.create(context, key, value), verb);
        case 4:  return G.call(G.create(context, key, value, arguments[3]), verb);
        case 5:  return G.call(G.create(context, key, value, arguments[3], arguments[4]), verb);
        default: return G.call(G.create(context, key, value, arguments[3], arguments[4], arguments[5]), verb);
      }
    } else {
      switch (arguments.length) {
        case 2:
        case 3:  return G.recall(context[key]);
        case 4:  return G.recall(context[key], arguments[3]);
        case 5:  return G.recall(context[key], arguments[3], arguments[4]);
        default: return G.recall(context[key], arguments[3], arguments[4], arguments[5]);
      }
    }
  };
};
G.compile.method = function(fn, scope) {
  var string = fn.toString();
  if (string.indexOf('[native') > -1)
    return
  var arguments = string.slice(string.indexOf('(') + 1, string.indexOf(')'))
  var body = string.slice(string.indexOf('{') + 1, string.lastIndexOf('}'))

  if (arguments.indexOf(scope) == 0) {
    return new Function(
      arguments.replace(scope + ',', ''), 
      body.replace(new RegExp(scope, 'g'), 'this')
          .replace(/if\s*\(!this\)\s*return;/, '')
          // decrement argument counter if any
          .replace(/(var\s*offset\s*=\s*)(\d+)/, function(match, prefix, digit) {
            return prefix + (parseInt(digit) - 1);
          })
    )
  }
}



if (typeof global !== "undefined")
  global.G = G;
if (typeof window !== "undefined")
  window.G = G;
if (typeof module != "undefined")
  module.exports = G;
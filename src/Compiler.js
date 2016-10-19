// Wrap functions, export methods to G namespace
// This function will be called initially
G.compile = function() {
  var verbs = G.compile.struct(G, {})
  for (var name in G) {
    // Find Uppercase methods
    var first = name.charAt(0)
    if (first == first.toUpperCase() && first != first.toLowerCase())
      verbs = G.compile.struct(G[name], verbs)
  }

  if (verbs)
    for (var verb in verbs) {      
      G.watch[verb] = G.compile.observer(G.watch, verb)    // G.watch.set
      G.define[verb] = G.compile.observer(G.define, verb)  // G.watch.push
      G.prototype.watch[verb] = G.compile.observer(G.prototype.watch, verb)    // G.watch.set
      G.prototype.define[verb] = G.compile.observer(G.prototype.define, verb)  // G.watch.push
    }
}
G.compile.struct = function(struct, verbs) {


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
      if (instance) {
        if (property == 'watch' || property == 'define')
          instance
        struct.prototype[property] = instance
      }
    }
  }

  if (struct.verbs) {
    verbs[verb] = struct.verbs[verb];
    for (var verb in struct.verbs) {
      var handler = struct.verbs[verb]
      if (struct.multiple)                                 // Pass flag that allows method to set
        handler.multiple = struct.multiple                 // multiple values /w same meta in array 
      G.verbs[verb]          = handler;                    // Plain callback    `G.verbs.set(value, old)`
      G[verb] = struct[verb] = G.compile.setter(handler);  // Gerneric function `G.set(context)`
      struct.prototype[verb] = G.compile.verb(handler)     // Prototype method  `context.set()`
    }
  }
  return verbs;
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

G.compile.observer = function(fn, verb) {
  var string = fn.toString()
  var arguments = string.slice(string.indexOf('(') + 1, string.indexOf(')'))
  var body = string.slice(string.indexOf('{') + 1, string.lastIndexOf('}'))

  return new Function(
    arguments, 
    body.replace(/G.set/g, 'G.' + verb)
        .replace(/'set'/g, "'" + verb + "'")
  )

}

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
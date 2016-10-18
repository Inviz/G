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
      G.verbs[verb]          = handler;
      struct[verb]           = G.compile.setter(verb);
      struct.prototype[verb] = G.compile.verb(verb)
    }
  }

  return struct;
};

G.compile.verb = function(verb) {
  return function(key, value) {
    if (value == null) {
      var action = G.recall
      var getter = G.get
    } else {
      var action = G.call
      var getter = G.create
      var arg    = verb
    }

    switch (arguments.length) {
      case 1:
      case 2: var operation = getter(this, key, value); break;
      case 3: var operation = getter(this, key, value, arguments[2]); break;
      case 4: var operation = getter(this, key, value, arguments[2], arguments[3]); break;
      case 5: var operation = getter(this, key, value, arguments[2], arguments[3], arguments[4]);
    }

    return action(operation, arg);
  };
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
          // decrement argument counter if any
          .replace(/(var\s*offset\s*=\s*)(\d+)/, function(match, prefix, digit) {
            return prefix + (parseInt(digit) - 1);
          })
    )
  }
}

G.compile.setter = function(verb) {
  return function(context, key, value) {
    if (value != null) {
      if (context) {
        var operation = G.create.apply(G, arguments)
        if (operation != undefined)
          return G.call(operation, verb);
      } else {
        return operation;
      }
    } else {
      return G.recall(G.get.apply(G, arguments));
    }
  };
};


if (typeof global !== "undefined")
  global.G = G;
if (typeof window !== "undefined")
  window.G = G;
if (typeof module != "undefined")
  module.exports = G;
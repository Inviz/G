// A simple extension system:

G.Methods = {}; // New verbs for stateful operations that use G pipeline
G.Modules = {};	// New static methods for G namespace
G.methods = {};

// Wrap functions, export methods to G namespace
// This function will be called initially
G.Compile = function() {
  for (var name in G.Methods)
    G.Compile.Relation(G.Methods[name])

  for (var name in G.Modules) {
    var Module = G.Modules[name]
    for (var property in Module)
      G[property] = Module[property];
  }

  // All methods that accept context as first argument, 
  // are added to G prototype modified to use this
  for (var property in G) {
    if (typeof G[property] != 'function' || G.prototype[property])
      continue

    var method = G.Compile.InstanceMethod(G[property], 'context')
              || G.Compile.InstanceMethod(G[property], 'operation');
    if (method)
      G.prototype[property] = method
  }
}

// Convert relation definition into set of public methods 
// Uses special `wrapper`, `call` and `recall` values 
G.Compile.Relation = function(relation) {
  var method, property, value, wrapper;
  for (property in relation) {
    if (!relation.hasOwnProperty(property))
      continue;
    value = relation[property];
    if (property === 'method' || property === 'function') {
      continue;
    }
    G.methods[property] = value;
    G.prototype[property] = G.Compile.Method(property)
    G[property]           = G.Compile.Function(property);
  }
  return relation;
};

G.Compile.Method = function(method) {
  return function(key, value) {
    if (value == null) {
      var target = G.recall
      var getter = G.get
    } else {
      var target = G.call
      var getter = G.create
      var arg = method
    }

    switch (arguments.length) {
      case 1:
      case 2: var operation = getter(this, key, value); break;
      case 3: var operation = getter(this, key, value, arguments[2]); break;
      case 4: var operation = getter(this, key, value, arguments[2], arguments[3]); break;
      case 5: var operation = getter(this, key, value, arguments[2], arguments[3], arguments[4]);
    }

    return target(operation, arg);
  };
}

G.Compile.InstanceMethod = function(fn, scope) {
  var string = fn.toString();
  if (string.indexOf('[native') > -1)
    return
  var arguments = string.slice(string.indexOf('(') + 1, string.indexOf(')'))
  var body = string.slice(string.indexOf('{') + 1, string.lastIndexOf('}'))

  if (arguments.indexOf(scope) == 0) {
    return new Function(
      arguments.replace(scope + ',', ''), 
      body.replace(new RegExp(scope, 'g'), 'this')
    )
  }
}

G.Compile.Function = function(method) {
  return function(context, key, value) {
    if (value != null) {
      if (context) {
        var operation = G.create.apply(G, arguments)
        if (operation != undefined)
          return G.call(operation, method);
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
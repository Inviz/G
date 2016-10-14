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
    for (var property in Module) {
      G[property] = Module[property];
    }
  }

  if (arguments.length)
    if (this.toLowerCase)
      return G[this].apply(G, arguments)
    else if (this instanceof G.Compile)
      return new G(context, key, value)
    else
      return G.apply(G, arguments)

}

// Convert relation definition into set of public methods 
// Uses special `wrapper`, `call` and `recall` values 
G.Compile.Relation = function(relation) {
  var method, property, value, wrapper;
  for (property in relation) {
    value = relation[property];
    if (property === 'method' || property === 'function') {
      continue;
    }
    if (wrapper = relation["function"]) {
      G.methods[property] = value;
      G[property] = wrapper(property);
      if (method = relation.method) {
        G.prototype[property] = method(property);
      }
    } else {
      G[property] = value;
    }
  }
  return relation;
};

if (typeof global !== "undefined")
  global.G = G;
if (typeof window !== "undefined")
  window.G = G;
if (typeof module != "undefined")
  module.exports = G;
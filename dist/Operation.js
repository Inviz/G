(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

// Cause   - before/after 
// History - preceeding/succeeding 
// Group   - previous/next 
// user.posts.each 
// user.set 
// operation - transaction 
// Create operation - one property changed value 
// new G(target) - returns wrapper instance 
// G(target, key, value) - sets single value 
var G = function(context, key, value) {
  var operation;
  if ((value == null) && (key != null)) {
    return G.recall(G.find.apply(G, arguments), true);
  }
  operation = G.create.apply(this, arguments);
  if (context) {
    return G.call(operation, 'set');
  } else {
    return G.record(operation, null, 'set');
  }
};


// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.call = function(value, method) {
  var old = value.$context[value.$key];

  value = G.format(value, old);                  // Transform value 
  
  if (method && (old != null)) {                 // If there was another value by that key
    if (!old.$key) {
      value.$default = old;                      // That value is primitive, store it
    } else {
      var other = G.match(value, old)            // Find value with the same meta 
      if (other) {                            
        value = G.update(value, old, other);     //   then replace it in stack
      } else {
        G.methods[method](value, old);           // invoke stack-manipulation method
      }
    }
  }
  if (value !== old && !value.failed) {
    G.record(value, old, method);                // Place operation into dependency graph 
    value.$context[value.$key] = value;          // Actually change value 
    G.affect(value, old);                        // Apply side effects and invoke observers 
  }
  return value;
};


// Undo operation. Reverts value and its effects to previous versions. 
// If hard argument is set, removes operation from history 
G.recall = function(value, hard) {
  while (value.$after && value.$after.$transform) {
    value = value.$after;
  }

  var old = value.$context[value.$key];
  if (old === value) {                            // Undo operation if it's current
    if (value.$preceeding) {                      // If stack holds values before given
      return G.call(value.$preceeding);           //   Apply that value
    } else {    
      delete value.$context[value.$key];          // Otherwise remove value from context 
      return G.effects(value, G.recall) || value; // Remove side effects
    }
  }

  if (hard) {                                     // Remove value from history
    G.rebase(value, null);
  } 
};


// Enrich operation object (that may be created from primitive) 
G.create = function(context, key, value) {
  if (this instanceof G) {                        // If context is instance of G (created via `new G`) 
    var operation = this;                         // Use that object as operation
    if (value != null)
      operation.$value = value;
  } else {
    var operation = Object(value.valueOf());      // Get primitive and convert it to object 
  }


  
  if (key != null)
    operation.$key = key;                         // Store key
  if (context != null)
    operation.$context = context;                 // Store context, object that holds operations
  if (G.callee) 
    var meta = G.callee.$meta;                    // Pick up meta from calling operation


  var args = arguments.length;
  if (args > 3) {                                 // Use/merge extra arguments as meta
    if (meta)
      operation.$meta = meta.slice();
    else
      operation.$meta = new Array(args - 3);
    for (var i = 2; ++i < args;)
      if (arguments[i] != null)
        operation.$meta[i - 3] = arguments[i];
  }
  return operation;
};


// Clone operation from primitive and another operation 
G.fork = G.prototype.fork = function(primitive, value) {
  if (value == null)
    value = this;
  var op = G.create(value.$context, value.$key, primitive);
  if (value.$meta)
    op.$meta = value.$meta;
  return op;
};


// For each context, references object with Arrays of observers by key name 
G.watchers = new WeakMap;
G.formatters = new WeakMap;

G.watcherz = new WeakMap;
G.formatterz = new WeakMap;


// References current operation 
G.callee = G.called = null;

G.methods = {};
G.Methods = {}
G.Modules = {}

G.Compile = function() {
  for (var name in G.Methods)
    G.relate(G.Methods[name])

  for (var name in G.Modules) {
    var Module = G.Modules[name]
    for (var property in Module) {
      G[property] = Module[property];
    }
  }
}
setTimeout(G.Compile, 10)

// Convert relation definition into set of public methods 
// Uses special `wrapper`, `call` and `recall` values 
G.relate = function(relation) {
  var method, property, value, wrapper;
  for (property in relation) {
    value = relation[property];
    if (property === 'method' || property === 'function') {
      continue;
    }
    if (wrapper = relation["function"]) {
      this.methods[property] = value;
      this[property] = wrapper(property);
      if (method = relation.method) {
        this.prototype[property] = method(property);
      }
    } else {
      this[property] = value;
    }
  }
  return relation;
};


if (typeof global !== "undefined" && global !== null) {
  global.G = G;
}

if (typeof module != "undefined" && module !== null)
  module.exports = G;



}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);

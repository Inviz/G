
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
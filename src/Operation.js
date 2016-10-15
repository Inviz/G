/* G - State changes maintained in a graph

Single operation is a triplet of (context, key, value) 
and optional metadata arguments. Those are immutable.

Operations also have three pairs of pointers that 
make up linked lists:

Effect  - $before/$after + $caller
A graph of causation, doubles up as transaction. 

History - $preceeding/$succeeding 
A stack of concurrent values for the key of specific context

Group   - $previous/$next 
A groupping of values, similar to array.

*/

// Create operation - one property changed value 
// new G(target) - returns wrapper instance 
// G(target, key, value) - sets single value 
var G = function(context, key, value) {
  var operation;
  if ((value == null) && (key != null)) {
    return G.recall(G.find.apply(G, arguments), true);
  }
  operation = G.create.apply(this, arguments);
  if (!operation)
    return
  if (context && operation.valueOf() != null) {
    return G.call(operation, 'set');
  } else {
    return G.record(operation, null, 'set');
  }
};

// Enrich operation object (optionally, create it from primitive) 
G.create = function(context, key, value) {
  if (this instanceof G) {                             // If context is instance of G (created via `new G`) 
    var operation = this;                              // Use that object as operation
    if (value != null)                                 // Store value (usually value itself is operation)
      operation.$value = value;     
  } else if (value && value.$getter) {
    var computed = G.compute(value);
    if (computed == null)
      return
    var operation = Object(computed);
    operation.$meta = value.$meta
  } else {     
    var operation = Object(value.valueOf());           // Get primitive and convert it to object 
  }     
     
  if (key != null)     
    operation.$key = key;                              // Store key
  if (context != null)     
    operation.$context = context;                      // Store context, object that holds operations
   
  if (!operation.$meta && G.$caller)
    operation.$meta = G.$caller.$meta;                 // Pick up meta from caller operation
  var args = arguments.length;     
  if (args > 3) {                                      // Use/merge extra arguments as meta
    if (operation.$meta)
      operation.$meta = operation.$meta.slice();
    else
      operation.$meta = new Array(args - 3);
    for (var i = 2; ++i < args;)
      if (arguments[i] != null)
        operation.$meta[i - 3] = arguments[i];
  }
  return operation;
};

// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.call = function(value, method) {
  var old = value.$context[value.$key];
  value = G.format(value, old);                       // Transform value 
       
  if (method && (old != null)) {                      // If there was another value by that key
    if (!old.$key) {     
      value.$default = old;                           // That value is primitive, store it
    } else {     
      var other = G.match(value, old)                 // Find value with the same meta 
      if (other) {                                 
        value = G.update(value, old, other);          //   then replace it in stack
      } else {     
        G.methods[method](value, old);                // invoke stack-manipulation method
      }     
    }     
  }     
  if (value !== old && !value.failed) {     
    G.record(value, old, method);                     // Place operation into dependency graph 
    value.$context[value.$key] = value;               // Actually change value 
    G.affect(value, old);                             // Apply side effects and invoke observers 
  }
  return value;
};

// Undo operation. Reverts value and its effects to previous versions. 
// If hard argument is set, removes operation from history 
G.recall = function(value, hard) {
  value = G.Formatted(value)
  var old = value.$context[value.$key];
  if (old === value) {                                // 1. Return to previous version
    if (value.$preceeding) {                          //    If stack holds values before given
      return G.call(value.$preceeding);               //      Apply that value
    } else {    
      delete value.$context[value.$key];              // 2. Removing key from context 
      var from = G.Unformatted(value)                 //    Get initial value before formatting
      var to = G.Effects(value, G.recall, false)      //    Recurse to recall side effects, returns last one
      if (!to) to = value                             //      If there aren't any, use op itself as boundary
      if (hard !== false && !G.$called)
        G.unlink(from, to, true)                      //    Patch graph and detach the tree at top
    }    
  }    
  if (hard)                                           // Remove value from history
    G.rebase(value, null);
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
// For each operation, references array of observers that operation triggered 
G.watchers   = new WeakMap;
G.formatters = new WeakMap;

// References current operation 
G.$caller = G.$called = null;
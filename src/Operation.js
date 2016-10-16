/* G - State changes maintained in a graph

Operation is an *immutable* triplet of (context, key, value) 
and optional metadata arguments. Metadata is used
to establish unique identity of a value. Values with different
meta arguments will not overwrite each other, but rather make
a stack of values, allowing switching between them easily.

  When used as true constructor like `new G`, it will also
work as observable context with proper prototype chain.

  It can be used to enrich primitive value too, when called
as `G.wrap('Hello world', context, key, value)`

*/

var G = function(context, key, value) {
  if (key != null) {     
    this.$key = key;                                  // Store key
    if (context != null)         
      this.$context = context;                       // Store context, object that holds operations
    if (value)
      G.merge(this, value);
  } else if (context) {
    G.merge(this, context);
  }

  if (G.$caller)    
    this.$meta = G.$caller.$meta;                     // Pick up meta from caller operation
  if (arguments.length > 3) {                         
    if (this.$meta)                                   // Use/merge extra arguments as meta
      this.$meta = this.$meta.slice();           
    else
      this.$meta = new Array(arguments.length - 3);
    for (var i = 2; ++i < arguments.length;)
      if (arguments[i] != null)
        this.$meta[i - 3] = arguments[i];
  }
  if (!(this instanceof G)) {                           // Enrich unboxed primitive with call/recall methods
    this.call = G.prototype.call
    this.recall = G.prototype.recall
  }
  return this;
}

// Create operation - one property changed value 
G.create = function(context, key, value) {
  if (typeof value == 'object') {                     // 
    if (value.$getter) {                              // 1. Computed property value
      var computed = G.compute(value);                //    Invoke computation callback
      if (computed == null)                           //    Proceed if value was computed
        return 
      var result = G.wrap(computed, context, key);   //    Enrich primitive value
      result.$meta = value.$meta                      //    Pick up watcher meta
    } else if (!value.$key) {                         // 2. Wrapping plain object
      var result = new G(context, key, value)         //    Create new G wrapper
    } else {                                          // 3. Applying operation as value
      var primitive = value.valueOf()                 //    Get its primitive value
      var result = G.wrap(primitive, context, key)   //    Construct new operation
      result.$meta = value.$meta                      //    Pass meta
    }
  } else {
    var result = G.wrap(value, context, key)         // 4. Operation from primitive
  }
  if (arguments.length > 3) {                         // Use/merge extra arguments as meta
    if (result.$meta)
      result.$meta = result.$meta.slice();
    else
      result.$meta = new Array(arguments.length - 3);
    for (var i = 2; ++i < arguments.length;)
      if (arguments[i] != null)
        result.$meta[i - 3] = arguments[i];
  }
  return result
}


// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.wrap = G.call
G.call = function(operation, method) {
  var old = operation.$context[operation.$key];
  var value = G.format(operation, old);               // Transform value 
       
  if (method && (old != null)) {                      // If there was another value by that key
    if (!old.$key) {     
      value.$default = old;                           // That value is primitive, store it
    } else {     
      var other = G.match(value.$meta, old)           // Find value with the same meta 
      if (other) {                                 
        value = G.update(value, old, other);          //   then replace it in stack
      } else {     
        value = G.methods[method](value, old);        // invoke stack-manipulation method
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
G.recall = function(operation, hard) {
  value = G.Formatted(operation)
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
  var op = G.wrap(primitive, value.$context, value.$key);
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
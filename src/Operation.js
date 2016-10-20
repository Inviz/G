/* G - State changes maintained in a graph

Operation is an *immutable* triplet of (context, key, value) 
and optional metadata arguments. Metadata is used
to establish unique identity of a value. Values with different
meta arguments will not overwrite each other, but rather make
a stack of values, allowing switching between them easily.

  When used as true constructor like `new G`, it will also
work as observable context with proper prototype chain.

  It can be used to enrich primitive value too, when called
as `G.extend('Hello world', context, key)`

*/
/**
 * Makes a G
 * @constructor
 */
var G = function(context, key, value) {
  if (key != null) {     
    this.$key = key;                                  // Store key
    if (context != null)         
      this.$context = context;                       // Store context, object that holds operations
    if (value)                                       // If value is given to constructor, it's object
      this.$origin = value;                           // Keep reference to original object to reify later
  } else if (context && this instanceof G) {
    G.observe(this, context);
  }

  if (arguments.length > 3)                           // Use/merge extra arguments as meta
    G._setMeta(this, Array.prototype.slice.call(arguments, 3));
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
      var result = G.extend(computed, context, key);  //    Enrich primitive value
      result.$meta = value.$meta                      //    Pick up watcher meta
    } else if (!value.$key || value instanceof G) {   // 2. Wrapping plain object
      var result = new G(context, key, value)         //    Create new G wrapper
    } else {                                          // 3. Applying operation as value
      var primitive = value.valueOf()                 //    Get its primitive value
      var result = G.extend(primitive, context, key)  //    Construct new operation
      if (result.$context == value.$context &&            
          result.$key     == value.$key)              //    If operation is from before
      result.$meta = value.$meta                      //      Restore meta 
    }
  } else {
    var result = G.extend(value, context, key)        // 4. Operation from primitive
  }
  if (arguments.length > 3)                           // Use/merge extra arguments as meta
    G._setMeta(result, Array.prototype.slice.call(arguments, 3));
  return result
}


// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.extend = G.call
G.prototype.call = function(verb) {
  if (!this) return;
  var context = this.$context;
  var key     = this.$key;
  var old     = context[key];
  var value   = G.format(this, old);                  // Transform value 
  var result  = value;     
           
  if (verb && (old != null)) {                        // If there was another value by that key
    if (!old.$key) {
      value.$default = old;                           // That value is primitive, store it
    } else {
      if (typeof verb == 'string')
        verb = G.verbs[verb];     
      var other = G.match(value.$meta, old, verb)     // Find value with the same meta 
      if (other) {                                 
        result = G.update(value, old, other);         //   then replace it in stack
      } else {     
        result = verb(value, old);                    // invoke stack-manipulation method
      }     
      if (result === undefined)                       // No side effect is caused
        return old;
    }     
  } else if (result == old) {
    return;
  }
  
  if (result.$origin) {                                   // If shallow reference is used as value
    var reference = result;
    result = new G(reference);
    result.$key = reference.$key
    result.$context = reference.$context
  }
  G.record(value, old, verb);               // Place operation into dependency graph 
  if (old !== result)
    context[key] = result;                            // Actually change value 
  G.affect(result, old);                              // Apply side effects and invoke observers 

  G.notify(context, key, result, old)                          // Notify 
  return value;
};

G.notify = function(context, key, value, old) {
  if (context.onChange)                               
    context.onChange(key, value, old)
}

// Undo operation. Reverts value and its effects to previous versions. 
G.prototype.recall = function() {
  if (!this) return;
  var current = this.$context[this.$key]
  if (!current) return;
  if (arguments.length > 0)
    var meta = Array.prototype.slice.call(arguments, 0);

  if (this.$origin) {
    return this.$target.unobserve(this)
  }
  for (var old = current; old = G.match(meta, old); old = next) {
    var next = old.$previous || old.$preceeding;
    for (var head = old; head != current && head.$next;)
      head = head.$next;
    if (head === current) {      
      G.uncall(old)
      current = this.$context[this.$key]
    }
    if (!current || !next) break;
  }
  return this;
};

G.prototype.uncall = function() {
  var context = this.$context;
  var current = context[this.$key]
  var value = G.formatted(this);                    // 1. Return to previous version
  var from = G.unformatted(value)                 // Get initial value before formatting
    

  var prec = value.$preceeding;
  if (prec && prec.$succeeding == value) {                          //    If stack holds values before given
    if (!value.$succeeding)
      G.call(value.$preceeding);                    //      Apply that value
  } else {
    if (value.$previous) {                          // 2. Removing value from group 
      if (value == current) {
        current = value.$previous;
        context[this.$key] = value.$previous;       // reset head pointer on 
      }
      G.Array.recall(value); 
      G.notify(context, this.$key, current, value)    // Notify 
                         
    } else if (current === value) {
      current = undefined
      delete context[this.$key];                    // 3. Removing key from context 
      G.notify(context, this.$key, current, value)    // Notify 
  
    }
    
    var recalling = G.$recaller;                    // Top-level call will detach sub-tree,
    if (!recalling) G.$recaller = this              //   set global flag to detect recursion
    var to = G.effects(value, G.revoke)             // Recurse to recall side effects, returns last one
    if (!recalling) G.$recaller = null;
  }
  if (!recalling) {    
    G.unlink(from, to || value, true)               // Patch graph and detach the tree at top
                                                    // Reset recursion pointer
  }                                               
  return to || value;
}

// Recall and remove from history
G.prototype.revoke = function() {
  G.uncall(this);
  G.rebase(G.formatted(this), null)
  return this;
}

// Clone operation from primitive and another operation 
G.fork = function(primitive, value) {
  if (value == null)
    value = this;
  var op = G.extend(primitive, value.$context, value.$key);
  op.$meta = value.$meta;
  return op;
};

// References current operation 
G.$caller = G.$called = null;
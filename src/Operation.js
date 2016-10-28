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
      this.$source = value;                           // Keep reference to original object to reify later
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
  switch (typeof value) {
  case 'object':
    if (value.$getter) {                              // 1. Computed property value
      var computed = G.compute(value);                //    Invoke computation callback
      if (computed == null)                           //    Proceed if value was computed
        return 
      var result = G.extend(computed, context, key);  //    Enrich primitive value
      result.$cause = value
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
    break;
  case 'function':
      1

    break;
  default:
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
  var old = this.$context[this.$key];
  var value = G.format(this, old);                  // Transform value 
  
  if (typeof verb == 'string')
    verb = G.verbs[verb];

  if (value.$source && (!old || !verb || !verb.reifying)) {
    var result = G.reify(value, this);                // Create a G object from shallow reference
    value = G.reify.reuse(result, value)              // Use it instead of value, if possible
  } else if (value.$multiple) {
    var result = G.Array.call(value, old)
  } else {
    var result = value;
  }
  if (verb && old != null && old.$key) {              // If there was another value by that key
    if (!verb.multiple)                             // If it's not collection of sort
      var other = G.match(value.$meta, old)         // Attempt to find value with the same meta 
    if (other) {
      if (G.equals(other, result))
        return G.record.rewrite(other)                                 
      result = G.update(result, old, other);        //   then replace it in stack
    } else {    
      result = verb(result, old);                   // invoke stack-manipulation method
    }
    if (result === false) {                         // No side effect will be observed
      G.record(value, old);
      G.$called = G.$caller && G.$caller.$context && value;
      return value
    }
    if (result == null)
      result = old;
    if (verb.multiple)
      result.$multiple = true

  }
  if (old !== result)
    this.$context[this.$key] = result;                // Actually change value 
  G.record(value, old);                               // Place operation into dependency graph 
  G.notify(this.$context, this.$key, result, old)     // Notify 
  G.affect.push(result, old);                         
  G.affect(result, old);                              // Apply side effects and invoke observers 
  G.affect.pop()
  return value;
};

G.prototype.recall = function() {
  if (!this) return;
  var current = this.$context[this.$key]
  if (!current) return;
  if (arguments.length > 0)
    var meta = Array.prototype.slice.call(arguments, 0);

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

// Undo operation. Reverts value and its effects to previous versions. 
G.prototype.uncall = function() {
  if (this.$target) {                               // 1. Unmerging object
    this.$target.unobserve(this)
    if (this.$target.$chain.length == 0)            // todo check no extra keys
      return G.uncall(this.$target); 
    return this;
  }

  var context = this.$context;
  var current = context[this.$key]
  var value = G.formatted(this);                    // 2. Return to previous version
  var from = G.unformatted(value)                   // Get initial value before formatting

  var prec = value.$preceeding;
  if (prec && prec.$succeeding == value) {          // If stack holds values before given
    if (value == current)                           // And value is current
      if (!value.$succeeding)                       // And it's on top of history
        G.call(value.$preceeding);                  // Apply previous version of a value
  } else {
    if (value.$multiple) {                          // 3. Removing value from group 
      if (value == current) {
        current = value.$previous;
        context[this.$key] = value.$previous;       // reset head pointer on 
      }
      G.Array.recall(value); 
      G.notify(context, this.$key, current, value)  // Notify 
    } else if (current === value) {
      current = undefined
      delete context[this.$key];                    // 4. Removing key from context 
      G.notify(context, this.$key, current, value)  // Notify 
    }
    var recalling = G.$recaller;                    // Top-level call will detach sub-tree,
    if (!recalling) G.$recaller = this              //   set global flag to detect recursion
    var to = G.effects(value, G.revoke)             // Recurse to recall side effects, returns last one
    if (!recalling) G.$recaller = null;             // Reset recursion pointer
  }
  if (!recalling) 
    G.unlink(from, to || value, true)               // Patch graph and detach the tree at top
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

G.equals = function(value, old) {
  return value.valueOf() == old.valueOf() && 
//         value.$caller == old.$caller && 
         G._compareMeta(value.$meta, old.$meta);
}

// References current operation 
G.$caller = G.$called = null;
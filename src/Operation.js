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
 * Makes a G operation
 * @constructor
 */
var G = function(context, key, value) {
  G.built = (G.built || (G.built = 0)) + 1;
  if (context && this instanceof G) {
    this.observe.apply(this, arguments);
  } else if (key != null) {
    this.$key = String(key);                          // Store key
    if (context != null)         
      this.$context = context;                        // Store context, object that holds operations
    if (value)                                        // If value is given to constructor, it's object
      this.$source = value;                           // Keep reference to original object to reify later
  }

  if (arguments.length > 3) {                         // Use/merge extra arguments as meta
    for (var args = [], i = 0; i < arguments.length - 3; i++)
      args[i] = arguments[i + 3];
    G.meta.set(this, args);
  }
  if (!(this instanceof G)) {                         // Enrich unboxed primitive with call/recall methods
    this.call = G.prototype.call;
    this.uncall = G.prototype.uncall;
    this.recall = G.prototype.recall;
  }
  return this;
}

// Create operation - one property changed value 
G.create = function(context, key, value) {
  G.created = (G.created || (G.created = 0)) + 1;
  switch (typeof value) {
  case 'object': case 'function':
    if (value.$getter) {                              // 1. Computed property value
      if (value.$future) {
        var result = new G.Future(context, key, value)
      } else {
        var computed = G.compute(value);              //    Invoke computation callback
        if (computed == null)                         //    Proceed if value was computed
          return

        var result = G.extend(computed, context, key);//    Enrich primitive value
        //result.$cause = value
        result.$meta = value.$meta                    //    Pick up watcher meta
      }

    } else if (value.$key == key                      // 2. Reusing previously set value
            && value.$context == context) {
      var result = value;
    } else if (G.value.isObject(value)) {             // 3. Wrapping plain/observable object
      var result = new G()                            //    Create new G wrapper
      result.$context = context;
      result.$key = String(key);
      if (value)
        result.$source = value;
    } else {                                          // 4. Applying operation as value
      if (value.recall) {
        var primitive = value.valueOf();              //    Get its primitive value
      } else {
        var primitive = value;   
      }
      if (primitive instanceof G) {
        var result = value.transfer(context, key)   // Assign object ownreship
      } else {
        var result = G.extend(primitive, context, key)//    Construct new operation
      }                     
      if (result.$context == value.$context &&            
          result.$key     == value.$key)            //    If operation is from before
      result.$meta = value.$meta                    //      Restore meta 
    }
    break;
    break;
  default:
    var result = G.extend(value, context, key)        // 4. Operation from primitive
  }
  
  if (arguments.length > 3) {                         // Use/merge extra arguments as meta
    for (var args = [], i = 0; i < arguments.length - 3; i++)
      args[i] = arguments[i + 3];
    G.meta.set(result, args);
  }
  return result
}


// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.extend = G.call
G.prototype.call = function(verb, old) {
  if (this.$future)
    return G.Future.call(this, old) 
  
  if (typeof verb == 'string')
    verb = G.verbs[verb];
  if (old === undefined)
    old = G.value.current(this);

  var value, other, result;
  value  = G.value.format(this, old);                 // Transform value 
  other  = G.history(value, old, verb);               // Find value with matching meta in history
  result = G.value.process(value, old, other, verb)
  value  = G.value.reuse(result, value)               // Use it instead of value, if possible
  verb   = G.Array.process(value, other, verb);       // Attempt to put it back at its place in collection

  if (verb) {                                         
    if (old != null && old.$key) {                    // If there was another value by that key
      if (other) {                                    // If history holds a value with same meta
        if (G.value.equals(other, result))            //   If it's equal to given value
          return G.record.reuse(other);               //     Use that other value instead
        if (other.$multiple)
          G.verbs.replace(value, other)
        else
          result = G.history.update(result, old, other);//   Or replace it in stack
      } else {
        other = verb(result, old);                    // invoke stack-manipulation method
        if (other === false) {                        // No side effect will be observed
          return G.record.continue(value, old);
        } else if (other && verb.reifying) {
          value = result = other;
        }
      }
    }
  } else if (verb !== null) {
    if (old && G.history.hasLinks(value))
      G.verbs.restore(result, old)
  }

  if (!G.record.isLinked(value))                       // If operation position in graph needs update
    G.record(value, old, verb);                        // Register in graph and remember caller op/callback

  return G.value(value, old, result, other, verb)
};

G.prototype.recall = function() {
  var arity = 0;
  if (arguments.length > arity)                         // Use/merge extra arguments as meta
    for (var meta = [], i = 0; i < arguments.length - arity; i++)
      meta[i] = arguments[i + arity];
  G.history.matches(this.$context, this.$key, undefined, meta, G.uncall);
  return this;
};

// Undo operation. Reverts value and its effects to previous versions. 
G.prototype.uncall = function(soft, unformatted) {
  if (this.$target) {                                 // 1. Unmerging object
    this.$target.unobserve(this)  
    if (this.$target.$chain.length == 0)              // todo check no extra keys
      return this.$target.uncall();   
    return this;  
  } else if (this.$future) {  
    return G.Future.uncall(this)  
  }  
  
  var context = this.$context;  
  var recalling = G.$recaller;                        // Top-level call will detach sub-tree,
      
  if (context)  
    var current = G.value.current(this)  
  var value = unformatted ? this : G.formatted(this); // 2. Return to previous version
  var from = G.unformatted(value)                     // Get initial value before formatting
  
  var prec = value.$preceeding;  
  if (prec && prec.$succeeding == value) {            // If stack holds values before given
    if (value == current && !value.$succeeding)       // And value is current and on top of history
      G.call(value.$preceeding, soft ? false : null)  // Apply previous version of a value
  } else {  
    if (value.$multiple) {                            // 3. Removing value from group 
      if (value == current) {  
        current = value.$previous;
        G.value.set(context, this.$key, current);     // reset head pointer
      }
      if (G.Array.isLinked(value)) {          // or is a single child
        if (value.eject)
          value.eject()
        else
          G.Array.eject(value);   
      }
    } else if (current === value) {
      current = undefined
      G.value.clear(this);                            // 4. Removing key from context 
    }  
    G.notify(context, this.$key, null, value)         // Notify 
  }
  if (!recalling) G.$recaller = this                //   set global flag to detect recursion
  G.effects(value, G.revoke)                        // Recurse to recall side effects
  if (!recalling) G.$recaller = null;               // Reset recursion pointer
  if (this.$computed) {
    for (var i = 0; i < this.$computed.length; i++) {
      if (this.$computed[i].$current)
        G.revoke(this.$computed[i].$current);

      else// undo side effects in futures that observe the value as a property
        G.Future.revokeCalls(G.value.current(this.$computed[i]), this.$computed[i]);

    }
    this.$computed = undefined;
  }
  var watchers = context && context.$watchers && context.$watchers[this.$key];
  if (watchers) {
    for (var i = 0; i < watchers.length; i++) {
      if ((watchers[i].$getter || watchers[i]).$properties)
        G._unobserveProperties(value, watchers[i])
    }
  }
  if (!recalling && !soft) {
    var cause = this.$cause;
    if (this.$key && cause && cause.$cause && cause.$cause.$future)
      G.Future.unobserve(cause.$cause, cause)
    G.unlink(from, G.last(value), true)                        // Patch graph and detach the tree at top
  }
  return value;
}


// Recall and remove from history
G.prototype.revoke = function() {
  this.uncall();
  G.history.rebase(G.formatted(this), null)
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


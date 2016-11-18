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
    G._setMeta(this, args);
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
        result.$cause = value
        result.$meta = value.$meta                    //    Pick up watcher meta
      }

    } else if (value.$key == key                      // 2. Reusing previously set value
            && value.$context == context) {
      var result = value;
    } else if (G.isObject(value)) {                   // 3. Wrapping plain/observable object
      var result = new G()                            //    Create new G wrapper
      result.$context = context;
      result.$key = key;
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
    G._setMeta(result, args);
  }
  return result
}


// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.extend = G.call
G.prototype.call = function(verb, old) {
  if (typeof verb == 'string')
    verb = G.verbs[verb];
  if (old === undefined)
    var old     = G.value.current(this);
  var value   = G.format(this, old);                  // Transform value 
  var result  = value;

  if (G.isReplacing(this, value, old, verb))          // If key is supposed to have singular value
    var other = G.match(value.$meta, old)             //   Attempt to find value with same meta in history 

  if (value.$source)                                  // When value is a shallow reference to object
    if (G.isChangeVisible(old, verb, other)) {   
      result = G.reify(value, this);                  // Create a G object subscribed to reference
      value = G.reify.reuse(result, value)            // Use it instead of value, if possible
    }

  if (value.$multiple && !verb) {                     // If value is marked as arraylike previously
    if (G.Array.inject(value)) {                      // Attempt to put it back at its place in collection
      while (result.$next)                            // Use head of collection as result
        result = result.$next;
    } else if (!verb && verb !== null)                // When not switching values
      verb = G.verbs.push;                            //   fall back to push verb
  } else if (value.$future) {
    return G.Future.call(value, old) 
  }
  if (verb) {                                         
    G.Array.mark(value, verb.multiple)                // Mark value as arraylike if verb 
    if (old != null && old.$key) {                    // If there was another value by that key
      if (other) {                                    // If history holds a value with same meta
        if (G.equals(other, result))                  //   If it's equal to given value
          return G.record.reuse(other);               //     Use that other value instead
        result = G.update(result, old, other);        //   Or replace it in stack
      } else {
        result = verb(result, old);                   // invoke stack-manipulation method
        if (result === false)                         // No side effect will be observed
          return G.record.continue(value, old);
        if (value.$source && result !== old)
          value = result  
      }
    }
  } else if (verb !== null && old && (value.$succeeding || value.$preceeding)) {
    result = G.verbs.restore(result, old)}
  if (!G.isLinked(value))           // If operation position in graph needs update
    G.record(value, old, verb);                       // Register in graph and remember caller op/callback

  if (result !== old)                                 // If value is the new head
    G.value.apply(result);                            // Save value in its context

  var origin = value.$multiple ? value : result;
  if (origin !== old || origin.$multiple)
    G.propagate(origin, old);                         // Propagate side effects
  return value;
};

G.prototype.recall = function() {
  var arity = 0;
  if (arguments.length > arity)                         // Use/merge extra arguments as meta
    for (var meta = [], i = 0; i < arguments.length - arity; i++)
      meta[i] = arguments[i + arity];
  G.stack(this.$context, this.$key, undefined, meta, G.uncall);
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
      if (value.eject)
        value.eject()
      else
        G.Array.eject(value);   
      G.notify(context, this.$key, current, value)    // Notify 
    } else if (current === value) {
      current = undefined
      G.value.clear(this);                            // 4. Removing key from context 
      G.notify(context, this.$key, current, value)    // Notify 
    }  
    if (!recalling) G.$recaller = this                //   set global flag to detect recursion
    G.effects(value, G.revoke)                        // Recurse to recall side effects
    if (!recalling) G.$recaller = null;               // Reset recursion pointer
  }
  if (this.$computed) {
    for (var i = 0; i < this.$computed.length; i++) {
      if (this.$computed[i].$current)
        G.revoke(this.$computed[i].$current);
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
  G.rebase(G.formatted(this), null)
  return this;
}

G.value = {};
G.value.clear = function(value) {
  G.value.unset(value.$context, value.$key);
}
G.value.apply = function(value) {
  G.value.set(value.$context, value.$key, value);
}
G.value.current = function(value) {
  return G.value.get(value.$context, value.$key);
}

// Encapsulated method to modify objects
G.value.set = function(context, key, value) {
  context[key] = value;
}
G.value.unset = function(context, key, value) {
  delete context[key];
}
G.value.get = function(context, key, result) {
  return context[key];
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
         G._compareMeta(value.$meta, old.$meta);
}
G.isObject = function(value) {
  return (value instanceof G && !(value instanceof G.Node)) || 
         (!value.recall && G.isPlainObject(value))
}
G.isPlainObject = function(value) {
  return Object.prototype.toString.call(value) == '[object Object]';
}

G.isReplacing = function(self, value, old, verb) {
  if (!verb || !old)
    return;
  if (verb.multiple || !verb.reifying)
    return;
  if (self instanceof G || value instanceof G)
    return
  return true;
}

G.isChangeVisible = function(old, verb, other) {
  return !old || !verb || !verb.reifying || other
}

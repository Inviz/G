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
    this.$key = key;                                  // Store key
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
  case 'object':
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

    } else if (G._isObject(value)) {                  // 2. Wrapping plain/observable object
      var result = new G()                            //    Create new G wrapper
      result.$context = context;
      result.$key = key;
      if (value)
        result.$source = value;
    } else {                                          // 3. Applying operation as value
      if (value.recall)
        var primitive = value.valueOf();
      else
        var primitive = value;                        //    Get its primitive value
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
G.prototype.call = function(verb) {
  if (!this) return;
  if (typeof verb == 'string')
    verb = G.verbs[verb];
  var old     = this.$context[this.$key];
  var value   = G.format(this, old);                  // Transform value 
  var result  = value;

  if (verb && (!verb.multiple && !(this instanceof G) 
  && ((verb.reifying && !(value instanceof G))) && old))
    var other = G.match(value.$meta, old)             //   Attempt to find value with given meta in history 

  if (value.$source)                                  // When value is a shallow reference to object
    if (!old || !verb || !verb.reifying || other) {   
      result = G.reify(value, this);                  // Create a G object subscribed to reference
      value = G.reify.reuse(result, value)            // Use it instead of value, if possible
    }

  if (value.$multiple) {  
    G.Array.call(value, old)
    while (result.$next)
      result = result.$next;  
  } else if (value.$future) {
    return G.Future.call(value, old) 
  }

  if (verb && old != null && old.$key) {              // If there was another value by that key
    if (verb.multiple)                                // If verb allows multiple values by same meta
      value.$multiple = true                          //   Set flag on the value
    if (other) {                                      // If history holds a value with same meta
      if (G.equals(other, result))                    //   If it's equal to given value
        return G.record.reuse(other);                 //     Rebase that value into record
      result = G.update(result, old, other);          //   then replace it in stack
    } else {        
      result = verb(result, old);                     // invoke stack-manipulation method
      if (result === false)                           // No side effect will be observed
        return G.record.continue(value, old);
      if (value.$source && result !== old)
        value = result  
    }
  }

  if (verb !== false && !G.isLinked(value))           // If operation position in graph needs update
    G.record(value, old);                             // Register in graph and remember caller op/callback

  if (result !== old)                                 // If value is the new head
    this.$context[this.$key] = result;                // Save value in its context

  var origin = value.$multiple ? value : result;
  if (origin !== old) {
    G.record.push(origin);                            // Put operation onto the caller stack
    G.affect(origin, old);                            // Apply side effects and invoke observers 
    if (old && old.$iterators)
      G.Array.iterate(value, old.$iterators)          // Invoke array's active iterators
    G.notify(this.$context, this.$key, origin, old)   // Trigger user callbacks 
    G.record.pop();                                   // Remove operation from the caller stack
  }  
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
G.prototype.uncall = function(soft) {
  if (this.$target) {                                 // 1. Unmerging object
    this.$target.unobserve(this)  
    if (this.$target.$chain.length == 0)              // todo check no extra keys
      return G.uncall(this.$target);   
    return this;  
  } else if (this.$future) {  
    return G.Future.uncall(this)  
  }  
  
  var context = this.$context;  
  var recalling = G.$recaller;                        // Top-level call will detach sub-tree,
      
  if (context)  
    var current = context[this.$key]  
  var value = G.formatted(this);                      // 2. Return to previous version
  var from = G.unformatted(value)                     // Get initial value before formatting
  
  var prec = value.$preceeding;  
  if (prec && prec.$succeeding == value) {            // If stack holds values before given
    if (value == current && !value.$succeeding)       // And value is current and on top of history
      G.call(value.$preceeding, soft ? false : null)  // Apply previous version of a value
    var to = G.last(value)                            // Find deepest last within value
  } else {  
    if (value.$multiple) {                            // 3. Removing value from group 
      if (value == current) {  
        current = value.$previous;  
        context[this.$key] = value.$previous;         // reset head pointer on 
      }  
      G.Array.recall(value);   
      G.notify(context, this.$key, current, value)    // Notify 
    } else if (current === value) {
      current = undefined
      delete context[this.$key];                      // 4. Removing key from context 
      G.notify(context, this.$key, current, value)    // Notify 
    }  
    if (!recalling) G.$recaller = this                //   set global flag to detect recursion
    var to = G.effects(value, G.revoke) || value      // Recurse to recall side effects, remember last
    if (!recalling) G.$recaller = null;               // Reset recursion pointer
  }
  if (this.$computed) {
    for (var i = 0; i < this.$computed.length; i++) {
      if (this.$computed[i].$current)
        G.uncall(this.$computed[i].$current);
    }
    this.$computed = undefined;
  }
  var watchers = context.$watchers && context.$watchers[this.$key];
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
    G.unlink(from, to, true)                        // Patch graph and detach the tree at top
  }
  return value;
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

G._isPlain = function(value) {
  return Object.prototype.toString.call(value) == '[object Object]';
}

G._isObject = function(value) {
  return (value instanceof G && !(value instanceof G.Node)) || 
         (!value.recall && G._isPlain(value))
}
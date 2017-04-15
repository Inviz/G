/* G - State changes maintained in a graph

Operation is an *immutable* triplet of (context, key, value) 
and optional metadata arguments. Metadata is used
to establish unique identity of a value. Values with different
meta arguments will not overwrite each other, but rather make
a stack of values, allowing switching between them easily.

  When used as true constructor like `new G`, it will also
work as observable context with proper prototype chain.

  It can be used to enrich primitive value too, when called
as `G.unbox('Hello world', context, key)`

*/
/**
 * Makes a G operation
 * @constructor
 */
var G = function(context, key, value, a1, a2, a3) {
  //G.built = (G.built || (G.built = 0)) + 1;
  switch (arguments.length) {
    case 4: var args = [a1]; break;          // Use/merge extra arguments as meta
    case 5: var args = [a1, a2]; break;
    case 6: var args = [a1, a2, a3];
  }
  if (context && this instanceof G) {
    this.observe(context, key, value, args);
  } else if (key != null) {
    this.$key = String(key);                          // Store key
    if (context != null)         
      this.$context = context;                        // Store context, object that holds operations
    if (value)                                        // If value is given to constructor, it's object
      this.$source = value;                           // Keep reference to original object to reify later
  }
  if (args !== undefined)
    G.meta.set(this, args);                           // Use/merge extra arguments as meta
  if (!(this instanceof G)) {                         // Enrich unboxed primitive with call/recall methods
    this.call = G.prototype.call;
    this.uncall = G.prototype.uncall;
    this.recall = G.prototype.recall;
  }
  return this;
}

// Create operation that signifies that
// one property changes its value. 
G.create = function(context, key, value, a1, a2, a3) {
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

        var result = G.unbox(computed, context, key); //    Enrich primitive value
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
        var result = value.transfer(context, key)     // Assign object ownreship
      } else {
        var result = G.unbox(primitive, context, key) //    Construct new operation
      }                     
      if (result.$context == value.$context &&            
          result.$key     == value.$key)              //    If operation is from before
      result.$meta = value.$meta                      //      Restore meta 
    }
    break;
  default:
    var result = G.unbox(value, context, key);        // 4. Operation from primitive
  }
  
  switch (arguments.length) {
    case 4: G.meta.set(result, [a1]); break;          // Use/merge extra arguments as meta
    case 5: G.meta.set(result, [a1, a2]); break;
    case 6: G.meta.set(result, [a1, a2, a3]);
  }
  return result
}


// Apply operation to its context 
// If method name is not provided, 
// linked list of effects will not be altered 
G.unbox = G.call
G.prototype.call = function(verb, old) {
  if (this.$future)
    return G.Future.call(this, old) 
  
  if (typeof verb == 'string')
    verb = G.verbs[verb];
  if (old === undefined)
    old = G.value.current(this);

  var value  = G.value(this, old);                  // Transform/format value 
  var other  = G.stack(value, old, verb);           // Find value with matching meta in history
  var result = G.value.process(value, old, other, verb)
  value = G.value.reuse(result, value)                // Use it instead of value, if possible
  verb  = G.Array.process(result, other, verb);       // Attempt to put it back at its place in collection

  if (verb) {                                         
    if (old != null && old.$key) {                    // If there was another value by that key
      if (other) {                                    // If history holds a value with same meta
        if (G.value.equals(other, result))            //   If it's equal to given value
          return G.record.reuse(other);               //     Use that other value instead
        if (other.$multiple && G.Array.isLinked(other))
          G.verbs.replace(result, other)
        else
          result = G.stack.update(result, old, other);//   Or replace it in history
      } else {
        other = verb(result, old);                    // invoke stack-manipulation method
        if (other === false) {                        
          return G.record.continue(value, old);       // No side effect will be observed
        } else if (other && verb.reifying) {          
          value = result = other;                     // use reified object returned by the verb
          other = undefined; 
        }
      }
    }
  } else if (verb !== null) {
    if (old && G.stack.hasLinks(value))
      G.verbs.restore(result, old)
  }

  if (!G.record.isLinked(value))                       // If operation position in graph needs update
    G.record(value, old, verb);                        // Register in graph and remember caller op/callback
  
  G.value.apply(result);                               // Assign value to context
  G.effects(result || value, old, other, verb);        // Propagate change to listeners
  return value;
};

G.prototype.recall = function() {
  var arity = 0;
  if (arguments.length > arity)                         // Use/merge extra arguments as meta
    for (var meta = [], i = 0; i < arguments.length - arity; i++)
      meta[i] = arguments[i + arity];
  G.stack.matches(this.$context, this.$key, undefined, meta, G.uncall);
  return this;
};

// Undo operation. Reverts value and its effects to previous versions. 
G.prototype.uncall = function(soft, unformatted) {
  if (this.$target) {                                 // 1. Unmerging object
    this.$target.unobserve(this)  
    if ((!this.$target.$chain || this.$target.$chain.length == 0)
        && G.getLength(this.$target, true) == 0)        //fixme: tests have incorrect expectations        
      return this.$target.uncall();                   
    return this;  
  } else if (this.$future) {  
    return G.Future.uncall(this)  
  }  
  
  var context = this.$context;  
  var recalling = G.$recaller;                        // Top-level call will detach sub-tree,
      
  if (context)                                        // 2. Return to previous version
    var current = G.value.current(this)  
  if (unformatted)
    var value = this
  else
    var value = G.value.formatted(this);              
  var from = G.value.unformatted(value)               // Get initial value before formatting
  
  var prec = value.$preceeding;  
  if (prec && prec.$succeeding == value) {            // If stack holds values before given
    if (value.$multiple) {
      if (value == current || G.Array.isLinked(value)) {
        G.replace(value.$preceeding, value)
        return value
      }
    } else if (value == current) {                    // And value is current and on top of history
      G.call(value.$preceeding, soft ? false : null)  // Apply previous version of a value
    }
  } else {  
    if (value.$multiple) {                            // 3. Removing value from group 
      if (value == current) {  
        current = value.$previous;
        G.value.set(context, this.$key, current);     // reset head pointer
      }
      if (G.Array.isLinked(value)) {                  // invoke ejection logic
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
  if (!recalling) G.$recaller = this                  // Set global flag to detect recursion
  G.effects.each(value, G.revoke)                          // Recurse to recall side effects
  if (!recalling) G.$recaller = null;                 // Reset recursion pointer
  if (this.$computed) {
    for (var i = 0; i < this.$computed.length; i++) {
      if (this.$computed[i].$current)
        G.revoke(this.$computed[i].$current);

      else if (!G.value.current(this))
        // undo side effects in futures that observe the value as a property
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
    G.unlink(from, G.record.last(value), true)        // Patch graph and detach the tree at top
  }
  if (typeof this.$composable == 'function') {
    this.$composable();
  }
  return value;
}


// Recall and remove from history
G.prototype.revoke = function() {
  this.uncall();
  G.stack.rebase(G.value.formatted(this), null)
  return this;
}

// Clone operation from primitive and another operation 
G.fork = function(primitive, value) {
  if (value == null)
    value = this;
  var op = G.unbox(primitive, value.$context, value.$key);
  op.$meta = value.$meta;
  return op;
};

G.debugging = location.search.indexOf('debug') > -1

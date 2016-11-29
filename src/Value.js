G.value = function(result, old, other, verb) {

  var replacing = result.$multiple && (!old || old.$preceeding != result);
  if (result !== old || result.$multiple) {         // Decide if value should be propagated                 // Save value in its context
    G.record.push(result);                           // Put operation onto the caller stack
    G.value.propagate(result, replacing ? other : old);                     // Apply side effects and invoke observers 
    if (old && old.$iterators)
      G.Array.iterate(result, old.$iterators)        // Invoke array's active iterators
    if (result !== old) {
      G.notify(result.$context, result.$key, result, replacing ? other : old)// Trigger user callbacks 
    }
    G.record.pop();
  }

  if (result.$multiple  && other  && (!verb || verb.multiple)) {
    if (G.Array.isLinked(other)) {
      G.record.push(other);                             // Put operation onto the caller stack
      G.value.propagate(other);                            // Apply side effects and invoke observers 
      //if (old && old.$iterators)
      //  G.Array.iterate(result, old.$iterators)        // Invoke array's active iterators
      G.record.pop();
    } else {
      G.uncall(other)
    }
    if (other.$context !== result.$context ||
        other.$key !== result.$key)
    G.notify(other.$context, other.$key, other)// Trigger user callbacks 
  }
}

// Process pure value transformations 
G.value.format = function(value, old) {
  var formatters = value.$context.$formatters;      // Formatters configuration for whole context
  if (formatters)                                   // is stored in sub-object
    var group = formatters[value.$key];

  var current = G.formatted(value)                  // Use value as it was formatted previously
  if (current.$formatted === group) {               // 1. Value is already properly formatted 
    return current                                  //    return it
  } else {                                          // 2. Value not (yet) properly formatted
    var multiple = value.$multiple;
    var result = G.unformatted(value)               //    get original value
    var after = current.$after                      //    remember next operation
    if (group) {                            
      for (var i = 0, j = group.length; i < j; i++) // Context has formatters for key
        result = G.callback(result, group[i], old); //   apply formatters in order
      result.$formatted = group                     //   store formatting configuration
    }
    G.history.rebase(value, result);                        // Replace value in the stack of values for key
    G.link(result, after);
    if (multiple) {
      result.$multiple = true;
      var other = G.value.current(value);
      if (other && G.Array.contains(other, value))
        G.Array.verbs.replace(result, value, true);
    }
    if (result != value && value.$formatted)
      value.$formatted = undefined
    return result;                                   
  }
};

// Process all side effects for the value. 
// When value is applied initially, it invokes all observers
// When value is re-applied, it attempts to reuse effects
G.value.propagate = function(value, old) {
  var watchers = value.$context.$watchers;        // Watchers configuration for whole context
  if (watchers)                                   // is stored in sub-object
    var group = watchers[value.$key]

  var observers = value.$context.$observers;
  var iterators = value.$iterators;
  var present, removed

  // Reapply 
  for (var after = value; after = after.$after;) {
    if (after.$caller !== value) continue;
    var cause = after.$cause;
    if (observers && observers.indexOf(cause) > -1
    ||  group     &&     group.indexOf(cause) > -1
    || cause == null) {
      after.call();
      (present || (present = [])).push(cause)
    } else if (!iterators || iterators.indexOf(after) == -1) {
      (removed || (removed = [])).push(after)
    }
  }
  if (removed)
    for (var i = 0; i < removed.length; i++) {
      var recalled = G.revoke(removed[i]);
      if (value.$after == recalled)
        value.$after = G.formatted(removed[i]).$after
    }
  if (group)
    for (var i = 0; i < group.length; i++)
      if (!present || present.indexOf(group[i]) == -1)
        G.callback(value, group[i], old, true);
      else if ((group[i].$getter || group[i]).$properties)
        G._observeProperties(value, group[i]);
  if (observers)
    for (var i = 0; i < observers.length; i++)
      if (!present || present.indexOf(observers[i]) == -1)
        G.callback(value, observers[i], old, true);
  return value;
}


G.value.equals = function(value, old) {
  return value.valueOf() == old.valueOf() && 
         G.meta.equals(value.$meta, old.$meta);
}
G.value.isObject = function(value) {
  return (value instanceof G && !(value instanceof G.Node)) || 
         (!value.recall && G.value.isPlainObject(value))
}
G.value.isPlainObject = function(value) {
  return Object.prototype.toString.call(value) == '[object Object]';
}

G.value.willBeVisible = function(old, verb, other) {
  return !old || !verb || !verb.reifying || other
}


G.value.clear = function(value) {
  G.value.unset(value.$context, value.$key);
}
G.value.apply = function(value) {
  if (value == null)
    return;
  while (value.$next && // Use head of collection as result
         value.$next.$context === value.$context &&
         value.$next.$key     === value.$key)                            
      value = value.$next;
  
  G.value.set(value.$context, value.$key, value);
}
G.value.current = function(value) {
  return G.value.get(value.$context, value.$key);
}

// Encapsulated method to modify objects
G.value.set = function(context, key, value) {
  if (value == null)
    return G.value.unset(context, key);
  if (context[key] !== value)
    context[key] = value;
}
G.value.unset = function(context, key, value) {
  delete context[key];
}
G.value.get = function(context, key, result) {
  return context[key];
}


G.value.process = function(value, old, other, verb) {
  if (value.$source)                                // When value is a shallow reference to object
    if (G.value.willBeVisible(old, verb, other))
      return G.value.reify(value);                  // Create a G object subscribed to reference
  return value;
}

G.value.construct = function(context, key, value) {
  var constructors = context.constructors;
  if (constructors && constructors[key])
    var result = new constructors[key](value);
  else if (context.constructor.recursive)
    var result = new (context.constructor)(value);
  else
    var result = new G(value);  
  result.$key = key;
  result.$context = context;
  result.$meta = value.$meta;
  return result;
}
G.value.reify = function(value, target) {
  if (value.$source && value.$source.$composable) { // Composable objects are adopted
    value.$source.$key = value.$key;                // Rewrite object's key/context to new owner
    value.$source.$context = value.$context;
    return value.$source;
  }
  if (value.$target && value.$target.$after)        // fixme: Reified before?
    return value.$target;
  if (!target) target = value;
  if (value.$source.$context == target.$context     // If origin matches context and key
    && value.$source.$key == target.$key) {                
    return value.$source;                           // Use origin object instead of reference
  } else {
    var result = G.value.construct(target.$context, target.$key, value);      
    value.$target = result;
    return result;
  }
}

G.value.reuse = function(target, source) {          // If plain JS object was referenced
  if (target === source) {
    return target;
  } else if (target.$composable) {                  // Return value if it allows changing ownership
    return target;                                  
  } else if (!source.$source.observe) {             // Use G object as value
    target.$meta = source.$meta;
    return target;
  } else if (target.$key == source.$key && 
             target.$context == source.$context && 
             target.$chain && 
             target.$chain.indexOf(source.$source || source) == -1) { 
    target.observe(source)                          // reusing previously reified object
    return target;
  } else {
    return source
  }
}
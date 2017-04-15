

// Process pure value transformations 
G.value = function(value, old) {
  var formatters = value.$context.$formatters;        // Formatters configuration for whole context
  if (formatters)                                     // is stored in sub-object
    var group = formatters[value.$key];  
  
  var current = G.value.formatted(value)              // Use value as it was formatted previously
  if (current.$formatted === group) {                 // 1. Value is already properly formatted 
    return current                                    //    return it
  } else {                                            // 2. Value not (yet) properly formatted
    var multiple = value.$multiple;  
    var result = G.value.unformatted(value);          //    get original value
    var after = current.$after                        //    remember next operation
    if (group) {                              
      for (var i = 0, j = group.length; i < j; i++)   // Context has formatters for key
        result = G.callback(result, group[i], old);   //   apply formatters in order
      result.$formatted = group                       //   store formatting configuration
    }
    G.stack.rebase(value, result);                  // Replace value in the stack of values for key
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


// Find result of last transformation over value
G.value.formatted = function(value) {
  while (value.$after && value.$after.$transform)
    value = value.$after
  return value
};

// Find value before transformations
G.value.unformatted = function(value) {
  while (value.$transform)
    value = value.$before
  return value
};

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

// Build observable object bound to context by key
// e.g. when deep merging objects
G.value.construct = function(context, key, value) {
  var constructors = context.constructors;
  if (context.$constructor && context.$constructor(key))
    var result = new (context.$constructor(key));
  else if (constructors && constructors[key])
    var result = new constructors[key];
  else if (context.constructor.recursive)
    var result = new (context.constructor);
  else
    var result = new G;  
  result.$key = key;
  result.$context = context;
  if (value) {
    result.$meta = value.$meta;
    result.observe(value)
  }
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
    var result = G.value.construct(target.$context, target.$key);
    result.$merging = value;
    result.$meta = value.$meta;      
    value.$target = result;
    return result;
  }
}

G.value.reuse = function(target, source) {          // If plain JS object was referenced
  if (target === source) {
    return target;
  } else if (target.$composable) {                  // Return value if it allows changing ownership
    target.$caller = null                           // Marked operation to be re-linked
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
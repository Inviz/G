// Propagate new value and notify observers
G.effects = function(result, old, other, verb) {
  if (result && result.$merging) {
    result.observe(result.$merging)
    result.$merging = undefined;
  }
  var replacing = result.$multiple && (!old || old.$preceeding != result);
  if (result !== old || result.$multiple) {           // Decide if value should be propagated                 // Save value in its context
    G.record.push(result);                            // Put operation onto the caller stack
    G.effects.propagate(result, replacing ? other : old);// Apply side effects and invoke observers 
    if (old && old.$iterators)
      G.Array.iterate(result, old.$iterators)         // Invoke array's active iterators
    if (result !== old) {
      G.notify(result.$context, result.$key, result, replacing ? other : old)// Trigger user callbacks 
    }
    G.record.pop(old);
  }

  if (result.$multiple  && other  && (!verb || verb.multiple)) {
    if (G.Array.isLinked(other)) {
      G.record.push(other);                           // Put operation onto the caller stack
      G.effects.propagate(other);                     // Apply side effects and invoke observers 
      //if (old && old.$iterators)
      //  G.Array.iterate(result, old.$iterators)     // Invoke array's active iterators
      G.record.pop(undefined);
    } else {
      G.uncall(other)
    }
    if (other.$context !== result.$context ||
        other.$key !== result.$key)
      G.notify(other.$context, other.$key, other)     // Trigger user callbacks 
  }
}

// Process all side effects for the value. 
// When value is applied initially, it invokes all observers
// When value is re-applied, it attempts to reuse effects
G.effects.propagate = function(value, old) {
  var watchers = value.$context.$watchers;            // Watchers configuration for whole context
  if (watchers)                                       // is stored in sub-object
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
        value.$after = G.value.formatted(removed[i]).$after
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


// Iterate side effects caused by value 
G.effects.each = function(value, callback, argument) {
  for (var after = value; after = after.$after;)
    if (after.$caller === value)
      var last = callback(after, argument) || after;
  return last;
}

G.effects.caused = function(value, watcher, old) {
  var effects
  for (var next = value; next; next = next.$after) {
    if (next.$cause == watcher && next.$caller == value)
      (effects || (effects = [])).push(next)
  }
  return effects
}

G.effects.clean = function(value, effects) {
  for (var i = 0; i < effects.length; i++) {
    for (var next = value; next; next = next.$after)
      if (next === effects[i])
        break;
      else if (next === G.$called) {
        next = undefined;
        break;
      }
    if (!next)
      effects[i].uncall()
  }  
}

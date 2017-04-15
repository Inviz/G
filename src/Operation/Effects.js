// Propagate new value and notify observers
G.effects = function(value, old) {
  G.record.push(value);                            // Put operation onto the caller stack
  G.effects.propagate(value, old);// Apply side effects and invoke observers 
  if (value !== old && old !== true) {
    G.notify(value.$context, value.$key, value, old)// Trigger user callbacks 
  }
  G.record.pop(old);
}

G.effects.push = function(value, old) {
  var index = G.$effects.indexOf(old);
  if (index > -1) {
    if (index % 2 == 0) {                             // 1. simplify A->B, B->C to A -> C
      G.$effects[index] = value;
    } else {                                          
      if (value === G.$effects[index + 1])            // 2. negate A->B, B->A
        G.$effects.splice(index, 2)
      //else                                            // 3. update A->B, A->C to A-> C
      //  G.$effects[index - 1] = value;
    }
  } else {
    G.$effects.push(value, old);
  }
};
G.effects.transact = function() {
  G.$effects = []
};
G.effects.commit = function(shallow) {
  while (G.$effects && G.$effects.length) {
    var effects = G.$effects;
    
    G.effects.transact();                             // record effects of effects

    for (var i = 0; i < effects.length; i += 2) {
      G.effects()
    }


    if (shallow && G.$effects.length)                 // if shallow flag is given
      return;                                         // do not commit effects of effects
  }
  G.$effects = null; 
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

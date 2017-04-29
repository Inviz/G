// Propagate new value by notifying observers
// When value is applied initially, it invokes all observers
// When value is re-applied, it attempts to reuse effects
G.effects = function(value, old, bypass) {
  if (!bypass && G.$effects)
    return G.effects.push(value, old);
  G.record.push(value); // Put operation onto the caller stack
  if (G.$operating) 
    G.transformation.push(value, old);
// Process all side effects for the value. 
  var context = value.$context;
  var watchers = context.$watchers;                   // Watchers configuration for whole context
  if (watchers)                                       // is stored in sub-object
    var group = watchers[value.$key]

  var observers = context.$observers;
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
        G.callback.observe(value, group[i]);
  if (observers)
    for (var i = 0; i < observers.length; i++)
      if (!present || present.indexOf(observers[i]) == -1)
        G.callback(value, observers[i], old, true);
  if (value !== old && old !== true) {
    G.notify(context, value.$key, value, old)// Trigger user callbacks 
  }
  G.record.pop(old);
  return value;
}

// Undo all effects (and effects of effects) produced by operation
G.effects.revoke = function(value, bypass) {
  if (!bypass && G.$effects)
    return G.effects.push(undefined, value);
  if (G.$operating)
    G.transformation.push(undefined, value);
  if (value.$multiple || !G.value.current(value))
    G.notify(value.$context, value.$key, undefined, value)// Trigger user callbacks 
  var recalling = G.$recaller;
  if (!recalling)
    G.$recaller = value                  // Set global flag to detect recursion
  G.effects.each(value, G.revoke)                     // Recurse to recall side effects
  if (!recalling)
    G.$recaller = null;                 // Reset recursion pointer

  var context = value.$context; 
  if (value.$computed) {
    for (var i = 0; i < value.$computed.length; i++) {
      if (value.$computed[i].$current)
        G.revoke(value.$computed[i].$current);

      else if (!G.value.current(value))
        // undo side effects in futures that observe the value as a property
        G.future.revokeCalls(G.value.current(value.$computed[i]), value.$computed[i]);

    }
    value.$computed = undefined;
  }
  var watchers = context && context.$watchers && context.$watchers[value.$key];
  if (watchers) {
    for (var i = 0; i < watchers.length; i++) {
      if ((watchers[i].$getter || watchers[i]).$properties)
        G.callback.unobserve(value, watchers[i])
    }
  }
}

// Schedule side effection for propagation
G.effects.push = function(value, old) {
  var index = G.$effects.indexOf(old);
  if (index > -1) {
    if (index % 2 == 0)                              // 1. simplify A->B, B->C to A -> C
      G.$effects[index] = value;
    if (value === G.$effects[index + 1])            // 2. negate A->B, B->A
      G.$effects.splice(index, 2)
      //else                                            // 3. update A->B, A->C to A-> C
      //  G.$effects[index - 1] = value;
  } else {
    G.$effects.push(value, old);
  }
};

// Start effect transaction, during which all state changes
// will be invisible to observers. Useful to ensure that
// callbacks will observe all commited changes at once.
// It also reduces amount of recursion when executing changes
// in complex graphs. 
G.effects.transact = function() {
  G.$effects = []
};

// Propagate buffered state changes, and record the side effects.
// Unless `shallow` flag is passed, buffered effects will 
// be commited repeatedly until all chain of changes is fully propagated.
// Otherwise effects of effects will be available in record for manual commit
G.effects.commit = function(shallow) {
  while (G.$effects && G.$effects.length) {
    var effects = G.$effects;
    
    G.effects.transact();                             // record effects of effects

    for (var i = 0; i < effects.length; i += 2) {
      if (effects[i] == null)
        G.effects.revoke(effects[i + 1], true);
      else
        G.effects(effects[i], effects[i + 1], true);
    }


    if (shallow && G.$effects.length)                 // if shallow flag is given
      return G.$effects;                              // do not commit effects of effects
  }
  G.$effects = null; 
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

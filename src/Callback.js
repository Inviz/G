// Invoke watcher whatever type it is
G.callback = function(value, watcher, old) {
  var method = G.callback.dispatch(watcher)
  return method(value, watcher, old);
};

// Find a callback function for given watcher
G.callback.dispatch = function(watcher) {
  if (watcher.$getter) {
    return G.callback.getter
  } else if (typeof watcher == 'object') {
    return G.callback.proxy
  } else if (watcher.$properties) {
    return G.callback.iterator
  } else {
    return G.callback.property
  }
}


G.callback.property = function(value, watcher, old) {
  var caused = G.$cause
  G.$cause = watcher;
  var transformed = watcher(value, old);
  
  G.$cause = caused;
  if (transformed == null)
    return value;
  if (!transformed.$context) {
    transformed = G.fork(transformed, value);
  }
  return G.record.transformation(transformed, old, value, watcher);
}

G.callback.iterator = function(value, watcher) {

  if (watcher.$iteratee) // iterator called itself recursively, abort
    return

  var called = G.$called;
  var caller = G.$caller;
  var caused = G.$cause;
  G.$cause = watcher;

  if (!value.$iterators || value.$iterators.indexOf(watcher) == -1) {
    // if property changed, use its context
    G.$called =  G.$caller = value = value.$context;
  }
  if (value.$after) {
    var effects;
    for (var next = value; next; next = next.$after) {
      if (next.$cause == watcher && next.$caller == value)
        (effects || (effects = [])).push(next)
    }
  }
  var iteratee = watcher.$iteratee || null;
  watcher.$iteratee = value;

  watcher(value);
  watcher.$iteratee = iteratee
  if (effects) {
    for (var i = 0; i < effects.length; i++) {
      for (var next = value; next; next = next.$after)
        if (next === effects[i])
          break;
        else if (next === G.$called) {
          next = undefined;
          break;
        }
      if (!next)
        G.uncall(effects[i])
    }
  }
  G.$called = called;
  G.$caller = caller;
  G.$cause  = caused;

  return value
}

G.callback.proxy = function(value, watcher) {
  if (watcher.$source) { // merge observer
    if (watcher.$method) {
      return G[watcher.$method](watcher.$target, value.$key, value, watcher.$meta)
    } else {
      return G.set(watcher.$target, value.$key, value, watcher.$meta)
    }
  } else {
    return G.set(watcher, value.$key, value)
  }
}

G.callback.getter = function(value, watcher) {
  var computed = G.compute(watcher, value);                //    Invoke computation callback
  var current = watcher.$context[watcher.$key];
  if (computed == null) {                           //    Proceed if value was computed
    if (current)
      G.uncall(current, watcher.$meta)
    return
  } else {
    if (computed.valueOf() == current)
      return;
    var result = G.extend(computed, watcher.$context, watcher.$key);
    result.$cause = watcher
    result.$meta = watcher.$meta;
    return result.call('set')
  }
}


G.callback.transformation = function() {

}

G.callback.revoke = function(value, watcher) {
  for (var after = value; after = after.$after;) {
    if (after.$caller === value && after.$cause === watcher) {
      if (!collection)
        var collection = []
      collection.push(after);
    }
  }
  if (collection)
    for (var i = 0; i < collection.length; i++)
      G.revoke(collection[i])
}

// Parse function to see which properties it uses
G.analyze = function(fn) {

  if (!fn.$arguments) {
    var string = String(fn)
    var target = 'this'
    if (fn.length) {                                  // check if first argument is something else than value
      var args = string.match(/\(\s*([^\),\s]*)/)[1];
      if (args && args != 'value') {
        fn.$properties = []
        target = args
      }
    }
    fn.$arguments = [] 
    var m = string.match(G.$findProperties);          // find all property accessors
    for (var i = 0; i < m.length; i++) {     
      if (m[i].substring(0, target.length) != target  // proceed if starts with `this.` or `arg.`
       || m[i].charAt(target.length) != '.')
        continue
      var clean = m[i].substring(target.length + 1)   // skip prefix
                      .replace(G.$cleanProperty, ''); // clean out tail method call
      if (clean.length) {
        if (target == 'this')
          fn.$arguments.push(clean.split('.'))
        else
          fn.$properties.push(clean.split('.'))
      }
    }
  }
  return fn;
}

// Run computed property callback if all properties it uses are set
G.compute = function(watcher, trigger) {
  var getter = watcher.$getter;
  var args = getter.$arguments;
  if (!args)
    args = G.analyze(getter).$arguments;
  for (var i = 0; i < args.length; i++) {
    var context = watcher.$context;
    var bits = args[i]
    for (var j = 0; j < bits.length; j++) {       
      if (trigger && trigger.$key == bits[j]     
        && trigger instanceof G) {               // When observer returned object
        trigger.watch(bits[j + 1], watcher);     //   Observe object for next key in path
      }
      if (!(context = context[bits[j]]))         // Proceed if argument has value
        return;
    }
  }
  return getter.call(watcher.$context);
}
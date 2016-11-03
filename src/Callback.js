// Invoke watcher whatever type it is
G.callback = function(value, watcher, old) {
  var method = G.callback.dispatch(watcher)
  return method(value, watcher, old);
};

// Find a callback function for given watcher
G.callback.dispatch = function(watcher) {
  if (watcher.$future) {
    return G.callback.future;
  } else if (watcher.$getter) {
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
  if (old)
    for (var after = old; after = after.$after;)                   // undo all conditional stuff
      if (after.$caller == old && after.$cause == watcher)         // that did not fire this time
        if (after.$multiple || !G.isUndone(after))
          G.uncall(after, true)
    
  G.$cause = caused;
  if (transformed == null)
    return value;
  if (!transformed.$context) {
    transformed = G.fork(transformed, value);
  }
  return G.record.transformation(transformed, old, value, watcher);
};

G.isUndone = function(value) {
  if (value.$context[value.$key] === value)
    return false;
  if (value.$succeeding && value.$succeeding.$preceeding === value)
    return false;
  if (value.$preceeding && value.$preceeding.$succeeding === value)
    return false;
  return true;
}

G.callback.iterator = function(value, watcher) {

  var called = G.$called;
  var caller = G.$caller;
  var caused = G.$cause;
  G.$cause = watcher;

  if (!value.$multiple) {
    // if property changed, use its context
    G.$called =  G.$caller = value = value.$context;
  }

  if (value.$after)
    var effects = G.effects.caused(value, watcher);
  watcher.$computing = true;
  G._observeProperties(value, watcher);

  watcher(value);
  watcher.$computing = false;

  if (effects)
    G.effects.clean(value, effects);

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
  var result = G.Future.invoke(watcher, value);
  if (result)
    return result.call('set')
}

G.callback.future = function(value, watcher) {
  var props = (watcher.$getter || watcher).$properties


  var called = G.$called;
  var caller = G.$caller;
  var caused = G.$cause;
  G.$cause = watcher;

  if (props && typeof value.valueOf() != 'object')
    // if property changed, use its context
    G.$called =  G.$caller = value = value.$context;

  if (value.$after)
    var effects = G.effects.caused(value, watcher);
  
  var result = G.Future.invoke(watcher, value);
  if (result)
    G.Future.notify(watcher, value, result)
  
  if (effects)
    G.effects.clean(value, effects);

  G.$called = called;
  G.$caller = caller;
  G.$cause  = caused;
  return result;
}

G.callback.transformation = function() {

}

G.callback.revoke = function(value, watcher) {
  var collection = G.effects.caused(value, watcher);
  if (collection)
    for (var i = 0; i < collection.length; i++)
      G.revoke(collection[i])
}

// Parse function to see which properties it uses
G.analyze = function(fn) {
  if (fn.$arguments) return fn;
  var string = String(fn)
  var target = 'this'

  if (fn.length) {                                  // check if first argument is something else than value
    var args = string.match(/\(\s*([^\),\s]*)/)[1];
    if (args && args != 'value') {
      fn.$properties = []
      target = args
    }
  }
  if (string.match(/if\s*\(/))
    fn.$conditional = true;
  if (string.match(/return/))
    fn.$returns = true;
  fn.$arguments = [] 
  var m = string.match(G.$findProperties);          // find all property accessors
  if (m)
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
  return fn;
}


G.callback.pass = function(value) {
  return value;
}

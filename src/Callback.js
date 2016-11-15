// Invoke watcher whatever type it is
G.callback = function(value, watcher, old) {
  var method = G.callback.dispatch(watcher)
  return method(value, watcher, old);
};

// Find a callback function for given watcher
G.callback.dispatch = function(watcher) {
  if (watcher.$future || watcher.$properties) {
    return G.callback.future;
  } else if (watcher.$getter) {
    return G.callback.getter
  } else if (typeof watcher == 'object') {
    return G.callback.proxy
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

G.callback.proxy = function(value, watcher) {
  var target = watcher.$target || watcher;

  if (watcher.$method) {
    return G[watcher.$method](target, value.$key, value, watcher.$meta)
  } else {
    return G.set(target, value.$key, value, watcher.$meta)
  }
}

G.callback.getter = function(value, watcher) {
  var old = watcher.$current;
  watcher.$current = G.Future.invoke(watcher, value);
  if (watcher.$current) {
    var result = watcher.$current.call('set')
    if (old)
      G.revoke(old)
    return result;
  } else {
    G.Future.revoke(watcher, value)
  }
  return result;
}

G.callback.future = function(value, watcher, old) {
  var props = (watcher.$getter || watcher).$properties
  var called = G.$called;
  var caller = G.$caller;
  var caused = G.$cause;
  G.$cause = watcher;

  if (props && typeof value.valueOf() != 'object')
    // if property changed, use its context
    G.$called =  G.$caller = value = value.$context;

  
  if (!watcher.$context || value.$key === watcher.$key // 1. Future observes key
    && value.$context === watcher.$context) {          // When observed value was set or changed
    var target = value;                                //   only run callback against that value
  } else {                                             // Side effects are owned by observed value
    if (watcher.$key) {
      var targeting = true;                            // When property used in callback was changed
      var target = watcher.$context[watcher.$key]      //   trigger callback for each observed value
      while (target && target.$previous)               
        target = target.$previous;
    } else {                                           
      var last = watcher.$last;                        // 2. Future is anonymous
      watcher.$last = G.$called;                       // Last changed property owns caused side effects
    }
    
  }

  while (target !== false) {
    var effects = undefined;
    if (target) {
      G.$caller = target || value;
      G.$called =  G.record.find(target);
      if (target != old && old && !old.$multiple && !target.$multiple)
        effects = G.effects.caused(old, watcher);
      else if (target.$after)
        effects = G.effects.caused(target, watcher);
    } else if (last) {
      effects = G.effects.caused(last, watcher)
    }
    if (watcher.$future) {
      var result = G.Future.invoke(watcher, target);
      if (result) {
        if (!G.Future.notify(watcher, target, result))
          effects = undefined;
      } else {
        G.Future.revoke(watcher, target)
      }
    } else {
      watcher.$computing = true;
      G._observeProperties(target, watcher);
      watcher(target);
      watcher.$computing = false;
    }
    if (effects)
      G.effects.clean(target, effects);


    target = targeting && target && target.$next || false;
  }
    G.$called = called;
    G.$caller = caller;
    G.$cause  = caused;
  return result;
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
      //fn.$properties = []
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
          (fn.$properties || (fn.$properties = [])).push(clean.split('.'))
      }
    }
  return fn;
}


G.callback.pass = function(value) {
  return value;
}

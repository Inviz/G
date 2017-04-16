/*
  Callbacks are functions that depend upon one or many
  variables and are triggered when those variables change.

  Callbacks are only triggered for top value in the stack.
  Callbacks are triggered for each value of array, like iterators.

  Callbacks 
  Callback can be of multiple types:
    - *Property transformer* can mutate input value
    - *Proxy* passes all state changes to another object
    - *Property watcher* listens for one property
    - *Computed property* listens for multiple properties, assigns value
    - *Future* listens for multiple properties
      If a future observes object
      If a future observes array, it act as iterator and can compute mapped collection

*/


// Invoke watcher whatever type it is
// Callback functions do not care about their calling context
G.callback = function(value, watcher, old) {
  var method = G.callback.dispatch(watcher)
  return method(value, watcher, old);
};

// Find a callback handler for given watcher
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
  var transformed = watcher.call(value.$context, value, old);
  if (old)
    for (var after = old; after = after.$after;)                   // undo all conditional stuff
      if (after.$caller == old && after.$cause == watcher)         // that did not fire this time
        if (after.$multiple || G.stack.isLinked(after))
          after.uncall(true)
    
  G.$cause = caused;
  if (transformed == null)
    return value;
  if (!transformed.$context) {
    transformed = G.fork(transformed, value);
  }
  return G.record.transformation(transformed, old, value, watcher);
};

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
  watcher.$current = G.future.invoke(watcher, value);
  if (watcher.$current) {
    var result = watcher.$current.call('set')
    if (old)
      G.revoke(old)
    return result;
  } else {
    G.future.revoke(watcher, value)
  }
  return result;
}

G.callback.future = function(value, watcher, old) {
  if (watcher.$computing)
    return;
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
      var target = G.value.current(watcher)            //   trigger callback for each observed value
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
      if (target != old && old && !old.$multiple && !target.$multiple && target.$key == old.$key && target.$context == old.$context)
        effects = G.effects.caused(old, watcher);
      else if (target.$after)
        effects = G.effects.caused(target, watcher);
    } else if (last) {
      effects = G.effects.caused(last, watcher)
    }
    if (watcher.$future) {
      var result = G.future.invoke(watcher, target);
      if (result) {
        result.call = G.future._callValue;
        if (!G.future.notify(watcher, target, result))
          effects = undefined;
      } else {
        G.future.revoke(watcher, target)
      }
    } else {
      watcher.$computing = true;
      G.callback.observe(target, watcher);
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
G.callback.analyze = function(fn) {
  if (fn.$arguments) return fn;
  var string = String(fn)

  if (fn.length) {                                  // check if first argument is something else than value
    var args = string.match(/\(\s*([^\),\s]*)/)[1];
    if (args && args != 'value') {
      //fn.$properties = []
      var target = args
    }
  }
  //if (string.match(/if\s*\(/))
  //  fn.$conditional = true;
  if (string.match(/return/)) {
    fn.$returns = true;

    if (string.match(/\.Node\s*\(/))
      fn.$migrator = G.Node; // fast lane recomputation of JSX templates
  }

  fn.$arguments = [] 
  var m = string.match(G.$findProperties);          // find all property accessors
  if (m)
    matches: for (var i = 0; i < m.length; i++) {
      if (m[i].substring(0, 5) == 'this.') {
        var clean = m[i].substr(5).replace(G.$cleanProperty, '');
        if (clean) {
          for (var j = 0; j < fn.$arguments.length; j++) {
            if (fn.$arguments[j].join('.') == clean)
              continue matches;
          }
          fn.$arguments.push(clean.split('.'))
        }
      } else if (target && m[i].substring(0, target.length) 
             &&  m[i].charAt(target.length) == '.') {
        var clean = m[i].substr(target.length + 1).replace(G.$cleanProperty, '');
        if (clean)
          (fn.$properties || (fn.$properties = [])).push(clean.split('.'))
      }
    }
  return fn;
}
G.callback.observe = function(array, callback) {
  var properties = (callback.$getter || callback).$properties
  if (properties) {
    for (var j = 0; j < properties.length; j++)
      G.watch(array, properties[j][0], callback)
  }
}

G.callback.unobserve = function(array, callback) {
  var properties = (callback.$getter || callback).$properties
  if (properties) {
    for (var j = 0; j < properties.length; j++)
      G.unwatch(array, properties[j][0], callback)
  }
}

G.callback.pass = function(value) {
  return value;
}

// find used properties in callbacks like this.author.name
G.$findProperties = /[a-zA-Z0-9_]+\s*(?:(?:\.\s*[_a-zA-Z-0-9]+)+)\s*(?:\()?/g
// clean up property, cut off chained method call
G.$cleanProperty = /(?:.|^)\s*([_a-zA-Z-0-9]+)\s*(\()|\s*/g

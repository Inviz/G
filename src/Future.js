
G.Future = function(context, key, watcher) {
  this.$context = context;
  this.$key = key;
  this.$cause = watcher
}

G.Future.prototype.call = function(method) {
  if (this.$future) {
    if (this.$key) {
      G._addWatcher(this.$context, this.$key, this, '$watchers');
      var value = this.$context[this.$key]
    }

    var computed = G.Future.invoke(this);                //    Invoke computation callback
    //if (computed == null)
    //  G.Future.revoke(this)
    if (this.$getter.$arguments.length){
      G.Future.watch(this.$context, this.$key, this)
    } else{
      if (computed) 
        G.Future.notify(this, value, computed)
    }

    return this.$current
  } else {
    G.Future.subscribe(this, null, this.$cause, this.$meta, method)
    return this;
  }
}
G.Future.prototype.uncall = function() {
  if (this.$future) {

    var appl = this.$applications;
    if (appl)
      for (var i = 0; i < appl.length; i++)
        G.Future.unsubscribe(appl[i].$context, appl[i].$key, this, appl[i].$meta, true)
    this.$context.unwatch(this.$key, this)
    this.$current = undefined
  } else {
    G.Future.unsubscribe(this.$context, this.$key, this.$cause)
  }
}

// make sure used arguments all have value
G.Future.prepare = function(watcher, trigger) {
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
      if (!(context = context[bits[j]]) && (getter.$returns || watcher.$future)) // Proceed if argument has value
        return;
    }
    var computed = context.$computed;
    if (!computed)
      computed = context.$computed = []
    if (computed.indexOf(watcher) == -1)
      computed.push(watcher);
  }

  return true
}

G.Future.invoke = function(watcher, value) {
  watcher.$computing = true;

  if (G.Future.prepare(watcher, value))
    var computed = G.Future.compute(watcher, value);                //    Invoke computation callback
  G._observeProperties(value, watcher);
  watcher.$computing = undefined;
  if (computed != null) {                            //    Proceed if value was computed
    if (computed.$referenced)
      var result = computed;
    else {
      var result = G.create(watcher.$context, null, computed);
      result.$key = watcher.$key; // avoid reusing of value
    }
    result.$cause = watcher
    result.$meta = watcher.$meta;
    result.$context = watcher.$context;
    result.ondetach = G.Future._unsetValue;
    return result;
  }
}

G.Future.revoke = function(watcher, value) {
  var current = watcher.$context[watcher.$key];
  if (current == watcher.$current)
  if (value && !value.$multiple && current && !current.$multiple) {
    G.revoke(current)
    watcher.$current = undefined
  }
}

G.Future.notify = function(watcher, value, result) {
  var called = G.$called;
  G.record(result)
  var cause = G.$cause;
  G.$cause = watcher;
  var current = watcher.$current;

  var old = G.Future.setValue(watcher, value, result);
  if (!old) {
    G.record.push(result)
    if (!current || result.valueOf() != current.valueOf()) {
      var appl = watcher.$applications;
      if (appl)
        for (var i = 0; i < appl.length; i++)
          G.Future.update(appl[i], result);
    }
    G.record.pop(result)
    return true;
  } else {
    called.$after = old;
    G.$called = G.last(old);
  }
  G.$cause = cause;
}

// Run computed property callback if all properties it uses are set
G.Future.compute = function(watcher, current) {
  if (current === undefined)
    current = watcher.$context[watcher.$key];

  var getter = watcher.$getter;
  if (!getter.$returns || current || !watcher.$getter.length)
    return getter.call(watcher.$context, current);
}

G.Future.watch = function(context, key, watcher) {
  var callback = watcher.$getter || watcher;
  for (var i = 0; i < callback.$arguments.length; i++) {
    watcher.$computing = i < callback.$arguments.length - 1;
    G.watch(context, callback.$arguments[i][0], watcher, false);
    watcher.$computing = undefined;
  }
}

G.Future.unwatch = function(context, key, watcher) {
  var callback = watcher.$getter || watcher;
  for (var i = 0; i < callback.$arguments.length; i++) {
    var args = callback.$arguments[i]
    var argument = callback.$arguments[i];

    var value = context;
    for (var j = 0; j < args.length; j++) {
      var watchers = value.$watchers[argument[j]];
      if (!watchers) continue;
      for (var k= 0; k < watchers.length; k++) {
        if (watchers[k].$getter == callback && watchers[k].$key == key) {
          G.unwatch(value, args[j], watchers[k], false)
        }
      }
      value = value[args[j]]
      if (!value)
        break;
    }
  }
}
G.Future.setValue = function(watcher, value, result) {
  var current = watcher.$current;
  if (!current || (!current.$multiple && result)) {
  
    if (watcher.$current)                               // uncall state changes made on future directly
      G.Future.revokeCalls(watcher.$current, watcher)   // e.g. future.set('prop', value)
    watcher.$current = result;
    if ((value || G.$caller).$multiple)
      result.$multiple = true;
  } else {
    for (var n = watcher.$current; n; n = n.$previous) {
      if (n.$caller === value) {
        if (n === watcher.$current)
          watcher.$current = n.$previous;
        var old = n;
        break;
      }
    }
    if (!old || old.valueOf() != result.valueOf()) {
      watcher.$current = G.verbs.push(result, watcher.$current)
      if (old)
        old.uncall()
    } else {
      return old;
    }
  }
  if (watcher.$calls) {
    var target = result.$source || result
    for (var i = 0; i < watcher.$calls.length; i++) {
      var cause = G.$cause;
      G.record.push(target)
      G.$cause = watcher;
      target[watcher.$calls[i][0]].apply(target, watcher.$calls[i].slice(1))
      G.$cause = cause;
      G.record.pop()
    }
  }
}

G.Future.revokeCalls = function(value, watcher) {
  var effects = G.effects.caused(value.$source || value, watcher)
  if (effects)
    for (var i = 0; i < effects.length; i++)
      effects[i].uncall();
}
G.Future._getValue = function() {
  if (this.$current && !this.$current.$multiple)
    return this.$current.valueOf();
  return this.$current
}
G.Future._unsetValue = function() {
  var current = this.$cause.$current;
  G.Future.revokeCalls(this, this.$cause)
  if (this == current)
    if (this.$multiple) {
      this.$cause.$current = G.Array.getPrevious(this) || G.Array.getNext(this);
    } else {
      this.$cause.$current = undefined;
    }
}

G.Future.unsubscribe = function(context, key, watcher, meta, soft) {
  if (!soft) {
    for (var i = 0; i < watcher.$applications.length; i++) {
      if (watcher.$applications[i].$context == context 
      && watcher.$applications[i].$key == key) {
        watcher.$applications.splice(i, 1);
        break;
      }
    }
  }
  if (watcher.$current){
    watcher.$unsubscribing = true;
    var result = context.unset(key, watcher.valueOf(), meta)
    watcher.$unsubscribing = false;
    return result;
  }
}

G.Future.unobserve = function(watcher, application) {
  if (!watcher) return;
  if (!watcher.$applications || watcher.$unsubscribing) return;
  var index = watcher.$applications.indexOf(application);
  if (index > -1) watcher.$applications.splice(index, 1)
}


G.Future.update = function(app, result) {
  var cause = G.$cause;
  G.$cause = app;
  if (app.$method)
    app.$context[app.$method](app.$key, result, app.$meta)
  else
    app.$context.set(app.$key, result, app.$meta)
  G.$cause = cause;
}

// Apply future to new context
G.Future.subscribe = function(context, key, watcher, meta, method) {
  if (key) {
    var application = new G.Future(context, key);
  } else {
    var application = context;
    var context = application.$context;
    var key = application.$key;
  }
  application.$method = method;


  if (typeof method == 'string')
    if (G.verbs[method].multiple)
      application.$leading = context[key]; // remember last head element for array verbs

  (watcher.$applications || (watcher.$applications = []))
    .push(application)
    
  if (watcher.$current) {
    var cause = G.$cause;
    G.$cause = application;
    G.record.push(watcher.$current)
    G.$called = G.last(watcher.$current);
    if (method)
      context[method](key, watcher.$current, meta)
    else
      context.set(key, watcher.$current, meta)
    G.record.pop()
    G.$cause = cause;
  }

  return application
}

G.Future.catchAll = function(property) {
  return function() {
    var result = [property];
    for (var i = 0; i < arguments.length; i++)
      result.push(arguments[i])
    if (!this.$calls) this.$calls = []
    this.$calls.push(result)
    return this;
  }
}

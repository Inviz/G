/*
  Future is a declarative value assignment 
  that may be computed and updated asynchronously.

  It encapsulates logic of observing multiple variables,
  triggering updates, assigning computed value
  and recomputing side effects. 

  It is used for  future proxies, computed properties,
  observable variables and loops 
  as seen in Watcher.js
*/
G.future = function(context, key, watcher) {
  this.$context = context;
  this.$key = key;
  this.$cause = watcher
}
G.future.compiled = true;

G.future.prototype.call = function(method) {
  if (this.$future) {
    if (this.$key) {
      G._addWatcher(this.$context, this.$key, this, '$watchers');
      var value = G.value.current(this);
    }

    var computed = G.future.invoke(this);                //    Invoke computation callback
    //if (computed == null)
    //  G.future.revoke(this)
    if (this.$getter.$arguments.length){
      G.future.watch(this.$context, this.$key, this)
    } else{
      if (computed) 
        G.future.notify(this, value, computed)
    }

    return this.$current
  } else {
    G.future.subscribe(this, null, this.$cause, this.$meta, method)
    return this;
  }
}
G.future.prototype.uncall = function() {
  if (this.$future) {

    var appl = this.$applications;
    if (appl)
      for (var i = 0; i < appl.length; i++)
        G.future.unsubscribe(appl[i].$context, appl[i].$key, this, appl[i].$meta, true)
    this.$context.unwatch(this.$key, this)
    this.$current = undefined
  } else {
    G.future.unsubscribe(this.$context, this.$key, this.$cause)
  }
}

// make sure all used arguments have resolved value
G.future.prepare = function(watcher, trigger) {
  var getter = watcher.$getter;
  var args = getter.$arguments;
  if (!args)
    args = G.callback.analyze(getter).$arguments;

  for (var i = 0; i < args.length; i++) {
    var context = watcher.$context;
    var bits = args[i]
    for (var j = 0; j < bits.length; j++) {       
      if (trigger && trigger.$key == bits[j]     
        && trigger instanceof G) {               // When observer returned object
        trigger.watch(bits[j + 1], watcher);     //   Observe object for next key in path
      }
      if (!(context = context[bits[j]]) 
      && (getter.$returns || watcher.$future))   // Proceed if argument has value
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

G.future.invoke = function(watcher, value) {
  watcher.$computing = true;

  if (G.future.prepare(watcher, value)) {
    var computed = G.future.compute(watcher, value);                //    Invoke computation callback
  }
  G.callback.observe(value, watcher);
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
    result.ondetach = G.future._unsetValue;
    return result;
  }
}

G.future._callValue = function() {
  if (this.$multiple) {
    G.Array.inject(this, true)
    G.effects.each(this, G.call)
  } else {

  }
  return;
}

G.future.revoke = function(watcher, value) {
  var current = G.value.current(watcher);
  if (current == watcher.$current)
  if (value && !value.$multiple && current && !current.$multiple) {
    G.revoke(current)
    watcher.$current = undefined
  }
}

G.future.notify = function(watcher, value, result) {
  var called = G.$called;
  G.record(result)
  var cause = G.$cause;
  G.$cause = watcher;
  var current = watcher.$current;

  var old = G.future.setValue(watcher, value, result);
  if (!old) {
    G.record.push(result)
    if (!current || result.valueOf() != current.valueOf()) {
      var appl = watcher.$applications;
      if (appl)
        for (var i = 0; i < appl.length; i++)
          G.future.update(appl[i], result);
    }
    G.record.pop(result)
    return true;
  } else if (called) {
    called.$after = old;
    G.$called = G.record.last(old);
  }
  G.$cause = cause;
}

// Run computed property callback if all properties it uses are set
G.future.compute = function(watcher, value) {
  if (value === undefined)
    value = G.value.current(watcher);

  var getter = watcher.$getter;
  var recorder = getter.$migrator;
  if (recorder) {
    var current =  watcher.$current;
    for (; current; current = current.$previous) {
      if (current.$caller === G.$caller) {
        var source = current;
        break;
      }
    }
    if (!current) {
      for (var after = value; after = after.$after;) {
        if (after.$cause == watcher) {
          var source = after;
          break;
        }
      }
    }
  }
  if (!getter.$returns || value || !watcher.$getter.length) {
    if (source)
      recorder.record();
    var result = getter.call(watcher.$context, value);
    if (source) {
      return source.migrate(recorder.stop(result));
    }

    return result;
  }
}

G.future.watch = function(context, key, watcher) {
  var callback = watcher.$getter || watcher;
  for (var i = 0; i < callback.$arguments.length; i++) {
    watcher.$computing = i < callback.$arguments.length - 1;
    G.watch(context, callback.$arguments[i][0], watcher, false);
    watcher.$computing = undefined;
  }
}

G.future.unwatch = function(context, key, watcher) {
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
G.future.setValue = function(watcher, value, result) {
  var current = watcher.$current;
  if (!current || (!current.$multiple && result)) {
  
    if (watcher.$current)                               // uncall state changes made on future directly
      G.future.revokeCalls(watcher.$current, watcher)   // e.g. future.set('prop', value)
    watcher.$current = result;
    if ((value || G.$caller).$multiple) {
      result.$multiple = true;
    }
  } else {
    for (var n = watcher.$current; n; n = n.$previous) {
      if (n.$caller === value) {
        if (n === watcher.$current) {
          if (n === result)
            return result;
          watcher.$current = n.$previous;
        }
        var old = n;
        break;
      }
    }
    if (!old || old.valueOf() != result.valueOf()) {
      if (watcher.$current) {
        G.Array.verbs.push(result, watcher.$current)
        watcher.$current = G.Array.last(watcher.$current);
      } else
        watcher.$current = result;

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

G.future.revokeCalls = function(value, watcher) {
  var effects = G.effects.caused(value.$source || value, watcher)
  if (effects)
    for (var i = 0; i < effects.length; i++)
      effects[i].uncall();
}
G.future._getValue = function() {
  if (this.$current && !this.$current.$multiple)
    return this.$current.valueOf();
  return this.$current
}
G.future._unsetValue = function() {
  var current = this.$cause.$current;
  G.future.revokeCalls(this, this.$cause)
  if (this == current)
    if (this.$multiple) {
      this.$cause.$current = G.Array.getPrevious(this) || G.Array.getNext(this);
    } else {
      this.$cause.$current = undefined;
    }
}

G.future.unsubscribe = function(context, key, watcher, meta, soft) {
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

G.future.unobserve = function(watcher, application) {
  if (!watcher) return;
  if (!watcher.$applications || watcher.$unsubscribing) return;
  var index = watcher.$applications.indexOf(application);
  if (index > -1) watcher.$applications.splice(index, 1)
}


G.future.update = function(app, result) {
  var cause = G.$cause;
  G.$cause = app;
  if (app.$method)
    app.$context[app.$method](app.$key, result, app.$meta)
  else
    app.$context.set(app.$key, result, app.$meta)
  G.$cause = cause;
}

// Apply future to new context
G.future.subscribe = function(context, key, watcher, meta, method) {
  if (key) {
    var application = new G.future(context, key);
  } else {
    var application = context;
    var context = application.$context;
    var key = application.$key;
  }
  application.$method = method;


  if (typeof method == 'string')
    if (G.verbs[method].multiple)
      application.$leading = G.value.current(application); // remember last head element for array verbs

  (watcher.$applications || (watcher.$applications = []))
    .push(application)
    
  if (watcher.$current) {
    var cause = G.$cause;
    G.$cause = application;
    G.record.push(watcher.$current)
    G.$called = G.record.last(watcher.$current);
    if (method)
      context[method](key, watcher.$current, meta)
    else
      context.set(key, watcher.$current, meta)
    G.record.pop()
    G.$cause = cause;
  }

  return application
}

G.future.catchAll = function(property) {
  return function() {
    var result = [property];
    for (var i = 0; i < arguments.length; i++)
      result.push(arguments[i])
    if (!this.$calls) this.$calls = []
    this.$calls.push(result)
    return this;
  }
}

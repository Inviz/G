
G.Future = function(context, key, watcher) {
  this.$context = context;
  this.$key = key;
  this.$watcher = watcher
}

G.Future.prototype.call = function() {
  if (this.$future) {
    if (this.$key) {
      G._addWatcher(this.$context, this.$key, this, '$watchers');
      var value = this.$context[this.$key]
    }

    if (G.Future.prepare(this, value))
      var computed = G.Future.invoke(this);                //    Invoke computation callback
    if (this.$getter.$arguments.length){
      for (var i = 0; i < this.$getter.$arguments.length; i++)
        G.watch(this.$context, this.$getter.$arguments[i][0], this, false)
    } else{
      if (computed) 
        G.Future.notify(this, computed)
    }

    return this.$current
  } else {
    G.Future.subscribe(this.$context, this.$key, this.$watcher)
    return this;
  }
}
G.Future.prototype.uncall = function() {
  if (this.$future) {

    var appl = this.$applications;
    if (appl)
      for (var i = 0; i < appl.length; i++)
        G.Future.unsubscribe(appl[i].$context, appl[i].$key, this, true)
    G.Future.unwatch(this.$context, this.$key, this)
    this.$current = undefined
  } else {
    G.Future.unsubscribe(this.$context, this.$key, this.$watcher)
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
      if (!(context = context[bits[j]]))         // Proceed if argument has value
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

  var current = watcher.$context[watcher.$key];
  if (G.Future.prepare(watcher, value))
    var computed = G.Future.compute(watcher);                //    Invoke computation callback
  watcher.$computing = undefined;
  if (computed == null) {                            //    Proceed if value was computed
    if (current)
      G.uncall(current, watcher.$meta)
    watcher.$current = undefined
    return
  } else {
    computed = computed.valueOf();
    var result = G.extend(computed, watcher.$context, watcher.$key);
    result.$cause = watcher
    result.$meta = watcher.$meta;
    result.$context = watcher.$context;
    result.ondetach = G._unsetFutureValue;
    return result;
  }
}

G.Future.notify = function(watcher, result) {
  G.record.sequence(result)
  G.record.causation(result)
  G.record.push(result)
  var current = watcher.$current;
  watcher.$current = result;
  if (!current || result.valueOf() != current.valueOf()) {
    var appl = watcher.$applications;
    if (appl)
      for (var i = 0; i < appl.length; i++)
        G.Future.update(appl[i], result);
  }
  G.record.pop(result)
}

// Run computed property callback if all properties it uses are set
G.Future.compute = function(watcher, trigger, current) {
  if (current === undefined)
    current = watcher.$context[watcher.$key];

  var getter = watcher.$getter;
  if (!getter.$returns || current || !watcher.$getter.length)
    return getter.call(watcher.$context, current);
}

G.Future.unwatch = function(context, key, watcher) {
  var callback = watcher.$getter;
  if (!callback.$arguments.length) {
    G._removeWatcher(context, key, watcher, '$watchers');
    return
  }
  for (var i = 0; i < callback.$arguments.length; i++) {
    var args = callback.$arguments[i]
    var argument = callback.$arguments[i];

    var value = context;
    for (var j = 0; j < args.length; j++) {
      var watchers = value.$watchers[argument[j]];
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

G.Future.unsubscribe = function(context, key, watcher, soft) {
  if (!soft) {
    for (var i = 0; i < watcher.$applications.length; i++) {
      if (watcher.$applications[i].$context == context 
      && watcher.$applications[i].$key == key) {
        watcher.$applications.splice(i, 1);
        break;
      }
    }
  }
  if (watcher.$current)
    return context.unset(key, watcher.valueOf())
}


G.Future.update = function(application, result) {
  application.$context.set(application.$key, result)
}

// Apply future to new context
G.Future.subscribe = function(context, key, watcher) {
  var application = new G.Future(context, key);

  (watcher.$applications || (watcher.$applications = []))
    .push(application)
    
  if (watcher.$current) {
    G.record.push(watcher.$current)
    G.$called = G.last(watcher.$current);
    context.set(key, watcher.$current)
    G.record.pop()
  }

  return application
}



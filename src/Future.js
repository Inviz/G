
G.Future = function() {

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

// Run computed property callback if all properties it uses are set
G.Future.compute = function(watcher, trigger, current) {
  if (current === undefined)
    current = watcher.$context[watcher.$key];

  var getter = watcher.$getter;
  if (!getter.$returns || current || !watcher.$getter.length)
    return getter.call(watcher.$context, current);
}

G.Future.uncall = function(watcher) {
  var appl = watcher.$applications;
  if (appl)
    for (var i = 0; i < appl.length; i+=2)
      G.Future.unsubscribe(appl[i], appl[i + 1], watcher)
  if (watcher.$current)
    G.Future.unwatch(watcher.$context, watcher.$key, watcher)
  watcher.$current = undefined
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

G.Future.unsubscribe = function(context, key, watcher) {
  context.set(key, null);
}

// Apply future to new context
G.Future.subscribe = function(context, key, watcher) {

  (watcher.$applications || (watcher.$applications = []))
    .push(context, key)
    
  if (watcher.$current) {
    G.record.push(watcher.$current)
    G.$called = G.last(watcher.$current);
    context.set(key, watcher.$current)
    G.record.pop()
  }
}



G.Modules.Object = {
  watch: function(context, key, watcher, pure) {
    var source, value, watchers;
    if (pure) {
      source = G.formatters;
    } else {
      source = G.watchers;
    }
    if (!(watchers = source.get(context))) {
      source.set(context, watchers = {});
    }

    // Create new array of watchers 
    if (watchers[key]) {
      watchers[key] = watchers[key].concat(watcher);
    } else {
      watchers[key] = [watcher];
    }
    if (value = context[key]) {
      while (value.$transform) {
        value = value.$before;
      }
      if (!value.$context) {

        // Value was not unboxed yet:   Reassign it through the pipeline 
        return G.set(context, key, value);
      } else if (pure) {

        // New value transformer:       Re-apply value 
        return G.call(value, 'set');
      } else {

        // New value observer:          Update side effects 
        return G.affect(value);
      }
    }
  },
  unwatch: function(context, key, watcher, pure) {
    var group, source, value, watchers;
    if (pure) {
      source = G.formatters;
    } else {
      source = G.watchers;
    }

    // Create a new array of watchers that excludes given one 
    if (watchers = source.get(context)) {
      if (group = watchers[key]) {
        watchers[key] = group.filter(function(other) {
          return other !== watcher;
        });
      }
    }
    if (value = context[key]) {
      if (pure) {

        // New value transformer:       Re-apply value 
        return G.call(value, 'set');
      } else {

        // New value observer:          Update side effects 
        return G.affect(value);
      }
    }
  },
  merge: function(context, object, meta, scope) {
    var key, op, value;
    for (key in object) {
      value = object[key];
      op = G(context, key, value, meta, scope);
    }
    return op;
  }
};

// Placeholder for actual op transform 
G.Methods.Version = {
  version: function(type, index, payload, string, context, key, meta, scope, lazy) {
    var operation;
    if (lazy) {
      operation = G.create(context, key, string, meta, scope);
    } else {
      operation = G(context, key, string, meta, scope);
    }
    operation.$type = type;
    operation.$index = index;
    operation.$payload = payload;
    return operation;
  },
  apply: function() {
    var i, len, operation, results;
    results = [];
    for (i = 0, len = arguments.length; i < len; i++) {
      operation = arguments[i];
      results.push(G[dispatch(operation)](operation.$context, operation.$key, operation.$index, operation.$payload, operation.$meta, operation.$scope, false));
    }
    return results;
  },
  insert: function(context, key, index, value, meta, scope, lazy) {
    var old, string;
    if (old = context[key]) {
      string = old.substring(0, index) + value + old.substring(index);
    } else {
      string = value;
    }
    return G.version('insert', index, value, string, context, key, meta, scope, lazy);
  },
  "delete": function(context, key, index, length, meta, scope, lazy) {
    var string;
    string = context[key].substring(0, index) + context[key].substring(index + length);
    return G.version('delete', index, length, string, context, key, meta, scope, lazy);
  },

  //differ: require('diff_match_patch') 
  diff: function(operation, value) {
    var diff;
    diff = engine.diff_main(operation, value);
    engine.diff_cleanupEfficiency(diff);
    return G.fromDiff(operation, diff);
  }
};

dispatch = function(operation) {
  if (typeof operation.$payload === 'number') {
    return 'delete';
  } else {
    return 'insert';
  }
};


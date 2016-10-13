(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Observer;

Observer = {
  record: function(value, old, method, previous, transform) {
    if (transform) {
      value.$transform = transform;
      value.$before = previous;
      if (previous.$after && !previous.$after.$transform) {
        value.$after = previous.$after;
      }
      value.$before.$after = value;
    } else {
      if (G.callee) {
        value.$callee = G.callee;
      }
      if (method) {
        if (old) {
          if (old.$after !== value) {
            value.$after = old.$after;
          }
        }
        if (G.called) {
          value.$before = G.called;
          value.$before.$after = value;
        }
        G.called = value;
      }
    }
    if (value.$after === value || (value.$before && value.$before.$after === value.$before)) {
      throw 'zomg circular';
    }
    return value;
  },
  format: function(value, old) {
    var after, formatters, given, group, i, len, watcher;
    if (formatters = G.formatters.get(value.$context)) {
      group = formatters[value.$key];
    }
    given = value;
    while (value.$transform) {
      value = value.$before;
    }
    if (G.formatterz.get(value) === group) {
      while (value.$after && value.$after.$transform) {
        value = value.$after;
      }
    } else {
      if (group && group.length) {
        G.formatterz.set(value, group);
        for (i = 0, len = group.length; i < len; i++) {
          watcher = group[i];
          value = G.callback(value, watcher, old);
        }
      } else if (value.$after.$transform) {
        G.formatterz["delete"](value);
        after = value.$after;
        while (after && after.$transform) {
          after = after.$after;
        }
        value.$after = after;
        if (after) {
          after.$before = value;
        }
      }
      G.rebase(given, value);
    }
    return value;
  },
  affect: function(value, old) {
    var after, called, callee, current, group, i, len, reapplied, watcher, watchers;
    if (watchers = G.watchers.get(value.$context)) {
      if (!(group = watchers[value.$key])) {
        if (G.watcherz.get(value)) {
          G.watcherz["delete"](value);
        }
        if (!G.callee) {
          G.called = null;
        }
        return;
      }
    } else {
      if (!G.callee) {
        G.called = null;
      }
      return;
    }
    callee = G.callee;
    called = G.called;
    G.called = G.callee = value;
    if (current = G.watcherz.get(value)) {
      after = value;
      while (after = after.$after) {
        if (after.$callee === value) {
          if (current === group) {
            G.call(after);
            reapplied = true;
          } else {
            G.recall(after);
          }
        }
      }
    }
    if (!reapplied) {
      G.watcherz.set(value, group);
      while (value.$after && value.$after.$transform) {
        value = value.$after;
      }
      if (group) {
        for (i = 0, len = group.length; i < len; i++) {
          watcher = group[i];
          value = G.callback(value, watcher, old);
        }
      }
    }
    G.callee = callee;
    G.called = callee && called;
    return value;
  },
  deaffect: function(value) {
    var after;
    after = value;
    while (after = after.$after) {
      if (after.$callee === value) {
        G.recall(after);
      }
    }
  },
  callback: function(value, watcher, old) {
    var transform, transformed;
    transform = typeof watcher === 'function' ? watcher : watcher.$transform;
    transformed = transform(value, old);
    if (transformed == null) {
      return value;
    }
    if (!transformed.$context) {
      transformed = G.fork(transformed, value);
    }
    return G.record(transformed, old, null, value, transform);
  }
};

module.exports = Observer;


},{}],2:[function(require,module,exports){
var Object;

Object = {
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
        return G.set(context, key, value);
      } else if (pure) {
        return G.call(value, 'set');
      } else {
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
    if (watchers = source.get(context)) {
      if (group = watchers[key]) {
        watchers[key] = group.filter(function(other) {
          return other !== watcher;
        });
      }
    }
    if (value = context[key]) {
      if (pure) {
        return G.call(value, 'set');
      } else {
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

module.exports = Object;


},{}],3:[function(require,module,exports){
(function (global){
var G, Module, j, len, property, ref, value;

G = function(context, key, value) {
  var operation;
  if ((value == null) && (key != null)) {
    return G.recall(G.find.apply(G, arguments), true);
  }
  operation = G.create.apply(this, arguments);
  if (context) {
    return G.call(operation, 'set');
  } else {
    return G.record(operation, null, 'set');
  }
};

G.call = function(value, method) {
  var old, other;
  old = value.$context[value.$key];
  value = G.format(value, old);
  if (method && (old != null)) {
    if (!old.$key) {
      value.$default = old;
    } else {
      if (other = G.match(value, old)) {
        value = G.update(value, old, other);
      } else {
        G.methods[method](value, old);
      }
    }
  }
  if (value !== old && !value.failed) {
    G.record(value, old, method);
    value.$context[value.$key] = value;
    G.affect(value, old);
  }
  return value;
};

G.recall = function(value, hard) {
  var old, replacement;
  old = value.$context[value.$key];
  while (value.$after && value.$after.$transform) {
    value = value.$after;
  }
  if (old === value) {
    if (replacement = value.$preceeding) {
      return G.call(replacement);
    } else {
      delete value.$context[value.$key];
      G.deaffect(value);
    }
  } else if (hard) {
    G.rebase(value, null);
  }
};

G.create = function(context, key, value) {
  var i, meta, operation;
  if (this instanceof G) {
    operation = this;
    if (value != null) {
      operation.$value = value;
    }
  } else {
    operation = Object(value.valueOf());
  }
  if (key != null) {
    operation.$key = key;
  }
  if (context != null) {
    operation.$context = context;
  }
  if (G.callee) {
    meta = G.callee.$meta;
  }
  if (arguments.length > 3) {
    if (meta) {
      meta = meta.slice();
    } else {
      meta = new Array(arguments.length - 3);
    }
    i = 2;
    while (++i < arguments.length) {
      if (arguments[i] != null) {
        meta[i - 3] = arguments[i];
      }
    }
  }
  if (meta != null) {
    operation.$meta = meta;
  }
  return operation;
};

G.fork = G.prototype.fork = function(primitive, value) {
  var op;
  if (value == null) {
    value = this;
  }
  op = G.create(value.$context, value.$key, primitive);
  if (value.$meta) {
    op.$meta = value.$meta;
  }
  return op;
};

G.watchers = new WeakMap;

G.formatters = new WeakMap;

G.watcherz = new WeakMap;

G.formatterz = new WeakMap;

G.callee = G.called = null;

ref = [require('./Object'), require('./Stack'), require('./Effect')];
for (j = 0, len = ref.length; j < len; j++) {
  Module = ref[j];
  for (property in Module) {
    value = Module[property];
    G[property] = value;
  }
}

G.relate = require('./Wrapper/Relation');

G.proxy = require('./Wrapper/Proxy');

G.methods = {};

G.Methods = [require('./Relation/List'), require('./Relation/Property'), require('./Relation/Version')];

G.Methods.forEach(G.relate, G);

if (typeof global !== "undefined" && global !== null) {
  global.G = G;
}

module.exports = G;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Effect":1,"./Object":2,"./Relation/List":4,"./Relation/Property":5,"./Relation/Version":6,"./Stack":7,"./Wrapper/Proxy":8,"./Wrapper/Relation":9}],4:[function(require,module,exports){
var List, find;

find = function(value, property, index) {};

List = {
  'function': function(method) {
    return function(context, key, value, meta, scope) {
      return G.call(List, context, key, value, meta, scope, method);
    };
  },
  push: function(value, old) {
    if (old.$next) {
      value.$next = old.$next;
    }
    old.$next = value;
    value.$previous = old;
    return value;
  },
  unshift: function(value, old) {
    var first;
    first = old;
    while (first.$previous) {
      first = first.$previous;
    }
    first.$previous = value;
    value.$next = first;
    return old;
  },
  swap: function(value, old) {
    value.$previous = old.$previous;
    value.$next = old.$next;
    old.$next = old.$previous = void 0;
    return value;
  },
  remove: function(value) {
    var ref, ref1;
    if ((ref = value.$previous) != null) {
      ref.$next = value.$next;
    }
    if ((ref1 = value.$next) != null) {
      ref1.$previous = value.$previous;
    }
    return value.$previous || value.$next;
  }
};

module.exports = List;


},{}],5:[function(require,module,exports){
var Property;

Property = {
  'function': function(method) {
    return function(context, key, value) {
      if (value != null) {
        if (context) {
          return G.call(G.create.apply(G, arguments), method);
        } else {
          return operation;
        }
      } else {
        return G.recall(G.find.apply(G, arguments));
      }
    };
  },
  'method': function(method) {
    return function(key, value) {
      if (value != null) {
        switch (arguments.length) {
          case 2:
            return G.call(G.create(this, key, value), method);
          case 3:
            return G.call(G.create(this, key, value, arguments[2]), method);
          case 4:
            return G.call(G.create(this, key, value, arguments[2], arguments[3]), method);
          case 5:
            return G.call(G.create(this, key, value, arguments[2], arguments[3], arguments[4]), method);
        }
      } else {
        switch (arguments.length) {
          case 2:
            return G.recall(G.find(this, key, value));
          case 3:
            return G.recall(G.find(this, key, value, arguments[2]));
          case 4:
            return G.recall(G.find(this, key, value, arguments[2], arguments[3]));
          case 5:
            return G.recall(G.find(this, key, value, arguments[2], arguments[3], arguments[4]));
        }
      }
    };
  },
  assign: function(value, old) {
    return value;
  },
  set: function(value, old) {
    value.$preceeding = old;
    old.$succeeding = value;
    return value;
  },
  preset: function(value, old) {
    var first;
    first = old;
    while (first.$preceeding) {
      first = first.$preceeding;
    }
    first.$preceeding = value;
    value.$succeeding = first;
    return old;
  }
};

module.exports = Property;


},{}],6:[function(require,module,exports){
var Version, dispatch;

Version = {
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

module.exports = Version;


},{}],7:[function(require,module,exports){
var Stack;

Stack = {
  rebase: function(old, value) {
    var ref, ref1;
    if (value) {
      if (value.$succeeding = old.$succeeding) {
        value.$succeeding.$preceeding = value;
      }
      if (value.$preceeding = old.$preceeding) {
        value.$preceeding.$succeeding = value;
      }
    } else {
      if ((ref = old.$succeeding) != null) {
        ref.$preceeding = old.$preceeding;
      }
      if ((ref1 = old.$preceeding) != null) {
        ref1.$succeeding = old.$succeeding;
      }
      old.$succeeding = old.$preceeding = void 0;
    }
    return value;
  },
  update: function(value, old, other) {
    if (other === value) {
      return value;
    } else if (other === old) {
      G.rebase(old, value);
      return value;
    } else if (other) {
      G.rebase(other, value);
      return old;
    }
  },
  match: function(value, old) {
    var other;
    other = old;
    while (other) {
      if (other === value || G.compare(other.$meta, value.$meta)) {
        return other;
      }
      other = other.$preceeding;
    }
  },
  compare: function(meta1, meta2) {
    var i;
    if (meta1 === meta2) {
      return true;
    }
    if ((!meta1 && meta2) || (meta1 && !meta2)) {
      return false;
    }
    if (meta1.length !== meta2.length) {
      return false;
    }
    i = 0;
    while (i < meta1.length) {
      if (meta1[i] !== meta2[i]) {
        return false;
      }
      i++;
    }
    return true;
  },
  find: function(context, key) {
    return context[key];
  }
};

module.exports = Stack;


},{}],8:[function(require,module,exports){
module.exports = function(context, key, value) {
  return G(context, key, value);
};


},{}],9:[function(require,module,exports){
module.exports = function(relation) {
  var method, property, value, wrapper;
  for (property in relation) {
    value = relation[property];
    if (property === 'method' || property === 'function') {
      continue;
    }
    if (wrapper = relation["function"]) {
      this.methods[property] = value;
      this[property] = wrapper(property);
      if (method = relation.method) {
        this.prototype[property] = method(property);
      }
    } else {
      this[property] = value;
    }
  }
  return relation;
};


},{}]},{},[3]);

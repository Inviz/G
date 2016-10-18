G.Array = function() {

}
G.Array.prototype = new G

// Remove node from tree
G.Array.recall = function(self) {
  G.Array.unlink(self)
  return self
};

// Reapply node where it belongs in the tree
G.Array.extend = G.Array.call
G.Array.call = function(self) {
  for (var to = self; to.$last;)
    to = to.$last;
  G.Array.link(self.$leading, self)
  G.Array.link(to, to.$following)
  if (self.$parent) {
    // for each node in the remembered parent
    for (var item = self.$parent.$first; item; item = item.$next) {
      // check if it matches anything before op
      for (var before = self; before = before.$leading;) {
        if (before == self.$parent)
          break;
        if (before == item) {
          G.Array.register(before, self, self.$parent)
          return self
        }
      }
      for (var after = self; after = after.$following;) {
        if (after == item) {
          G.Array.register(self, after, self.$parent)
          return self
        }
        if (after == self.$parent.$last)
          break;
      }
    } 
  }
  return self;
};

// Iterate children
G.Array.forEach = function(self, callback, argument) {
  for (var last = self; last.$last;)
    last = last.$last
  
  for (var after = self; after.$following;) {
    if (after.$following.$leading !== after)
      break;
    after = after.$following
    if (after.$parent === self)
      callback(after, argument);
    if (after == last)
      break;
  }
  return last;
}


// Connect pointers of two sibling nodes together
G.Array.link = function(left, right) {
  if ((left.$following = right))                          // fix $following/$leading refs
    left.$following.$leading = left;
};

G.Array.register = function(left, right, parent) {
  left.$next = right;
  right.$previous = left;
  if (parent) {
    if (parent.$last == left)
      parent.$last = right;
    if (parent.$first == right)
      parent.$first = left;
    left.$parent = parent
    right.$parent = parent
  }
}

// Remove span of nodes from the graph
// Without second argument it removes op's children
G.Array.unlink = function(op, to) {
  if (to == null)                                     // find last deepest child
    for (var to = op; to.$last;)
      to = to.$last; 

  if (op.$parent) {                            // fix $first/$last refs in parent
    if (op.$parent.$first == op)
      op.$parent.$first = to && to.$following;
    if (op.$parent.$last == op)
      op.$parent.$last = op.$leading;
  }

  if (to && to.$following && to == to.$following.$leading)     // fix $following/$leading refs
    to.$following.$leading = op.$leading          // in place of detachment
  if (op.$leading)
    if (op == op.$leading.$following)
      op.$leading.$following = to && to.$following;
  return to;
}

G.Array.verbs = {

  // Add value on top of the stack 
  push: function(value, old) {
    G.Array.link(old, value)
    G.Array.register(old, value, old.$parent)

    return value;
  },

  // Add value to the bottom of the stack 
  unshift: function(value, old) {
    for (var first = old; first.$previous;)
      first = first.$previous;
    G.Array.link(value, first);
    G.Array.register(value, first, old.$parent)
    return old;
  },

  // Replace element in a list 
  swap: function(value, old) {
    if (old.$previous){
      G.Array.link(old.$previous, value)
      G.Array.register(old.$previous, value, old.$parent)
    }
    if (old.$next) {
      G.Array.link(value, old.$next)
      G.Array.register(value, old.$next, old.$parent)
    }
    old.$next = old.$previous = undefined;
    return value;
  },

  // Nest value into another
  inject: function(value, old) {
    if (old.$last) {
      for (var last = old; last.$last;)
        last = last.$last;
      G.Array.register(old.$last, value, old);
      G.Array.link(last, value)
    } else {
      old.$last = old.$first = value;
      value.$parent = old
      G.Array.link(old, value)
    }
    return old
  }
};


/*
G.Methods.Array = {
  iterate: function(array, callback) {
    var results;
    results = null;
    G.forEach(array, function(value, index, result) {
      var transformed;
      if (transformed = callback.call(value, index, result)) {
        return results = G.push(results, transformed);
      }
    });
    return results;
  },
  find: function(array, callback) {
    return G.iterate(array, callback, function(value, index, result) {
      if (result) {
        return value;
      }
    }, true);
  },
  filter: function(array, callback) {
    return G.iterate(array, callback, function(value, index, result) {
      if (result) {
        return value;
      }
    });
  },
  reject: function(array, callback) {
    return G.iterate(array, callback, function(value, index, result) {
      if (!result) {
        return value;
      }
    });
  },
  map: function(array, callback) {
    return G.iterate(array, callback, function(value, index, result) {
      return result;
    });
  },
  collect: function(array, callback) {
    return G.iterate(array, callback, function(value, index, result) {
      if (result) {
        return result;
      }
    });
  },
  splice: function(array, start, removing) {
    var diff, i, inserting, j, k, ref, ref1;
    inserting = arguments.length - 3;
    for (i = j = 0, ref = removing; j < ref; i = j += 1) {
      if (i < inserting) {
        G.swap(array, i + start, arguments[i + 3]);
      } else {
        G.eject(array, i + start);
      }
    }
    if ((diff = inserting - removing) > 0) {
      for (i = k = 0, ref1 = diff; k < ref1; i = k += 1) {
        G.inject(array, i + start + removing, arguments[i + 3 + removing]);
      }
    }
    return array;
  },
  getByIndex: function() {},
  setByIndex: function() {}
};
*/
G.Array = function() {

}
G.Array.prototype = new G

// Remove node from tree
G.Array.recall = function(operation) {
  G.Array.unlink(operation)
  return operation
};

// Reapply node where it belongs in the tree
G.Array.extend = G.Array.call
G.Array.call = function(op) {
  for (var to = op; to.$last;)
    to = to.$last;
  G.Array.link(op.$leading, op)                //    Patch graph and detach the tree at top
  G.Array.link(to, to.$following)
  return op;
};

// Iterate children
G.Array.Children = function(operation, callback, argument) {
  for (var last = operation; last.$last;)
    last = last.$last
  
  for (var after = operation; after.$following;) {
    if (after.$following.$leading !== after)
      break;
    after = after.$following
    if (after.$parent === operation)
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
  
  if (left.$parent) {
    if (left.$parent == right.$parent ) {            // Fix $first/$last refs in parent
      if (left.$parent.$last == left)
        left.$parent.$last = right;
      if (left.$parent.$first == right)
        left.$parent.$first = left;
    }
  }
};

// Remove span of nodes from the graph
// Without second argument it removes op's children
G.Array.unlink = function(operation, to) {
  if (to == null)                                     // find last deepest child
    for (var to = operation; to.$last;)
      to = to.$last; 

  if (operation.$parent) {                            // fix $first/$last refs in parent
    if (operation.$parent.$first == operation)
      operation.$parent.$first = to && to.$following;
    if (operation.$parent.$last == operation)
      operation.$parent.$last = operation.$leading;
  }

  if (to && to.$following && to == to.$following.$leading)     // fix $following/$leading refs
    to.$following.$leading = operation.$leading          // in place of detachment
  if (operation.$leading)
    if (operation == operation.$leading.$following)
      operation.$leading.$following = to && to.$following;
  return to;
}

G.Methods.Array = {

  // Add value on top of the stack 
  push: function(value, old) {
    G.Array.link(old, value)
    if (old.$next) {
      value.$next = old.$next;
    }
    old.$next = value;
    value.$previous = old;
    return value;
  },

  // Add value to the bottom of the stack 
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

  // Replace element in a list 
  swap: function(value, old) {
    value.$previous = old.$previous;
    value.$next = old.$next;
    old.$next = old.$previous = void 0;
    return value;
  },

  // Nest value into another
  inject: function(value, old) {
    if (!old.$first)
      old.$first = value;
    for (var last = old; last.$last;)
      last = last.$last;
    last.$following = value;
    value.$leading = last;
    value.$parent = old
    old.$last = value;

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
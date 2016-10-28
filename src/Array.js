G.Array = function() {

}
G.Array.prototype = new G

// Remove node from tree
G.Array.prototype.recall = function() {
  G.Array.unlink(this)
  G.Array.unregister(this)
  return this
};

// Reapply node where it belongs in the tree
G.Array.extend = G.Array.call;
G.Array.prototype.call = function() {
  
  for (var to = this; to.$last;)
    to = to.$last;


  if (!this.$parent) {
    var first = this.$context ? this.$context[this.$key] : self;
    while (first.$previous)
      first = first.$previous;
  } else {
    var first = this.$parent.$first
  }

  // if element had parent before, attempt to hook it in place
    // for each node in the remembered parent
  for (var item = first; item; item = item.$next) {
    // check if it matches anything before op
    for (var before = this; before = before.$leading;) {
      if (before == this.$parent)
        break;
      if (before == item) {
        if (before.$next == this)
          return this;
        G.Array.link(to, before.$next || before.$following)
        var last = before;
        while (last.$last)
          last = last.$last;
        G.Array.link(last, this)
        if (before.$next) 
          G.Array.register(this, before.$next, this.$parent)
        G.Array.register(before, this, this.$parent)

        return this
      }
    } 
    // attempt to finx anchor after
    /*for (var after = this; after = after.$following;) {
      if (after == item) {
        if (after.$previous) {
          G.Array.register(after.$previous, this, this.$parent)
        }
        G.Array.register(this, after, this.$parent)
        
        return this
      }
      if (after == this.$parent.$last)
        break;
    }*/
  } 
  return this;
};


// Iterate children
G.prototype.children = function(callback, argument) {
  for (var last = this; last.$last;)
    last = last.$last
  
  for (var after = this; after.$following;) {
    if (after.$following.$leading !== after)
      break;
    after = after.$following
    if (!after.$parent || after.$parent === this)
      callback(after, argument);
    if (after == last)
      break;
  }
  return last;
}

G.prototype.forEach = function(callback) {
  if (!callback.$arguments)
    G.analyze(callback);

  for (var first = this; first.$previous;)
    first = first.$previous;

  var iterators = [callback]
  for(;first; first = first.$next)
    G.Array.iterate(first, iterators);
}

G.Array.iterate = function(array, iterators) {
  for (var i = 0; i < iterators.length; i++) {
    var callback = iterators[i];
    if (!array.$iterators) {
      array.$iterators = [callback]
    } else if (array.$iterators.indexOf(callback) > -1) {
      return
    } else {
      array.$iterators.push(callback);
    }

    G.record.push(array)
    G.callback.iterator(array, iterators[i])
    G.record.pop()

    if (callback.$properties) {
      console.info(callback.$properties)
      callback.$iteratee = array;
      for (var j = 0; j < callback.$properties.length; j++)
        G.watch(array, callback.$properties[j][0], callback)
      callback.$iteratee = null;
    }
  }
}

G.Array.uniterate = function(array, iterators) {
  if (!iterators)
    iterators = array.$iterators;
  for (var i = 0; i < iterators.length; i++) {
    var callback = iterators[i];
    
    if (callback.$properties) {
      console.info(callback.$properties)
      callback.$iteratee = array;
      for (var j = 0; j < callback.$properties.length; j++)
        G.unwatch(array, callback.$properties[j][0], callback)
      callback.$iteratee = null;
    }
  }
  for (var i = iterators.length; --i > -1;) {
    var j = array.$iterators.indexOf(iterators[i]);
    if (j > -1)
      array.$iterators.splice(j, 1)
  }

}
/*
G.Array.rebase = function(old, value) {
  if ((value.$next = old.$next))
    result.$next.$previous = result;
  if ((value.$previous = old.$previous))
    result.$previous.$next = result;
}*/

// Connect two siblings with DOM pointers
G.Array.register = function(left, right, parent) {
  left.$next = right;
  right.$previous = left;
  if (left.$iterators)
    G.Array.iterate(right, left.$iterators)
  else if (right.$iterators) {
    G.Array.iterate(left, right.$iterators)
  }
  
  if (!left.$multiple)
    left.$multiple = true;
  else if (!right.$multiple)
    right.$multiple = true;

  if (parent) {
    if (parent.$last == left)
      parent.$last = right;
    if (parent.$first == right)
      parent.$first = left;
    left.$parent = parent
    right.$parent = parent
  }
}

// Remove element from DOM tree
G.Array.unregister = function(op) {
  if (op.$previous) {
    if (op.$previous.$next == op)
      op.$previous.$next = op.$next
  }

  if (op.$iterators)
    G.Array.uniterate(op)
  if (op.$next) {
    if (op.$next.$previous == op)
      op.$next.$previous = op.$previous
  }
  if (op.$parent) {
    if (op.$parent.$last == op)
      op.$parent.$last = op.$previous
    if (op.$parent.$first == op)
      op.$parent.$first = op.$next
  }
    op.$previous = undefined
    op.$next = undefined;
}
// Connect depth first pointers of two sibling nodes together
G.Array.link = function(left, right) {
  if ((left.$following = right))                          // fix $following/$leading refs
    left.$following.$leading = left;
};

// Remove span of nodes from the graph
// Without second argument it removes op's children
G.Array.unlink = function(op, to) {
  if (to == null)                                     // find last deepest child
    for (var to = op; to.$last;)
      to = to.$last; 

  if (to && to.$following && to == to.$following.$leading)     // fix $following/$leading refs
    to.$following.$leading = op.$leading          // in place of detachment
  if (op.$leading)
    if (op == op.$leading.$following)
      op.$leading.$following = to && to.$following;
  return to;
}

G.Array.multiple = true
G.Array.verbs = {

  // Add value on top of the stack 
  push: function(value, old) {
    G.Array.link(old, value)
    G.Array.register(old, value, old.$parent)
    return value;
  },

  // Add unique value
  add: function(value, old) {
    for (var other = old; other; other = other.$previous) {
      if (other.valueOf() == value.valueOf()) {
        G.verbs.preset(value, old);
        return old;
      }
    }
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
    return old;
  },

  // Nest value into another
  append: function(value, old) {
    if (old.$last) {
      for (var last = old; last.$last;)
        last = last.$last;
      G.Array.link(last, value)
      G.Array.register(old.$last, value, old);
    } else {
      G.Array.link(old, value)
      old.$last = old.$first = value;
      value.$parent = old
    }
    return old;
  },

  // Add element on top
  prepend: function(value, old) {
    if (old.$first) {
      G.Array.link(value, old.$first)
      G.Array.register(value, old.$first, old);
    } else {
      G.Array.link(old, value)
      old.$last = old.$first = value;
      value.$parent = old
    }
    return old;
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
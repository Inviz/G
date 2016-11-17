G.Array = function() {

}
G.Array.prototype = new G

// Remove node from tree
G.Array.prototype.uncall = function() {
  G.Array.unlink(this)
  G.Array.unregister(this)
  if (this.$node && this.$node.parentNode)
    this.$node.parentNode.removeChild(this.$node)
  return this
};

// Reapply node where it belongs in the tree
G.Array.extend = G.Array.call;
G.Array.prototype.call = function(verb) {
  if (!this.$parent) {
    var last = this.$context[this.$key];
    var first = this.$context ? last : self;
    if (first)
      while (first.$previous)
        first = first.$previous;
  } else {
    var first = this.$parent.$first
    var last = this.$parent.$last
    
    if (!first) {
      var before = this.$parent;
      G.Array.link(this, before.$next || before.$following)
      G.Array.link(before, this)
      G.Array.register(null, this, this.$parent)
      return this; 
    }
  }


  for (var el = first; el; el = el.$next)
    if (el === this)
      return this;

  // for each node in the remembered parent
  // check if it matches anything before op
  for (var before = this; before = before.$leading;) {
    for (var item = first; item; item = item.$next) {
      if (before == this.$parent)
        break;
      if (before == item) {
        if (before.$next == this)
          return this;
        G.Array.link(this, before.$next || before.$following)
        G.Array.link(before, this)
        if (before.$next) 
          G.Array.register(this, before.$next, this.$parent)
        G.Array.register(before, this, this.$parent)

        return this
      }
    } 
  }
  for (var after = this; after = after.$following;) {
    for (var item = last; item; item = item.$previous) {
      if (after == this.$parent)
        break;
      if (after == item) {
        //if (before.$next == this)
        //  return this;
        G.Array.link(this, after)
        if (after.$previous) {
          G.Array.link(after.$previous, this)
          G.Array.register(after.$previous, this, this.$parent)
        }
        G.Array.register(this, after, this.$parent)

        return last
      }
    } 
  } 
  return false;
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
    G.callback.future(array, iterators[i])
    G.record.pop()
  }
}

G.Array.uniterate = function(array, iterators) {
  if (!iterators)
    iterators = array.$iterators;
  for (var i = 0; i < iterators.length; i++) {
    G._unobserveProperties(array, iterators[i]);
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
  if (left == right) throw new Error('left == right')
  if (!left) {
    if (parent) {
      parent.$last = parent.$first = right;
      right.$parent = parent
    }
    if (right.onregister)
      right.onregister(parent)
    return;
  }
  left.$next = right;
  right.$previous = left;
  
  if (!left.$multiple)
    left.$multiple = true;
  if (!right.$multiple)
    right.$multiple = true;

  if (parent) {
    if (parent.$last == left)
      parent.$last = right;
    if (parent.$first == right)
      parent.$first = left;
    left.$parent = parent
    right.$parent = parent
  }

  if (left.onregister)
    left.onregister(parent);
  if (right.onregister)
    right.onregister(parent);
}

// Remove element from DOM tree
G.Array.unregister = function(op) {
  if (op.onunregister)
    op.onunregister(op.$parent);
  
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
G.Array.replace = function(value, old) {
  var p = old.$previous;
  var n = old.$next;
  G.uncall(old, false, true);
  if (p){
    G.Array.link(p, value);
    G.Array.register(p, value, old.$parent)
  }
  if (n){
    G.Array.link(value, n);
    G.Array.register(value, n, old.$parent)
  }
  var called = G.$called;
  //G.$called = old;
  //G.affect(value, old)
  //G.$called = called;
  return true;
}

// Connect depth first pointers of two sibling nodes together
G.Array.link = function(left, right) {
  for (var last = left; last.$last;)
    last = last.$last;
  if ((last.$following = right)) {                          // fix $following/$leading refs
    right.$leading = last;
  }
};

G.Array.slice = function(value) {
  var array = []
  while (value && value.$previous)
    value = value.$previous;
  for (; value; value = value.$next)
    array.push(value);
  return array;
}

// Get previous item for node that may already be detached
G.Array.getPrevious = function(node) {
  for (var e = node; e = e.$leading;)
    if (e.$parent == node.$parent)
      return e;
}

// Get next item for node that may already be detached
G.Array.getNext = function(node) {
  for (var e = node; e = e.$leading;)
    if (e.$parent == node.$parent)
      return e;
}

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

// Find a good place to insert new value
G.Array.findIterated = function(old) {
  if (!G.$cause) return;

  // Push where it pushed last time
  if (G.$cause == old.$cause && G.$caller.$multiple) {
    var prev = G.$caller.$previous
    for (; prev; prev = prev.$previous)
      for (var after = prev; after = after.$after;)
        if (after.$context == old.$context)
          if (after.$key == old.$key)
            if (after.$cause == G.$cause && after.$caller == prev)
              return after;

    var next = G.$caller.$next
    for (; next; next = next.$next)
      for (var after = next; after = after.$after;)
        if (after.$context == old.$context)
          if (after.$key == old.$key)
            if (after.$cause == G.$cause && after.$caller == next)
              return after.$previous || false;
  // Future binds to specific place in array
  } else if (G.$cause.$leading !== undefined) {
    for (var prev = old; prev; prev = prev.$previous) {
      if (prev == G.$cause.$leading) {                              // find hook element remembered by future
        for (var next = prev; next = next.$next;) 
          if (next.$cause && next.$cause.$cause == G.$cause.$cause
          && G.Array.isAfter(next.$caller, G.$caller)) // next element is added by same future
            prev = next;
          else
            break
        return prev;
      }
    }
  }
}
G.Array.isAfter = function(value, another) {
  for (var prev = another; prev = prev.$leading;)
    if (prev == value)
      return true;
}

G.Array.contains = function(array, value) {
  for (; array; array = array.$previous)
    if (array === value)
      return true;
}
G.Array.first = function(array) {
  while (array.$previous)
    array = array.$previous;
  return array;
}

G.Array.last = function(array) {
  while (array.$next)
    array = array.$next;
  return array;
}

G.Array.multiple = true
G.Array.verbs = {

  // place element after another
  after: function(value, old) {
    if (old.$next)
      G.Array.register(value, old.$next, old.$parent)
    G.Array.link(value, old.$next)
    G.Array.link(old, value)
    G.Array.register(old, value, old.$parent)
    while (old.$next)
      old = old.$next;
    return old;
  },

  // place element before another
  before: function(value, old) {
    if (old.$previous) {
      G.Array.link(old.$previous, value)
      G.Array.register(old.$previous, value, old.$parent)
    }
    G.Array.link(value, old)
    G.Array.register(value, old, old.$parent)
    while (old.$next)
      old = old.$next;
    return old;
  },

  // Add value on top of the stack 
  push: function(value, old) {
    // if push() was inside iterator
    var after = G.Array.findIterated(old);
    if (after === false) { 
      return G.Array.verbs.before(value, G.Array.first(old)); // place as tail
    } else {
      return G.Array.verbs.after(value, after || old);   // place as head
    }
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
    return G.Array.verbs.push(value, old);
  },

  // Add value to the bottom of the stack 
  unshift: function(value, old) {
    var before = G.Array.findIterated(old) || G.Array.first(old);
    return G.verbs.before(value, before);
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
    G.Array.link(old, value)
    G.Array.register(old.$last, value, old);
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

G.Array.verbs.before.binary = G.Array.verbs.after.binary = true;

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
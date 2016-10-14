G.Methods.List = {
  'function': function(method) {
    return function(context, key, value, meta, scope) {
      return G.call(List, context, key, value, meta, scope, method);
    };
  },

  // Add value on top of the stack 
  push: function(value, old) {
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

  // Remove element from its list 
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

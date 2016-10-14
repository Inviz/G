G.Methods.Property = {

  // Public API wrapper: 
  //   G.set(anyObject, 'key', 'value') 
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

  // Prototype method: 
  //   var g = new G; 
  //   g.set('key', 'value') 
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

  // Bypass stack of values and write over 
  assign: function(value, old) {
    return value;
  },

  // Reassignment - Sets operation as head of the stack 
  set: function(value, old) {
    value.$preceeding = old;
    old.$succeeding = value;
    return value;
  },

  // Preassignment - Puts value at stack bottom, will not fire callbacks 
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
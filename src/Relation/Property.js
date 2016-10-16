G.Methods.Property = {


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
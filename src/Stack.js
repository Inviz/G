G.Modules.Stack = {

  // Replace one operation in the stack with another 
  rebase: function(old, value) {
    if (value) {
      if (value.$succeeding = old.$succeeding)
        value.$succeeding.$preceeding = value;
      if (value.$preceeding = old.$preceeding)
        value.$preceeding.$succeeding = value;
    } else {
      if (old.$succeeding != null)
        old.$succeeding.$preceeding = old.$preceeding;
      if (old.$preceeding != null)
        old.$preceeding.$succeeding = old.$succeeding;
      old.$succeeding = old.$preceeding = undefined;
    }
    return value;
  },

  // Attempt to perform soft update, one that only changes references 
  update: function(value, old, other) {
    if (other.valueOf() === value.valueOf()) {        // 1. Op is already in stack, so it's redo
      return value;                                   //    Not changing history
    } else if (other === old) {                       // 2. New value matches meta of old value 
      G.rebase(old, value);                           //    Switch in place
      return value;                                   //    Return new value
    } else if (other) {                               // 3. Value matches
      G.rebase(other, value);
      return old;
    }
  },

  // Find operation in the stack that matches meta of a given operation 
  match: function(meta, old) {
    for (var other = old; other; other = other.$preceeding)
      if (G.compare(other.$meta, meta))
        return other;
  },

  // Compare two arrays of arguments 
  compare: function(meta1, meta2) {
    if (meta1 === meta2)
      return true;
    if ((!meta1 && meta2) || (meta1 && !meta2) || meta1.length !== meta2.length)
      return false;
    for (var i = 0; i < meta1.length; i++)
      if (meta1[i] !== meta2[i])
        return false;
    return true;
  },
  find: function(context, key) {
    return context[key];
  }
};


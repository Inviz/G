G.Modules.Stack = {

  // Replace one operation in the stack with another 
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

  // Attempt to perform soft update, one that only changes references 
  update: function(value, old, other) {
    if (other === value) {

      // Op is in stack, so it's redo: not changing history 
      return value;
    } else if (other === old) {

      // New value matches meta of old value: replace in place 
      G.rebase(old, value);
      return value;
    } else if (other) {

      // Replace unused value with matching meta in the stack 
      G.rebase(other, value);
      return old;
    }
  },

  // Find operation in the stack that matches meta of a given operation 
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

  // Compare two arrays of arguments 
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


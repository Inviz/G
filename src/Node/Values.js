// An observable storage for field values
// Values with keys like `people[1][name]` are both accessible
// as absolute and parsed path like `people.$first.name`

// When new entries are added into those parsed arrays of objects
// representing fieldsets, it will clone & sync fieldset DOM automatically 

// Disabled inputs, or unchecked checkboxes and radiobuttons
// do not provide value, just like if you submitted the form
G.Node.Values = function() {
  G.apply(this, arguments);
}
G.Node.Values.prototype = new G;
G.Node.Values.prototype.constructor = G.Node.Values;
G.Node.Values.prototype.adoptNode = G.Node.Microdata.prototype.adoptNode;
G.Node.Values.prototype.cleanNode = G.Node.Microdata.prototype.cleanNode;
G.Node.Values.prototype.callNode  = G.Node.Microdata.prototype.callNode;
G.Node.Values.prototype.ownNode   = G.Node.Microdata.prototype.ownNode;
G.Node.Values.recursive = true;

// parse input names like person[friends][n][name]
// and store values like person.friends[n].name 
G.Node.Values.prototype.onChange = function(key, value, old) {
  var last = 0;
  var context = this;
  var length = key.length;
  var current = this[key]
  if (value && !value.$)
    if (!this.adoptNode(value, old))
      this.cloneNode(value, current);

  if (old && old.$)
    this.cleanNode(key, value, old, current);

  for (var i = -1; (i = key.indexOf('[', last)) > -1;) {
    var end = i - !!last;
    var bit = key.substring(last, end);
    if (bit.length) {
      // check if its array accessor following (e.g. [1])
      inner: for (var letter = end; ++letter != length;) {
        switch (key.charCodeAt(letter)) {
          case 48: case 49: case 50: case 51: case 52: case 53:
          case 54: case 55: case 56: case 57: case 91:
            break;
          default:
            break inner;
        }
      }
      // [] or [1] at the end of key
      if (letter == length - 1) {
        length = i;
        var array = true;
        break;

      // [] or [1] in the middle of key
      } else if (key.charCodeAt(letter) == 93) { // ]
        var subkey = key.substring(0, letter + 1);
        i = letter + 1;
        for (var current = context[bit]; current; current = current.$previous) {
          if (current.$index == subkey) {
            var match = current;
            break;
          }
        }
        if (!match) {
          G.record.push(this);
          match = context.push(bit, {}, value.$meta)
          match.$index = subkey;
          G.record.pop()
        }
        context = match;
      } else {

        if (context[bit] == null) {
          G.record.push(this);
          context.set(bit, {}, this)
          G.record.pop()
        }
        context = context[bit]
      }

      if (value == null) {
        if (!contexts)
          var contexts = []
        contexts.push(context);
      }

    }
    last = i + 1;
  }
  var cause = G.$cause;
  G.$cause = null;
  if (last || array) {
    var bit = key.substring(last, length - (!!last));
    if (!array || context[bit] == null || value == null) {
      if (value)
        context.pushOnce(bit, value, (value || old).$meta);
      else 
        context.unset(bit, old.valueOf(), old.$meta)

      if (value == null && contexts) {

        // if value is removed, clean up objects on its path
        // which dont have any other sub-keys

        for (var j = contexts.length; j--;)
          if (G.getLength(context) == 0) {
            context.uncall()
          }
      }
    } else if (!G.record.match(context, bit)) {
      context.pushOnce(bit, value, value.$meta)
    }
  } else {
    var current = G.value.current(value || old);
    var target = value || old;

    this.callNode(value)
    this.updateNode(value, target)
  }
  G.$cause = cause;
}

G.Node.Values.prototype.cloneNode = function(value, old) {
  for (var prev = value; prev = prev.$previous;) {
    if (!prev.$) continue;
    value.$ = prev.$.cloneNode(true);
    value.$.set('value', value, value.$);
    return this.ownNode(value, prev.$, 'after')
  }
  for (var next = value; next = next.$next;) {
    if (!next.$) continue;
    value.$ = next.$.cloneNode(true);
    value.$.set('value', value, value.$);
    return this.ownNode(value, next.$, 'before')
  }
  var context = this.$context;
  while (!(context instanceof G.Node))
    context = context.$context;
  var last = context.$next;
  var name = this.getName(value)
  for (var el = context; (el = el.$following) != last;) {
    if (el.name && this.compareName(el.name, name)) {
      value.$ = el.cloneNode(true);
      value.$.set('value', value, value.$);
      
      this.ownNode(value)
      var pos = 0;

      if (!el.$scope) continue;

    
      if (G.Array.isAfter(value.$context, el.$scope)) {
        // find position of input within its scope
        for (var after = el; (after = after.$following) != last;) 
          if (after.$scope == el.$scope)
            pos++;

        // find first input in the scope
        for (var before = el; (before = before.$leading) != context;) 
          if (el.$scope && before.$scope == el.$scope)
            el = before;

        // attempt to place cloned span in a similar position
        if (pos) {
          for (var before = el; (before = before.$leading) != context;) 
            if (before.$scope == value.$context) {
              el = before;
              if (--pos == 0)
                break;
            }
        }
        return this.ownNode(value, el, 'before')
      } else {
        // find position of input within its scope
        for (var before = el; (before = before.$leading) != context;) 
          if (before.$scope == el.$scope)
            pos++;

        // find last input in the scope
        for (var after = el; (after = after.$following) != last;) 
          if (el.$scope && after.$scope == el.$scope)
            el = after;

        // attempt to place cloned span in a similar position
        if (pos) {
          for (var after = el; (after = after.$following) != last;) 
            if (after.$scope == value.$context) {
              el = after;
              if (--pos == 0)
                break;
            }
        }
        return this.ownNode(value, el, 'after')
      }
    }
  }
}

// todo char by char comparison
G.Node.Values.prototype.compareName = function(name, another) {
  return name.replace(/\[\d*\]/, '') == another.replace(/\[\d*\]/, '')
}


G.Node.Values.prototype.updateNode = function(value, target) {
    if (value && value.$ && (!value.$meta || value.$meta.length != 1 || value.$meta[0] != target.$)) {
      target.$.name.$subscription.$computing = true;
      value.$.set('value', value, value.$meta || [value.$, 'values']);
      target.$.name.$subscription.$computing = null
    }
}
G.Node.Values.prototype.getName = function(value) {
  var key = ''
  while (value) {
    for (var before = value, i = 0; before = before.$previous; )
      i++;
    if (i)
      key = '[' + i + ']' + key

    key = '[' + value.$key + ']' + key

    if (value.$context.$context instanceof G.Node)
      break;
    value = value.$context
    if (value.$context.$context instanceof G.Node)
      break;
  }
  return value.$key + key
}


G.Node.Values.prototype.ownNode = function(value, other, method) {
  if (value.$ && !(value.$context.$context instanceof G.Node))
    value.$.$scope = value.$context;

  if (other) {
    value.$.name.$subscription.$computing = true;
    G[method](value.$, other)
    value.$.name.$subscription.$computing = false;
  }

  return value.$
}

/*
G.Node.Values.prototype.cleanNode = function(key, value, old, current) {
  
  if (old.$.name == key && 
    (!current || current.$ != old.$) &&
    (!value || value.$ != old.$)) {
    if (!G.Node.$ejecting && old.$.$origin === old) {
      old.$.uncall()
      old.$.$origin = value;
    }
  } else if (old.$.$origin == old) {
    old.$.$origin = value
  }
}*/

G.Node.prototype.constructors.values = G.Node.Values;
G.Node.inheritable.push('values')                     // register inheritable property
G.Node.inherited.values = 'name';                     // name of an attribute that triggers inheritance
G.Node.$inherited.values = '$values';                 // name of key that references parent microdata scope
G.Node.inheriting.name = 'values';                    // name of a inherited property triggered by key



// Properties that affect form submission value
G.Node.valueattributes = {
  checked:  function(){},
  value:    function(){},
  disabled: function(){},
  type:     function(){}
}

// Register node's value in the form.
// Triggered when `name`, `value` or `values` keys are changed
G.Node.triggers.name = function(name) {

  if (this.$values && !G.record.match(this.$values, name)) {
    var value = this.getValue();

    // Remember previous element in a radiogroup
    if (this['type'] == 'radio' && this.$values[name] && value) {
      var old = this.$values[name].$meta[0];
    }
    if (this['values'] && value != null) {

      if (name.match(/\[\d*\]$/)) {
        this.$values.pushOnce(name, value, this);
      } else {
        this.$values.set(name, value, this)
      }

      // Uncheck previous radio input
      if (old && old != this && old.checked && old.checked != false)
        old.checked.uncall()
    }
  }
  return
}

G.Node.prototype.getValue = function() {
  if (this.disabled)                                  // Disabled inputs are not submitted
    return;

  if (this.type == 'submit' && !this.active)          // Submit button only provides value 
    return;                                           //   if it was used to submit the form

  if (this.type == 'checkbox' || this.type=='radio') {// Checkboxes and radiobuttons:
    if (this.checked == null || this.checked == false)//   - only submitted when checked
      return;    
    if (this.value == null)                           //   - have `on` as default value
      return 'on';
  }

  return this.value;                                  // Return current value attribute
}

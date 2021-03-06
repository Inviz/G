/*
  Scope is a base class for model that 
  seemlessly integrates with HTML microdata markup.    
*/
G.Scope = function() {
  G.apply(this, arguments);
}
G.Scope.extend = function(constructor) {
  constructor.prototype = new this;
  constructor.prototype.constructor = constructor;
  constructor.extend = G.Scope.extend;
  return constructor;
}
G.Scope.prototype = new G;
G.Scope.recursive = true;
G.Scope.prototype.constructor = G.Scope;
G.Scope.prototype.onChange = function(key, value, old) {
  var current = G.value.current(value || old);
  var target = value || old;
  if (value && !value.$)
    if (!this.adoptNode(value, old))
      this.cloneNode(value, current);

  if (old && old.$)
    this.cleanNode(key, value, old, current);

  this.callNode(value)
  this.updateNode(value, target)
}

G.Scope.prototype.adoptNode = function(value, old) {
  if (value.$meta && value.$meta[0] && value.$meta[0] instanceof G.Node) {
    value.$ = value.$meta[0]
    value.$.$origin = value;
  } else if (old && old.$) {
    value.$ = old.$;
    value.$.$origin = value;
  } else if (old && old.$meta && old.$meta[0] && old.$meta[0] instanceof G.Node) {
    value.$ = old.$meta[0];
    value.$.$origin = value;
  }
  return this.ownNode(value)
}

G.Scope.prototype.ownNode = function(value, other, method) {
  if (value.$ && !(value.$context.$context instanceof G.Node))
    value.$.$scope = value.$context;

  return value.$
}


G.Scope.prototype.cleanNode = function(key, value, old, current) {
  
  if (old.$.itemprop == key && 
    (!current || current.$ != old.$) &&
    (!value || value.$ != old.$)) {
    if (!G.Node.$ejecting && old.$.$origin === old) {
      old.$.uncall()
      old.$.$origin = value;
    }
  } else if (old.$.$origin == old) {
    old.$.$origin = value
  }
}

G.Scope.prototype.callNode = function(value) {
  if (value && value.$) {
    if (!G.Array.isLinked(value.$)) {
      G.record.push();
      value.$.call()
      G.record.pop()
    }
    return value;
  }
}

G.Scope.prototype.cloneNode = function(value, old) {
  for (var prev = value; prev = prev.$previous;) {
    if (!prev.$) continue;
    value.$ = prev.$.cloneNode(value);
    value.$.$origin = value;
    value.$.setScope(value, value.$);
    G.after(value.$, prev.$)
    return value.$
  }
  for (var next = value; next = next.$next;) {
    if (!next.$) continue;
    value.$ = next.$.cloneNode(value);
    value.$.$origin = value;
    value.$.setScope(value, value.$);
    G.before(value.$, next.$)
    return value.$
  }
}
G.Scope.prototype.updateNode = function(value, target) {

  var last = G.$callers[G.$callers.length - 1];
  // hack? :(
  if (!last || (last.$context != this.$context))
  if (value && value.$ && (!value.$meta || value.$meta.length != 1 || value.$meta[0] != target.$)) {
    target.$.setScope(value, value.$meta);
  }
}

G.Node.prototype.constructors.scope = G.Scope;
G.Node.inheritable.push('scope')                      // register inheritable property
G.Node.inherited.scope = 'itemprop';                  // name of an attribute that triggers inheritance
G.Node.$inherited.scope = '$scope';                   // name of key that references parent scope
G.Node.inheriting.itemprop = 'scope';                 // name of a inherited property triggered by key

// Properties that trigger recomputation of `scope` class
G.Node.itemclasses = {
  itemtype: function(){},
  itemprop: function(){},
  itemscope: function(){}
}

// Changing itemtype/itemprop may cause scope object to be recreated 
// with another class chosen by $constructor callback

G.Node.callbacks.itemscope = function() {             // This method is full of low-level magic 
  var current = this['scope'];                        // to avoid extra reconfiguration cost
  var constructor = this.$constructor('scope');
  if (this.itemscope) {
    if (!current                                      // 1. Adding new top-level scope
    || this.$scope === current                        // 2. Adding nested scope
    || current.constructor !== constructor) {         // 3. Recreating scope with (another) custom constructor 
      var scope = new constructor;
      this['scope'] = scope;
      scope.$context = this;
      scope.$key = 'scope';
      scope.$meta = [this]
      scope.$ = this;
      if (current) {                                  // apply new scope and propagate to children
        G.Node.updateTrigger(this, 'itemprop')
        G.Node.inherit.propagate(this, 'scope', scope);
      }
    }
  } else if (current) {                               // When scope is removed it hands off
    var scope = current.uncall();                 // its properties to parent scope
    this.$scope = null;
    if (this.itemprop) {                              // 4. Turn named scope into named node
      G.Node.inherit.property(this, 'scope');         // inherit parent scope
      this['scope'] = this.$scope;
    }
    G.Node.inherit.propagate(this, 'scope', undefined, scope);
  }
}

G.Node.callbacks.text = function(value) {
  for (var parent = this; parent = parent.$parent;) {
    if (!parent.itemprop) continue;
    if (!parent.itemscope)
      G.Node.updateTrigger(parent, 'itemprop');
    break;
  }
}

// Nest node's microdata value in parent scope object
// Triggered when `itemscope`, `itemprop` or `itemtype` keys are changed

G.Node.triggers.itemprop = function(itemprop, old) {
  if (this.$scope && !G.record.match(this.$scope, itemprop))
    this.$scope.pushOnce(itemprop, this.getScope(), this);
  return
}

// Allow itemtype & itemprops attributes define subclass for scope
G.Node.prototype.$constructor = function(key) {
  if (key == 'scope') {
    if (this.itemtypes && this.itemtypes[this.itemtype])
      return this.itemtypes[this.itemtype];

    if (this.itemprops && this.itemprops[this.itemprop])
      return this.itemprops[this.itemprop];

    return G.Scope;
  }
}

// Restore original ownership of scope object 
// when it is uncalled by parent context
G.Scope.prototype.$composable = function() {
  if (this.$ ) {
    if (this.$.itemscope && this.$.scope === this) {
      this.$.scope = undefined
      this.$context = this.$;
      this.$key = 'scope';
      this.$.scope = this;
      G.Node.updateTrigger(this.$, 'itemprop')
      G.Node.inherit.propagate(this.$, 'scope', this);
    }
  }
}

// Serialize complex object to query string
G.Scope.prototype.toString = function(prefix) {
  var keys = Object.keys(this);
  var result = '';
  if (!prefix)
    prefix = '';
  for (var j = 0; j < keys.length; j++) {
    if (keys[j].charAt(0) == '$')
      continue;
    var value = this[keys[j]];
    if (value == null)
      continue;
    
    while (value.$previous)
      value = value.$previous; 
    if (value.$next) {
      var i = 0;
      for (var i = 0; value; i++) {
        if (typeof value.valueOf() == 'object') {
          var string = value.toString(prefix + keys[j] + '[' + i + ']');
          if (string)
            result += (result ? '&' : '') + string
        } else {
          var subkey = prefix ? prefix + '[' + keys[j] + ']' : keys[j];
          result += (result ? '&' : '') + subkey + '[]=' + encodeURIComponent(value);
        }
        value = value.$next;
      }
    } else {
      if (typeof value.valueOf() == 'object') {
        var string = value.toString(prefix + keys[j] + '[' + i + ']');
        if (string)
          result += (result ? '&' : '') + string;
      } else {
        var subkey = prefix ? prefix + '[' + keys[j] + ']' : keys[j];
        result += (result ? '&' : '') + subkey + '=' + encodeURIComponent(value)
      }
    }
  }
  return result;
}
G.Node.prototype.getScope = function() {
  if (this.itemscope) {
    if (this.$scope) {
      return this.scope
    }
  } else if (this.href != null)    // be triggered by any possible
    return this.href;              // source of itemvalue without 
  else if (this.src != null)       // individual subscription
    return this.src;
  else if (this.content != null)
    return this.content;
  else
    return this.getTextContent()
}

G.Node.prototype.setScope = function(value, meta) {
  if (meta == null)
    meta = [this, 'scope'] // if metadata is false, it falls back 
  var cause = G.$cause;
  G.$cause = null;
  var tag = this.tag.valueOf();
  if (value && G.value.isObject(value)) {
    for (var next = this; next = next.$following;) {
      if (next == this.$next)
        break;
      if (next.itemprop) {
        next.setScope(value[next.itemprop] || '', false)
        if (next.$next)
          next = next.$next.$leading;
      }
    }
  } else if (tag == 'a' || this.href) {
    this.set('href', value, meta || this)
  } else if (this.src || tag == 'script' || tag == 'img') {
    this.set('src', value, meta || this)
  } else if (this.$first && !this.$first.tag) {
    this.$first.set('text', value, meta || this.$first)
  }

  G.$cause = cause;
}




G.Node.Microdata = function() {
  G.apply(this, arguments);
}
G.Node.Microdata.extend = function(constructor) {
  constructor.prototype = new this;
  constructor.prototype.constructor = constructor;
  constructor.extend = G.Node.Microdata.extend;
  return constructor;
}
G.Node.Microdata.prototype = new G;
G.Node.Microdata.recursive = true;
G.Node.Microdata.prototype.constructor = G.Node.Microdata;
G.Node.Microdata.prototype.onChange = function(key, value, old) {
  debugger
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


G.Node.Microdata.prototype.adoptNode = function(value, old) {
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

G.Node.Microdata.prototype.ownNode = function(value, other, method) {
  if (value.$ && !(value.$context.$context instanceof G.Node))
    value.$.$scope = value.$context;

  if (other) {
    value.$.name.$subscription.$computing = true;
    G[method](value.$, other)
    value.$.name.$subscription.$computing = false;
  }

  return value.$
}


G.Node.Microdata.prototype.cleanNode = function(key, value, old, current) {
  if (old.$.$origin == old) {
    old.$.$origin = null
  } else if (old.$.itemprop == key && 
    (!current || current.$ != old.$) &&
    (!value || value.$ != old.$)) {
    if (!G.Node.$ejecting && !old.$.$origin) {
      old.$.uncall()
    }
  }
}

G.Node.Microdata.prototype.callNode = function(value) {
  if (value && value.$) {
    if (!G.Array.isLinked(value.$)) {
      G.record.push();
      value.$.call()
      G.record.pop()
    }
    return value;
  }
}

G.Node.Microdata.prototype.cloneNode = function(value, old) {
  for (var prev = value; prev = prev.$previous;) {
    if (!prev.$) continue;
    value.$ = prev.$.cloneNode(value);
    value.$.setMicrodata(value, value.$);
    value.$.itemprop.$subscription.$computing = true;
    G.after(value.$, prev.$)
    value.$.itemprop.$subscription.$computing = false;
    return value.$
  }
  for (var next = value; next = next.$next;) {
    if (!next.$) continue;
    value.$ = next.$.cloneNode(value);
    value.$.setMicrodata(value, value.$);
    value.$.itemprop.$subscription.$computing = true;
    G.before(value.$, next.$)
    value.$.itemprop.$subscription.$computing = false;
    return value.$
  }
}
G.Node.Microdata.prototype.updateNode = function(value, target) {

  var last = G.$callers[G.$callers.length - 1];
  // hack? :(
  if (!last || (last.$context != this.$context))
  if (value && value.$ && (!value.$meta || value.$meta.length != 1 || value.$meta[0] != target.$)) {
    target.$.itemprop.$subscription.$computing = true;
    target.$.setMicrodata(value, value.$meta);
    target.$.itemprop.$subscription.$computing = null
  }
}

G.Node.prototype.constructors.microdata = G.Node.Microdata;
G.Node.inheritable.push('microdata')                  // register inheritable property
G.Node.inherited.microdata = 'itemprop';              // name of an attribute that triggers inheritance
G.Node.$inherited.microdata = '$microdata';           // name of key that references parent microdata scope
G.Node.inheriting.itemprop = 'microdata';             // name of a inherited property triggered by key

// Properties that trigger recomputation of `microdata` class
G.Node.itemclasses = {
  itemtype: function(){},
  itemprop: function(){}
}

// Changing itemtype/itemprop may cause microdata object to be recreated 
// with another class chosen by $constructor callback

G.Node.callbacks.itemscope = function(value) {
  var current = this['microdata'];
  var constructor = this.$constructor('microdata');
  if (!current || (constructor && current.constructor !== constructor)) {
    var microdata = this.set('microdata', {}, this);
    microdata.$composable = true;
  }
  return
}

G.Node.callbacks.text = function(value) {
  for (var parent = this; parent = parent.$parent;) {
    if (!parent.itemprop) continue;
    if (!parent.itemscope)
      G.Node.updateTrigger(parent, 'itemprop');
    break;
  }
}

// Nest node's microdata value in parent microdata object
// Triggered when `itemscope`, `itemprop` or `itemtype` keys are changed

G.Node.triggers.itemprop = function(itemprop) {       // itemprop future is optimized to
  var value = this.getMicrodata()

  if (this.microdata && this.$microdata) {
    var last = G.$callers[G.$callers.length - 1];
    // hack? :(
    if (!last || !(last.$context instanceof G.Node.Microdata) || last.$key != itemprop)
      this.$microdata.pushOnce(itemprop, value, this);
  }
  return 
}

// Allow itemtype & itemprops attributes define subclass for microdata
G.Node.prototype.$constructor = function(key) {
  if (key == 'microdata') {
    if (this.itemtypes && this.itemtypes[this.itemtype])
      return this.itemtypes[this.itemtype];

    if (this.itemprops && this.itemprops[this.itemprop])
      return this.itemprops[this.itemprop];

    return G.Node.Microdata;
  }
}


G.Node.prototype.getMicrodata = function() {
  if (this.itemscope) {
    if (this.$microdata) {
      return this.microdata
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

G.Node.prototype.setMicrodata = function(value, meta) {
  if (meta == null)
    meta = [this, 'microdata'] // if metadata is false, it falls back 
  var cause = G.$cause;
  G.$cause = null;
  var tag = this.tag.valueOf();
  if (value && G.value.isObject(value)) {
    for (var next = this; next = next.$following;) {
      if (next == this.$next)
        break;
      if (next.itemprop) {
        next.setMicrodata(value[next.itemprop] || '', false)
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



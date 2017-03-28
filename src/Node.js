// Virtual dom with JSX-friendly constructor
// Each node is an observable object of attributes
// and an array of childnodes.

// In addition to $next/$previous/$parent/$first/$last
// pointers, nodes also maintain $following/$succeeding
// depth-first list of nodes. When node is detached
// from document, it keeps the latter references together
// with $parent, so it can be be returned to its place later.

// That extra list is also used for document fragments
// and virtual elements. Invisible parts of DOM, like
// conditional rules, or fragments are still kept in
// virtual DOM, while real DOM is unaware of them them.
// This enables easy manipulation of DOM fragments.

// Changes to actual DOM are applied in batch when 
// `root.render()` method is called.

G.Node = function(tag, attributes) {
  if (G.Node.$recording)
    return Array.prototype.slice.call(arguments);

  var Node = this.Node && this.Node.construct ? this.Node : this.construct ? this : G.Node;
  if (!(this instanceof G.Node)) {
    switch (typeof tag) {
      case 'function':
        var self = new tag(attributes);
        break;
      case 'string':
        if (typeof Node[tag] === 'function')
          var self = new Node[tag](attributes)
        else
          var self = new Node(tag, attributes)
        break
      case 'object':
        if (tag && tag.nodeType) {
          if (tag.$operation) {
            var self = tag.$operation
          } else {
            var self = Node.fromElement(tag)
          }
        } else {
          var self = new Node;
        }
    }
  } else {
    
    var self = this;
    this.setArguments(tag, attributes);
  }

  for (var i = 2; i < arguments.length; i++)
    self.appendChild(arguments[i])

  return self
}
G.Node.construct = G.Node;


G.Node.fromElement = function(element, shallow, mapping) {
  if (mapping === undefined)
    mapping = this.mapping;
  switch (element.nodeType) {
    case 1:
      var tag = element.tagName && element.tagName.toLowerCase();
      var self = this.construct(mapping[tag] || tag);
      for (var i = 0; i < element.attributes.length; i++) {
        self.set(element.attributes[i].name, element.attributes[i].value, self)
      }
      break;
    case 3:
      var self = new this(null, element.textContent);
      break;
    case 8:
      break;
    case 11:
      var self = new this;
  }
  self.$node = element;

  element.$operation = self;
  for (var i = 0; i < element.childNodes.length; i++) {
    var child = element.childNodes[i];
    // If found a comment in children
    if (child.nodeType == 8) {
      var tag = child.nodeValue.trim().split(' ')[0];
      for (var j = i; j < element.childNodes.length; j++) {
        if (element.childNodes[j].nodeType == 8) {
          // If found closing comment
          if (element.childNodes[j].nodeValue.trim().substring(0, tag.length + 1) == '/' + tag) {
            var rule = this(tag)
            self.appendChild(rule)
            while (++i < j)
              rule.appendChild(this.fromElement(element.childNodes[i], mapping))
          }
        }
      }
    } else {
      var node = this.fromElement(child, mapping);
      self.appendChild(node)
    }
  }
  return self;
}
G.Node.prototype = new G.Array;
G.Node.prototype.constructor = G.Node;
G.Node.prototype.$multiple = true;
G.Node.prototype.$referenced = true;

G.Node.unbox            = G.Node.call;
G.Node.prototype.call   = G.Array.prototype.call;
G.Node.prototype.inject   = function() {
  if (this.$parent) {
    G.Node.unschedule(this, this.$parent, '$detached', '$detaching')
    G.Node.schedule(this, this.$parent, '$attached', '$attaching')
  }
  var called = G.Array.prototype.inject.apply(this, arguments);
  var transaction = G.Node.$transaction
  if (transaction) {
    (transaction.$nodes || (transaction.$nodes = [])).push(this)
  } else {
    if (this.$node)
      G.Node.place(this)
    else
      G.Array.children(this, G.Node.place)
  }
  if (this.text != null)
    G.Node.updateTextContent(this);
  
  return called
}
G.Node.prototype.eject = function() {
  G.Node.$ejecting = true;
  this.detach()
  var uncalled =  G.Array.eject(this)

  if (this.text != null)
    G.Node.updateTextContent(this);
  
  G.Node.$ejecting = false;
  return uncalled;

};

// Process JSX-style arguments (tag, attributes, ...children)
G.Node.prototype.setArguments = function(tag, attributes) {
  G.record.push(null)
  if (tag) {
    this.set('tag', tag);
    var definition = G.Node.tags[tag];
  }
  if (definition) {
    
    if (!definition.$arguments)
      G.analyze(definition);
    if (definition.$arguments.length) {
      if (!this.$role) {
        this.$role = new G.Future(this, null)
        this.$role.$future = true;
        this.$role.$getter = definition
        G.Future.watch(this, null, this.$role)
      }
      //G.Future.invoke(this.$role)
    } else {
      definition.call(this);
    }
  }

  if (attributes) {
    if (typeof attributes.valueOf() == 'object')
      this.merge(attributes, this);
    else
      this.set('text', attributes, this); //lazy text content
  }


  for (var i = 2; i < arguments.length; i++)
    this.appendChild(arguments[i])
  
  G.record.pop()
}


// Concatenate text in all child nodes
G.Node.prototype.getTextContent = function() {
  var result = '';
  if (this.$first)
    for (var lead = this; lead = lead.$following;) {
      if (lead && !lead.tag && lead.text) {
        result = result + lead.text;
      }
      if (lead == this.$last)
        break;
    }
  return result;
}

// Update itemvalue
G.Node.updateTrigger = function(node, prop) {
  var watchers = node.$watchers[prop];
  if (!watchers) return;
  for (var i = 0; i < watchers.length; i++)
    if (watchers[i].$getter === G.Node.triggers[prop]) {
      G.callback.future(node[prop], watchers[i])
      break;
    }
}

// Notify parent nodes of text content update
G.Node.updateTextContent = function(node) {
  for (var parent = node; parent = parent.$parent;) {
    if (parent.itemprop)
      G.Node.updateTrigger(parent, 'itemprop');
  }
}

// Schedule DOM updates when node attributes are changed 
G.Node.prototype.onChange = function(key, value, old) {
  var trigger = G.Node.triggers[key];
  var current = this[key]
  if (trigger) {
    var prop = G.Node.inheriting[key];
    if (value && old == null) {
      current.$subscription = this.watch(key, trigger)
      if (prop)
        G.Node.inherit.property(this, prop);

    } else if (old && value == null) {
      this.unwatch(key, trigger)
      old.$subscription = undefined;
      if (prop)
        G.Node.deinherit.property(this, prop);
    }
  }
  var callback = G.Node.callbacks[key];
  if (callback)
    callback.call(this, value, old)

  if (this.itemprop && G.Node.itemvalues[key] && this.microdata) {
    G.Node.updateTrigger(this, 'itemprop');
  } else if (this.name && G.Node.valueattributes[key]) {
    G.Node.updateTrigger(this, 'name');
  } else if (this.itemscope && G.Node.itemclasses[key]) {
    G.Node.callbacks.itemscope.call(this, value)
  }
  if (!this.$node || !(value || old).$context || key == 'tag' || G.Node.inherited[key])
    return;


  var transaction = G.Node.$transaction
  if (transaction && arguments.length > 2) {
    if (value) {
      G.Node.schedule(value, this, '$mutated', '$mutating')
      if (old)
        G.Node.unschedule(old, this, '$mutated', '$mutating')
    } else {
      G.Node.schedule(old, this, '$mutated', '$mutating')
    }
    return
  } else {
    this.updateAttribute(value || old)
    if (transaction && transaction.$mutations) {
      var index = transaction.$mutations.indexOf(op)
    }
  }
}

// Inject node into another
// If child is a string, creates text node
G.Node.prototype.appendChild = function(child, verb, old) {
  if (!child) return;
  if (typeof child.valueOf() == 'string') {
    var text = child;
    child = new (this.constructor)(null, text)
  }
  if (G.Node.$migration)
    return;
  return G.verbs[verb || 'append'](child, old || this);
}
G.Node.prototype.removeChild = function(child) {
  return child.uncall()
}
G.Node.prototype.prependChild = function(child) {
  return this.appendChild(child, 'prepend')
}
G.Node.prototype.insertBefore = function(child, anchor) {
  if (anchor)
    return this.appendChild(child, 'before', anchor)
  else
    return this.appendChild(child, 'append')
}

G.Node.inherit = function(node) {
  for (var x = 0; x < G.Node.inheritable.length; x++)
    G.Node.inherit.property(node, G.Node.inheritable[x]);
}

G.Node.inherit.property = function(node, property) {
  if (node[G.Node.inherited[property]] == null)
    return;
  var $prop = G.Node.$inherited[property];
  for (var parent = node; parent = parent.$parent;) {
    if (parent[property]) {
      if (node[$prop] != parent[property]) {
        if (!node[property]) {
          node[property] = parent[property];
        }
        node[$prop] = parent[property]
        G.Node.updateTrigger(node, G.Node.inherited[property])
      }
      break;
    }
  }
}


G.Node.deinherit = function(node) {
  for (var x = 0; x < G.Node.inheritable.length; x++)
    G.Node.deinherit.property(node, G.Node.inheritable[x])
}

G.Node.deinherit.property = function(node, property) {
  var $prop = G.Node.$inherited[property];
  var key = G.Node.inherited[property];
  for (var parent = node; parent = parent.$parent;) {
    if (parent[property]) {
      if (node[$prop] === parent[property]) {
        if (node[property] == node[$prop]) {
          node[property] = undefined;
        } else if (node[key] && node[property].$context != node) {
          
          var object = node[property].uncall() // detach named sub-microdata 
          // node.set(key, object)
        }
        node[$prop] = undefined
        var watchers = node.$watchers && node.$watchers[property];
        if (watchers)
          for (var i = 0; i < watchers.length; i++)
            if (watchers[i].$future)
              G.callback.future(parent[property], watchers[i]);
      }
      break;
    }
  }
}

G.Node.inherited = {
  values: 'name',
  microdata: 'itemprop'
}
G.Node.$inherited = {
  values: '$values',
  microdata: '$microdata'
}
G.Node.inheriting = {
  name: 'values',
  itemprop: 'microdata'
}

// Properties that trigger recomputation of `itemvalue` property 
G.Node.itemvalues = {
  content: function() {},
  href: function() {},
  src: function() {}
}

// Properties that trigger recomputation of `microdata` class
G.Node.itemclasses = {
  itemtype: function(){},
  itemprop: function(){}
}

// Properties that affect form submission value
G.Node.valueattributes = {
  checked:  function(){},
  value:    function(){},
  disabled: function(){},
  type:     function(){}
}

G.Node.inheritable = Object.keys(G.Node.inherited);

// Allow itemtype & itemprops attributes define subclass for microdata
G.Node.prototype.$constructor = function(key) {
  if (key == 'microdata') {
    if (this.itemtypes && this.itemtypes[this.itemtype])
      return this.itemtypes[this.itemtype];

    if (this.itemprops && this.itemprops[this.itemprop])
      return this.itemprops[this.itemprop];
  }
}

// Triggers are callbacks that observe undeclared variables
// Triggers should have return statement 
// if they are expected to observe used properties
G.Node.triggers = {

  // Register node's value in the form.
  // Triggered when `name`, `value` or `values` keys are changed
  name: function(name) {
    var value = this.getValue();
    if (value == null)
      return;

    var last = G.$callers[G.$callers.length - 1];
    // hack to prevent 2-way binding cycle with parsed representation
    if (!last || !(last.$context instanceof G.Node.Values)) {

      // Remember previous element in a radiogroup
      if (this['type'] == 'radio' && this.values[name] && value) {
        var old = this.values[name].$meta[0];
      }
      if (name.match(/\[\d*\]$/)) {
        this.values.pushOnce(name, value, this);
      } else {
        this.values.set(name, value, this)
      }

      // Uncheck previous radio input
      if (old && old != this && old.checked && old.checked != false)
        old.checked.uncall()
    }
    return
  },

  // Nest node's microdata value in parent microdata object
  // Triggered when `itemscope`, `itemprop` or `itemtype` keys are changed
  itemprop: function(itemprop) { // itemprop future is optimized to
    var value = this.getMicrodata()

    if (this.microdata && this.$microdata) {
      var last = G.$callers[G.$callers.length - 1];
      // hack? :(
      if (!last || !(last.$context instanceof G.Node.Microdata) || last.$key != itemprop)
        this.$microdata.pushOnce(itemprop, value, this);
    }
    return 
  }

}

G.Node.callbacks = {

  text: function(value) {
    for (var parent = this; parent = parent.$parent;) {
      if (!parent.itemprop) continue;
      if (!parent.itemscope)
        G.Node.updateTrigger(parent, 'itemprop');
      break;
    }
  },
    
  // Changing itemtype/itemprop may cause microdata object to be recreated 
  // with another class chosen by $constructor callback
  itemscope: function(value) {
    var current = this['microdata'];
    var constructor = this.$constructor('microdata');
    if (!current || (constructor && !(current instanceof constructor))) {
      var microdata = this.set('microdata', {}, this);
      microdata.$composable = true;
    }
    return
  }

}

G.Node.attributes = {
  text: function(value) {
    if (this.$node)
      this.$node.textContent = value
  },

  tag: function() {
    return null;
  }
}

G.Node.tags = {
  form: function() {
    this.set('values', {});
  },
  fieldset: function() {
    //this.scope('values', this.inherited.values)
  },
  dialog: function() {

  }//,
  //input: function() {
  //  this.values.set(this.name, this.value, this);
  //}
}

G.Node.types = {
  radio: function() {
    this.preset('radiogroup', this.name);
    this.unshift('action', 'check');
  },
  checkbox: function() {
    this.preset('action', 'check');
  }
}

// Node and its descendants create references
// to parent tree's microdata/form dictionaries
G.Node.prototype.onregister = function() {
  for (var child = this; child != this.$next; child = child.$following) {
    G.Node.inherit(child);
    if (child.itemprop && child.$microdata) {
      if (topmost == null)
        if (!(topmost = this.$microdata))
          for (var top = this.$parent; top; top = top.$parent) {
            if (top.$microdata) {
              var topmost = top.$microdata;
              break;
            }
          }
      if (topmost && child.$microdata == topmost) {
        var val = child.$microdata.get(child.itemprop, child);
        if (val) val.call()
      }
    }
    if (child.name && child.$values) {
      var val = child.$values.get(child.name, child);
      if (val) 
        val.call()
    }
  }
}

// Unregister node and its descendants 
// from parent tree's microdata/form dictionaries
G.Node.prototype.onunregister = function() {
  for (var child = this; child != this.$next; child = child.$following) {
    G.Node.deinherit(child);
  }
}
G.Node.prototype.decorate = function(value) {
  // format token list
  var result = value
  if (result)
    while (value = value.$leading)
      result = value + ' ' + result
  return result
}

G.Node.prototype.updateAttribute = function(value) {
  var old = this[value.$key];
  var descriptor = G.Node.attributes[value.$key];
  if (descriptor) {
    
    var descripted = descriptor.call(this, value, old);
    if (descripted === null)
    if (descripted !== undefined)
      value = descripted

  }
  if (this.tag) {
    var formatted = this.decorate(old);
    if (formatted) {
      this.$node.setAttribute(value.$key, formatted);
    } else {
      this.$node.removeAttribute(value.$key)
    }
  }
}

G.Node.prototype.render = function(deep) {

  if (G.Node.isScheduled(this, this.$parent, '$detached'))
    return this.detach(true)
  if (this.$attached) {
    for (var i = 0; i < this.$attached.length; i++)
      G.Node.place(this.$attached[i], true)
    this.$attached = undefined;
  }
  if (this.$detached) {
    for (var i = 0; i < this.$detached.length; i++)
      this.$detached[i].detach(true)
    this.$detached = undefined;
  }
  
  if (!this.$node) {
    if (this.tag) {
      this.$node = document.createElement(this.tag);
      this.$node.$operation = this;
      this.each(this.onChange, true);
    } else if (this.text) {
      this.$node = document.createTextNode(this.text);
      this.$node.$operation = this;
    } else if (deep) {
      this.$node = document.createDocumentFragment()
    }
  } else if (this.rule) { // detach node used to initialize rule
    this.detach();
    this.$node = undefined;
  }

  if (this.$mutated) {
    var mutations = G.Node.$transaction.$mutations;
    for (var i = this.$mutated.length; i--;) {
      var value = this.$mutated[i];
      this.updateAttribute(value);
      G.Node.unschedule(value, this, '$mutated', '$mutating')
    }
  }

  if (deep !== false) {
    G.Node.descend(this);
    //this.commit(true)
  }
  return this.$node
}


G.Node.prototype.transact = function() {
  this.$transaction = G.Node.$transaction
  G.Node.$transaction = this
}

G.Node.prototype.commit = function(soft) {
  // iterate transaction stack
  for (var transaction = G.Node.$transaction; transaction;) {
    // if transaction is marked to render
    if (target) {
      if (transaction.$mutations) {
        for (var i = 0; transaction.$mutations[i]; i++) {
          var attribute = transaction.$mutations[i];
          if (attribute.$context)
            attribute.$context.updateAttribute(attribute);
        }
      }
      if (transaction.$detaching) {
        for (var i = 0; transaction.$detaching[i]; i++) {
          transaction.$detaching[i].detach(true)
        }
      }
      if (transaction.$attaching) {
        for (var i = 0; transaction.$attaching[i]; i++) {
          var node = transaction.$attaching[i];
          node.render()
        }
      }
      transaction.$detaching = 
      transaction.$mutations = 
      transaction.$attaching = undefined
      // pop the stack
      if (!soft)
        G.Node.$transaction = transaction.$transaction;
    } else if (transaction == this) {
      // restart loop
      var target = this;
      transaction = G.Node.$transaction;
      continue;
    }
    if (transaction == target)
      break;
    transaction = transaction.$transaction
  }
}

G.Node.prototype.comparePosition = function(other) {
  if (this == other)
    return 0;
  for (var parent = this; parent; parent = parent.$parent) {
    for (var p = other; p; p = p.$parent) {
      if (p.$parent == parent.$parent) {
        if (p == this)
          return 1;
        if (parent == other)
          return -1;
        for (var n = p; n = n.$next;)
          if (n == parent)
            return -1;
        return 1;
      }
    }
  }
  return -1;
}

// Render descendant nodes
G.Node.prototype.descend = function() {
  for (var last = this; last.$last;)
    last = last.$last;

  for (var after = this; after = after.$following;) {
    if (after.$future) {
      if (after.$current.$multiple) {
        var first = after.$current;
        while (first.$previous)
          first = first.$previous;
        while (first) {
          var child = first.render()
          if (child) first.place();
          first = first.$next;
        }
      } else {
        var child = after.$current.render(false)
        if (child) after.$current.place();
      }
    } else {
      var child = after.render(false)
      if (child) after.place();
    }
    if (last == after)
      break;
  }
}

// Place DOM node in relation to its G siblings
// This method applies changes in G node to DOM 
G.Node.prototype.place = function() {
  G.Node.unschedule(this, this.$parent, '$detached', '$detaching')
  G.Node.unschedule(this, this.$parent, '$attached', '$attaching')

  if (!this.$node) return;
  
  for (var parent = this; parent = parent.$parent || parent.$cause;)      // find closest parent that is in dom
    if (parent.$node)
      break;

  var anchor = G.Node.findNextElement(this, parent);
  if (anchor === false)
    anchor = parent.$node.firstChild;
  if (anchor != this.$node)
  if (this.$node.parentNode != parent.$node || this.$node.nextSibling != anchor)
      parent.$node.insertBefore(this.$node, anchor)
}

G.Node.findNextElement = function(node, parent, limit) {
  if (!node.$leading && node.$next) {
    for (var next = node.$next; next; next = next.$following) {
      if (next.$node && next.$node.parentNode == parent.$node)
        return next.$node;
    }
  }
  for (var prev = node; prev = prev.$leading || prev.$cause;) {     // see previous effects
    if (prev == limit)
      return;

    if (prev.$current) { // visit future tree 
      for (var last = prev.$current; last.$last;)
        last = last.$last;
      if (last && last.$node && last.$node.parentNode == parent.$node)
        return last;
      last = G.Node.findNextElement(last, parent, prev)
      if (last === false)
        return false;
      return last;
    }
    if (prev == parent) {
      return parent.firstChild || false;
    } else if (prev.$node && prev.$node.parentNode == parent.$node) {
      var anchor = prev.$node.nextSibling;
      // avoid extra dom mutations when splicing children in transction
      while (anchor && 
          G.Node.isScheduled(anchor, anchor.$parent, '$detached')) {
        anchor = anchor.nextSibling
      }
      return anchor;
    }
  }
}

// Remove DOM node from its parent
G.Node.prototype.detach = function(force) {
  var transaction = G.Node.$transaction
  if (transaction && !force) {
    G.Node.unschedule(this, this.$parent, '$attached', '$attaching')
    G.Node.schedule(this, this.$parent, '$detached', '$detaching')
    return;
  }
  if (force)
    G.Node.unschedule(this, this.$parent, '$detached', '$detaching')
  if (this.$node) {
    if (this.$node.parentNode)
      this.$node.parentNode.removeChild(this.$node)
  } else 
    G.Array.children(this, G.Node.detach, force)
}

G.Node.isScheduled = function(node, target, local) {
  var array = target && target[local];
  if (array && array.indexOf(node) > -1)
    return true
}
G.Node.schedule = function(node, target, local, global) {
  var array = target[local];
  if (!array)
    array = target[local] = [];
  if (array.indexOf(node) == -1) {
    array.push(node)
    var transaction = G.Node.$transaction
    if (transaction) {
      var mutations = transaction[global];
      if (!mutations)
        mutations = transaction[global] = [];
      mutations.push(node)
    }
  }
}
G.Node.unschedule = function(node, target, local, global) {
  var array = target && target[local];
  if (array) {
    var index = array.indexOf(node);
    if (index > -1) {
      array.splice(index, 1)
      var transaction = G.Node.$transaction
      if (transaction && transaction[global]) {
        var index = transaction[global].indexOf(node);
        if (index > -1)
          transaction[global].splice(index, 1)
      }
    }
  }
}

G.Node.prototype.cloneNode = function(deep) {
  var node = new (this.constructor)(this.tag);
  var keys = Object.keys(this);
  for (var i = 0, key; key = keys[i++];)
    if (!G.Node.inherited[key] && key.charCodeAt(0) != 36) {// '$'
      G.record.push();
      node.set(key, this[key], node)
      G.record.pop()
    }

  if (deep) {
    for (var child = this.$first; child; child = child.$next) {
      node.appendChild(child.cloneNode(deep))
    }
  }
  return node
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



G.Node.record = function() {
  return G.Node.$recording = true
};
G.Node.stop = function(result) {
  G.Node.$recording = undefined;
  return result;
}

G.Node.getKey = function(node, key) {
  if (node instanceof Array)
    var attributes = node[2];
  else if (node.nodeType == 1)
    var attributes = node.attributes;
  else
    var attributes = node;

  if (!attributes) return;

  var absolute = attributes.id || attributes.key;
  if (absolute) return absolute;


}

G.Node.prototype.migrate = function(tree, key) {
  if (typeof tree == 'function') {                    // Run JSX to generate S-tree 
    G.Node.record();                                  // without building G.Nodes
    tree = tree.call(this);
    G.Node.stop();
  }
  if (!tree) return;

  var attributes = {};
  tree = tree.valueOf(); 
  if (typeof tree == 'string') {
    G.Node.migrateAttribute('text', tree, this, attributes)
    return this;
  }

  var matches = [];                             // stable elements that were not removed
        
  for (var node = this; node; node = node.$next) {
    var key = G.Node.getKey(node)
    if (key) {
      if (!keys) {
        var keys = {};                                // dictionary of stable children ids
        var region = [];                              // current span between stable elements
      }
      keys[key] = node;
    }
  }

  if (keys) {                                         
    G.Node.eachChild(tree, G.Node.matchNode,          // Find stable elements
                     this, keys, matches, region);
  }
  G.Node.eachChild(tree, G.Node.migrateNode,           
                     this, matches, region);

  G.Node.eachAttribute(tree, G.Node.migrateAttribute, this, attributes);
  G.Node.eachAttribute(this, G.Node.cleanAttribute, this, attributes);

  return this;
};

G.Node.migrateNode = function(child, parent, matches, region) {
  var current = matches.current;
  if (region) {
    var index = matches.indexOf(child);
    if (index > -1) {
      var node = matches[index + 1];
      node.migrate(child);                                   // 0. Element is stable
      matches.current = node;                                //  - migrate it out of order
      matches.lastIndex = index + 3;
    } else {
      var index = matches.lastIndex || 0;
      if (matches[index + 2]) 
        region = matches[index + 2];
      var next = region[region.indexOf(child) + 1];
      var from = matches.current;
      var to   = matches[index + 1];
    }
  }
  if (!current) {
    if (!parent.$first || (to && parent.$first == to)) { // 1. Element is empty 
      matches.current = G.Node.create(child);            // 2. First element is stable
      parent.prependChild(matches.current);              //    - add new element 
    } else {                                             // 3. First element is not stable
      matches.current = parent.$first                    //    - migrate it
      matches.current.migrate(child)                      
    }
  } else {
    if (current.$next != to) {                           // 4. Another unstabe element in a row
      current.$next.migrate(child);
      matches.current = current.$next;
    } else {
      matches.current = G.Node.create(child);            // 5. New trailing unstable element
      parent.insertBefore(matches.current, current)
    }
  } 
};

G.Node.create = function(object) {
  if (typeof object == 'array') {
    return this.construct.apply(this, object);
  } else {
    return this.construct(object);
  }
}

G.Node.matchNode = function(child, parent, keys, matches, region) {
  var key = G.Node.getKey(child);
  if (keys[key]) {
    matches.push(child, node, region.splice(0))
  } else {
    region.push(child)
  }
};

G.Node.eachChild = function(node, callback, a1, a2, a3) {
  if (node instanceof Array) {
    for (var i = 2; i < node.length; i++)
      callback.call(this, node[i], a1, a2, a3);
  } else if (node.nodeType == 1) {
    for (var child = node.firstChild; child; child = child.nextSibling)
      callback.call(this, child, a1, a2, a3);
  } else {
    for (var child = node; child; child = child.$next)
      callback.call(this, child, a1, a2, a3);
  }
}
G.Node.eachAttribute = function(node, callback, a1, a2, a3) {
  if (node instanceof Array) {
    if (typeof node[1] == 'object') {
      for (var property in node[1])
        callback.call(this, property, node[1][property], a1, a2, a3);
    }
  } else if (node.nodeType == 1) {
    for (var i = 0, attribute; attribute = node.attributes[i++];)
      callback.call(this, attribute.name, attribute.value, a1, a2, a3);
  } else {
    var keys = Object.keys(node);
    for (var i = 0, key; key = keys[i++];)
      if (key != 'tag' && typeof node[key] != 'function' && key.charAt(0) != '$')
        callback.call(this, key, node[key], a1, a2, a3);
  }
}

G.Node.migrateAttribute = function(key, value, node, attributes) {
  G.record.push()
  if (key == 'class') {
    node.pushOnce(key, value, node)
  } else {
    node.set(key, value, node)
  }
  G.record.pop();
  attributes[key] = value;
}
G.Node.cleanAttribute = function(key, value, node, attributes) {
  if (value && value.recall && !attributes[key])
    value.recall(node)
}

G.Node.extend = function(constructor) {
  constructor.prototype = new this;
  constructor.prototype.constructor = constructor;
  constructor.fromElement = this.fromElement;
  constructor.construct   = this.construct;
  constructor.mapping     = Object.create(G.Node.mapping);
  return constructor;
}


G.Directive = function(attributes) {
  G.Node.unbox(this, null, attributes);
  for (var i = 1; i < arguments.length; i++)
    this.appendChild(arguments[i])
}
G.Directive.prototype = new G.Node;

G.If = function(attributes) {
  this.rule = 'if'
  G.Directive.apply(this, arguments);
}
G.If.prototype = new G.Directive 

G.Else = function(attributes) {
  this.rule = 'else'
  G.Directive.apply(this, arguments);
}
G.Else.prototype = new G.Directive 

G.Node.mapping = {
  'if': G.If,
  'else': G.Else
}



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



G.Node.Values = function() {
  G.apply(this, arguments);
}
G.Node.Values.prototype = new G;
G.Node.Values.prototype.constructor = G.Node.Values;
G.Node.Values.prototype.adoptNode = G.Node.Microdata.prototype.adoptNode;
G.Node.Values.prototype.cloneNode = G.Node.Microdata.prototype.cloneNode;
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
        context.push(bit, value, (value || old).$meta);
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
    } else {
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


G.Node.prototype.constructors = {
  values:    G.Node.Values,
  microdata: G.Node.Microdata
}

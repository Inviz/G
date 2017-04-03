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
G.Node.prototype = new G.Array;
G.Node.prototype.constructor = G.Node;
G.Node.prototype.$multiple = true;
G.Node.prototype.$referenced = true;
G.Node.prototype.constructors = {}
G.Node.construct = G.Node;

G.Node.extend = function(constructor) {
  constructor.prototype = new this;
  constructor.prototype.constructor = constructor;
  constructor.fromElement = this.fromElement;
  constructor.construct   = this.construct;
  constructor.mapping     = Object.create(G.Node.mapping);
  return constructor;
}

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

G.Node.unbox            = G.Node.call;
G.Node.prototype.call   = G.Array.prototype.call;
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
G.Node.prototype.replaceChild = function(child, another) {
  return G.verbs.replace(child, another)
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

// Concatenate text in all child nodes
G.Node.prototype.getTextContent = function() {
  var result = '';
  if (this.$first)
    for (var lead = this; (lead = lead.$following) != this.$next;) {
      if (lead && !lead.tag && lead.text) {
        result = result + lead.text;
      }
    }
  return result;
}

// Update itemvalue
G.Node.updateTrigger = function(node, prop, old) {
  var watchers = node.$watchers && node.$watchers[prop];
  if (!watchers || (!node[prop] && !old)) return;
  var trigger = G.Node.triggers[prop];
  if (trigger.$computing) return;
  for (var i = 0; i < watchers.length; i++)
    if (watchers[i] === trigger || watchers[i].$getter === trigger) {
      G.record.push(node[prop] || old)
      G.callback(node[prop]|| old, watchers[i], old)
      G.record.pop()
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
      if (prop) {
        G.Node.inherit.property(this, prop);
        G.Node.inherit.propagate(this, prop, value, old);
      }
      current.$subscription = this.watch(key, trigger)

    } else if (old && value == null) {
      if (prop) {
        G.Node.deinherit.property(this, prop, old);
        G.Node.deinherit.propagate(this, prop, value, old);
      }
      this.unwatch(key, trigger)
      old.$subscription = undefined;
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

G.Node.inherit = function(node) {
  for (var x = 0; x < G.Node.inheritable.length; x++)
    G.Node.inherit.property(node, G.Node.inheritable[x]);
}

G.Node.inherit.propagate = function(node, property, value, old) {
  for (var child = node.$first; child && child != node.$next; child = child.$following) {
    G.Node.inherit.property(child, property)
  }
}

G.Node.inherit.property = function(node, property, parent) {
  if (node[G.Node.inherited[property]] == null && !node[property])
    return;
  var $prop = G.Node.$inherited[property];
  if (!parent)
    parent = node;
  for (; parent = parent.$parent;) {
    if (parent[property]) {
      if (node[$prop] != parent[property]) {
        if (node[$prop]) {
          //node[property] = null;
          G.Node.updateTrigger(node, G.Node.inherited[property])
        }
        if (!node[property] || node[$prop] == node[property]) {
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

G.Node.deinherit.propagate = function(node, property, value, old) {
  for (var child = node.$first; child && child != node.$next; child = child.$following) {
    G.Node.deinherit.property(child, property)
  }
}

G.Node.deinherit.property = function(node, property, old) {
  var $prop = G.Node.$inherited[property];
  var key = G.Node.inherited[property];
  for (var parent = node; parent = parent.$parent;) {
    if (parent[property]) {
      if (node[$prop] === parent[property]) {
        if (node[property] == node[$prop]) {
          node[property] = undefined
          if (node[key]) {
            G.Node.inherit.property(node, property, parent)
          }
          var value = node[property]
          
        } else if (node[key] && node[property] && node[property].$context != node) {
          var object = node[property].uncall() // detach named sub-microdata 
        }
        if (!value && node[$prop] === parent[property])
          node[$prop] = undefined
        if (!value)
          G.Node.updateTrigger(node, key, old);
      }
      break;
    }
  }
}



G.Node.inheritable = []                               // register inheritable property
G.Node.inherited = {}                                 // name of an attribute that triggers inheritance 
G.Node.$inherited = {}                                // name of key that references parent microdata scope
G.Node.inheriting = {}                                // name of a inherited property triggered by key

// Triggers are functions that observe undeclared variables
// Triggers should have return statement 
// if they are expected to observe used properties
G.Node.triggers = {}

// Callbacks are static observers of node properties
G.Node.callbacks = {}

// Properties that trigger recomputation of `itemvalue` property 
G.Node.itemvalues = {
  content: function() {},
  href: function() {},
  src: function() {}
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

// Format array values like classnames
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


G.Node.getTag = function(node) {
  if (node instanceof Array)
    return node[0]
  else if (node.nodeType == 1)
    return node.tagName.toLowerCase()
  else
    return node.tag;
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

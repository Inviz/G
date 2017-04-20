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
    if (Node.mapping[tag])
      tag = Node.mapping[tag];

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
        if (tag == null) break;
        if (tag.nodeType) {
          if (tag.$operation) {
            var self = tag.$operation
          } else {
            var self = Node.fromElement(tag)
          }
        } else if (tag.push) {
          var self = Node(tag[0], tag[1]);
          for (var i = 2; i < tag.length; i++)
            self.appendChild(tag[i])
        } else {
          if (tag instanceof G.Node) {
            return tag.cloneNode();
          }
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
  constructor.eachChild   = this.eachChild;
  constructor.construct   = this.construct;
  constructor.mapping     = Object.create(G.Node.mapping);
  return constructor;
}

G.Node.fromElement = function(element, shallow) {
  switch (element.nodeType) {
    case 1:
      var tag = element.tagName && element.tagName.toLowerCase();
      var self = this.construct(tag);
      for (var i = 0; i < element.attributes.length; i++) {
        self.set(element.attributes[i].name, element.attributes[i].value, self)
      }
      break;
    case 3:
      var self = new this(null, element.textContent);
      break;
    case 8: 
      var tag = G.Node.getCommentDirective(element);
      var self = this.construct(tag);
      self.$node = element;
      self.detach()
      self.$node = undefined;
      return self;
    case 11:
      var self = new this;
  }
  self.$node = element;

  if (!shallow && element.childNodes)
    this.eachChild(element, G.Node.buildNode, self);
  element.$operation = self;

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
      G.callback.analyze(definition);
    if (definition.$arguments.length) {
      if (!this.$role) {
        this.$role = new G.future(this, null)
        this.$role.$future = true;
        this.$role.$getter = definition
        G.future.watch(this, null, this.$role)
      }
      //G.future.invoke(this.$role)
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
  var called = G.Array.prototype.inject.apply(this, arguments);
  if (this.$parent.$node)
    this.attach();
  
  return called
}


G.Node.prototype.attach   = function(force) {
  if (this.$parent) {
    G.Node.unschedule(this, '$detached')
  }
  var transaction = G.Node.$transaction
  if (transaction && !force) {
    G.Node.schedule(this, '$attached')
  } else {
    if (!this.$node) // todo: attaching of conditional w/out visi
      if (this.rule)
        G.Array.children(this, G.Node.attach, true)
      else
        this.render()
    if (this.$node)
      this.place()
    if (!this.$node || this.$node.nodeType != 1)
      G.Array.children(this, G.Node.place)
  }
  
  return this
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
    child = new (this.constructor)(null, child.valueOf())
  } else if (!(child instanceof G.Node) && !(child instanceof G.future)) {
    child = this.constructor.construct(child);
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

G.Node.prototype.getData = function() {
  return this.data || this.values 
              || (this.itemscope && this.scope);
}
G.Node.prototype.getURL = function() {
  if (this.href)
    return this.href;
  if (this.action)
    return this.action;
  if (this.itemscope && this.itemtype && this.itemid) {
    return this.itemtype + '/' + this.itemid;
  }
  if (this.tag == 'body')
    return this.basepath || location.href;
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

  if (this.itemprop && G.Node.itemvalues[key] && this.scope) {
    G.Node.updateTrigger(this, 'itemprop');
  } else if (this.name && G.Node.valueattributes[key]) {
    G.Node.updateTrigger(this, 'name');
  } else if (this.itemscope && G.Node.itemclasses[key]) {
    G.Node.callbacks.itemscope.call(this, value)
  }
  if (!this.$node || !(value || old).$context || key == 'tag' || G.Node.inherited[key])
    return;


  this.updateAttribute(key, value, old)
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
    if (child.itemprop && child.$scope) {
      if (topmost == null)
        if (!(topmost = this.$scope))
          for (var top = this.$parent; top; top = top.$parent) {
            if (top.$scope) {
              var topmost = top.$scope;
              break;
            }
          }
      if (topmost && child.$scope == topmost) {
        var val = child.$scope.get(child.itemprop, child);
        if (val) val.call()
      }
    }
    if (child.name && child.$values) {
      var val = child.$values.get(child.name, child);
      if (val) 
        val.call()
    }
  }

  if (this.text != null)
    G.Node.updateTextContent(this);
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

G.Node.prototype.updateAttribute = function(key, value, old, force) {
  var transaction = G.Node.$transaction
  if (transaction && !force) {
    if (value) {
      G.Node.schedule(value, '$mutated')
      if (old)
        G.Node.unschedule(old, '$mutated')
    } else {
      G.Node.schedule(old, '$mutated')
    }
    return
  } else {
    G.Node.unschedule(value, '$mutated')
  }

  var old = this[key];
  var descriptor = G.Node.attributes[key];
  if (descriptor) {
    
    var descripted = descriptor.call(this, value, old);
    if (descripted === null)
      return;
    
    if (descripted !== undefined)
      value = descripted

  }
  if (this.tag) {
    var formatted = this.decorate(old);
    if (formatted) {
      this.$node.setAttribute(key, formatted);
    } else {
      this.$node.removeAttribute(key)
    }
  }
}

G.Node.prototype.render = function(deep) {

  if (G.Node.isScheduled(this, '$detached'))
    return this.detach(true)

  
  if (!this.$node) {
    if (this.tag) {
      this.$node = document.createElement(this.tag);
      this.$node.$operation = this;
      G.Node.eachAttribute.call(this, this, this.updateAttribute, undefined, true);
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
      this.updateAttribute(value.$key, value, undefined, true);
    }
  }
  if (this.$attached || this.$detached) {
    if (this.$attached) {
      for (var i = 0; i < this.$attached.length; i++)
        this.$attached[i].attach(true)
      this.$attached = undefined;
    }
    if (this.$detached) {
      for (var i = this.$detached.length; i--;)
        this.$detached[i].detach(true)
      this.$detached = undefined;
    }
    return;
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
      transaction.render()
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
  G.Node.unschedule(this, '$detached')
  G.Node.unschedule(this, '$attached')

  if (!this.$node) return;
  
  for (var parent = this; parent = parent.$parent || parent.$cause;) {     // find closest parent that is in dom
    if (parent.$node && parent.$node.nodeType != 8)
      break;
  }
  if (!parent) return;

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
      return parent.$node.firstChild || false;
    } else if (prev.$node && prev.$node.parentNode == parent.$node) {
      var anchor = prev.$node.nextSibling;
      // avoid extra dom mutations when splicing children in transction
      while (anchor && 
          G.Node.isScheduled(anchor, '$detached')) {
        anchor = anchor.nextSibling
      }
      return anchor;
    }
  }
}

// Remove DOM node from its parent
G.Node.prototype.detach = function(force) {
  var transaction = G.Node.$transaction
  G.Node.unschedule(this, '$attached')
  if (transaction && !force) {
    G.Node.schedule(this, '$detached')
    return;
  }
  G.Node.unschedule(this, '$detached')
  if (this.$node) {
    if (this.$node.parentNode) {
      this.$node.parentNode.removeChild(this.$node)
    }
  }
  if (!this.$node || this.$node.nodeType == 8) 
    G.Array.children(this, G.Node.detach, force)
}

G.Node.isScheduled = function(node, local) {
  var target = G.Node.$transaction;
  if (!target) return;
  var array = target && target[local];
  if (array && array.indexOf(node) > -1)
    return true
}
G.Node.schedule = function(node, local) {
  var target = G.Node.$transaction;
  if (!target) return;
  var array = target[local];
  if (!array)
    array = target[local] = [];
  if (array.indexOf(node) == -1) {
    array.push(node)
  }
}
G.Node.unschedule = function(node, local) {
  var target = G.Node.$transaction;
  if (!target) return;
  var array = target && target[local];
  if (array) {
    var index = array.indexOf(node);
    if (index > -1) {
      array.splice(index, 1)
    }
  }
}


G.Node.getTag = function(node) {
  if (node instanceof Array)
    return node[0]
  else if (node.nodeType == 1)
    return node.tagName.toLowerCase()
  else
    return node.tag || node.rule;
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

// noop, used for consistency when tree initialized from DOM 
// with comments in it
G.End = function(attributes) {
  this.rule = 'end'
  G.Directive.apply(this, arguments);
}
G.End.prototype = new G.Directive 

G.Node.mapping = {
  'if': G.If,
  'else': G.Else,
  'end': G.End
}




// Transform G.Node into another (accepts JSX, S-expression, HTML, G.Nodes)
// Same operation as react dom diff but without restriction on node type mutation
G.Node.prototype.migrate = function(tree, key) {
  if (typeof tree == 'function') {                    // Run JSX to generate S-tree 
    G.Node.record();                                  // without building G.Nodes
    tree = tree.call(this);
    G.Node.stop();
  }
  if (!tree) return

  var attributes = {};
  tree = tree.valueOf(); 

  var tag = G.Node.getTag(tree);
  
  if (tag != (this.tag || this.rule)) {               // node types dont match
    var node = G.Node.create(tree);                   // replace instead of migration
    G.verbs.replace(node, this);
    
    if (node.$node) {
      node.attach();
    } else if (this.hasOwnProperty('$node')) {
      node.attach()
    }
    this.detach()

    return node;
  }

  if (typeof tree == 'string') {
    G.Node.migrateAttribute('text', tree, this, attributes)
    return this;
  }

  var migrated = [];

  for (var node = this.$first; node; node = node.$next) {
    var key = G.Node.getKey(node)
    if (key) {
      if (!keys) {
        var matches = [];                             // stable elements that were not removed
        var keys = new Map;                                // dictionary of stable children ids
        var region = [];                              // current span between stable elements
      }
      keys.set(key, node);
    }
  }

  if (keys) {                                         
    G.Node.eachChild(tree, G.Node.matchNode,          // Find stable elements
                     this, keys, matches, region);
  }
  G.Node.eachChild(tree, G.Node.migrateNode,          // Create and update elements     
                     this, matches, region, migrated);

  G.Node.eachChild(this, G.Node.cleanNode,            // Remove deleted elements
                     this, migrated);

  G.Node.eachAttribute(tree, G.Node.migrateAttribute, // Create and update attributes
                     this, attributes);

  G.Node.eachAttribute(this, G.Node.cleanAttribute,   // Remove deleted attributes
                     this, attributes);

  return this;
};
G.Node.buildNode = function(child, parent) {
  if (child.nodeType)
    parent.appendChild(this.fromElement(child))
  else
    parent.appendChild(child)
}

G.Node.migrateNode = function(child, parent, matches, region, migrated) {
  var current = migrated[migrated.length - 1];
  if (region) {
    var index = matches.indexOf(child);
    if (index > -1) {
      var node = matches[index + 1];                  // 0. Element is stable
      var result = node.migrate(child);               //  - migrate it out of order
      matches.lastIndex = index + 3;
      if (current)
        G.verbs.after(node, current);
      migrated.push(result)
      return;
    } else {
      var index = matches.lastIndex || 0;
      if (matches[index + 2]) 
        region = matches[index + 2];
      var next = region[region.indexOf(child) + 1];
      var from = current;
      var to   = matches[index + 1];
    }
  }
  if (!current) {
    if (!parent.$first ||(to && parent.$first == to)){// 1. Element is empty 
      var result = G.Node.create(child);              // 2. First element is stable
      parent.prependChild(result);                    //    - add new element 
    } else {                                          // 3. First element is not stable
      var result = parent.$first.migrate(child)       //    - migrate it          
    }
  } else {
    if (current.$next != to) {                        // 4. Another unstabe element in a row
      var result = current.$next.migrate(child);
    } else {
      var result = G.Node.create(child);              // 5. New trailing unstable element
      parent.insertBefore(result, current.$next)
    }
  }
  migrated.push(result)
  return result;
};

G.Node.create = function(object) {
  if (typeof object == 'string') {
    return new this(undefined, object);
  } else if (object instanceof Array) {
    return this.construct.apply(this, object);
  } else if (!object.$operation) {
    return this.construct(object);
  } else { // reuse operation because dom node matched
    return object.$operation.migrate(object)
  }
}

G.Node.matchNode = function(child, parent, keys, matches, region) {
  var key = G.Node.getKey(child);
  var stable = key && keys.get(key);
  if (stable) {
    matches.push(child, stable, region.splice(0))
  } else {
    region.push(child)
  }
};

G.Node.cleanNode = function(child, parent, migrated) {
  
  if (migrated.indexOf(child) == -1) {
    
    child.uncall()
  }
};

G.Node.eachChild = function(node, callback, a1, a2, a3, a4, stack) {
  if (node instanceof Array) {
    for (var i = 2; i < node.length; i++)
      if (node[i] != null)
        callback.call(this, node[i], a1, a2, a3, a4);
  } else if (node.childNodes) {
    for (var child = node.firstChild; child;) {
      var next = child.nextSibling;
      // If found a comment in children
      if (child.nodeType == 8) {
        var tag = G.Node.getCommentDirective(child);
        if (tag) {
          if (!stack) stack = []
          if (tag === 'end') {
            var parent = stack.pop()
          } else {
            if (tag.indexOf('els') == 0)
              stack.pop()
            var parent = this(child);
            callback.call(this, parent, stack && stack[stack.length - 1] || a1, a2, a3, a4);
            stack.push(parent)
            child = next;
            continue
          }
        }
      }
      callback.call(this, child, stack && stack[stack.length - 1] || a1, a2, a3, a4);
      child = next;
    }
  } else {
    for (var child = node.$first; child;) {
      var next = child.$next;
      callback.call(this, child, a1, a2, a3, a4);
      child = next;
    }
  }
}

G.Node.getCommentDirective = function(comment) {
  return comment.nodeValue.trim().split(' ')[0];
}

G.Node.eachAttribute = function(node, callback, a1, a2, a3) {
  if (node instanceof Array) {
    if (typeof node[1] == 'object') {
      for (var property in node[1])
        callback.call(this, property, node[1][property], a1, a2, a3);
    }
  } else if (node.attributes && node.attributes.length != null) {
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


G.Node.record = function() {
  return G.Node.$recording = true
};
G.Node.stop = function(result) {
  G.Node.$recording = undefined;
  return result;
}

G.Node.getKey = function(node, key) {
  // stringy key
  if (node instanceof Array) {
    var attributes = node[1];
  } else if (node.nodeType == 1) {
    var attributes = node.attributes;
    var identity = node; 
  } else {
    var attributes = node;
    var identity = node.$node; 
  }

  if (attributes) {
    var absolute = attributes.id || attributes.key;
    if (absolute) return absolute.valueOf();
  }

  return identity;
}

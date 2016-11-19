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
  if (!(this instanceof G.Node)) {
    switch (typeof tag) {
      case 'function':
        var self = new tag(attributes);
        break;
      case 'string':
        if (G.Node[tag])
          var self = new G.Node[tag](attributes)
        else
          var self = new G.Node(tag, attributes)
        break
      case 'object':
        if (tag && tag.nodeType) {
          if (tag.$operation) {
            var self = tag.$operation
          } else {
            var self = G.Node.fromElement(tag)
          }
        } else {
          var self = new G.Node;
        }
    }
  } else {
    if (G.Node.$migration) {
      var self = G.Node.migrate.apply(this, arguments)
      if (self) return self;
    }
    var self = this;
    this.setArguments(tag, attributes);
    if (G.Node.$recording) {
      G.Node.remember.apply(this, arguments);
    }
  }

  for (var i = 2; i < arguments.length; i++)
    self.appendChild(arguments[i])

  return self
}


G.Node.fromElement = function(element, mapping) {
  if (arguments.length == 1)
    mapping = G.Node.mapping;
  switch (element.nodeType) {
    case 1:
      var tag = element.tagName && element.tagName.toLowerCase();
      var self = G.Node(mapping[tag] || tag);
      break;
    case 3:
      var self = new G.Node(null, element.textContent);
      break;
    case 8:
      break;
    case 11:
      var self = new G.Node;
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
            var rule = G.Node(tag)
            self.appendChild(rule)
            while (++i < j)
              rule.appendChild(G.Node.fromElement(element.childNodes[i], mapping))
          }
        }
      }
    } else {
      var node = G.Node.fromElement(child, mapping);
      self.appendChild(node)
    }
  }
  return self;
}
G.Node.prototype = new G.Array;
G.Node.prototype.$multiple = true;
G.Node.prototype.$referenced = true;

G.Node.extend           = G.Node.call;
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
      G.children(this, G.Node.place)
  }
  if (this.text != null)
    G.Node.updateTextContent(this);
  
  return called
}
G.Node.prototype.eject = function() {
  this.detach()
  var uncalled =  G.Array.eject(this)

  if (this.text != null)
    G.Node.updateTextContent(this);
  
  return uncalled;

};

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
      this.merge(attributes);
    else
      this.set('text', attributes); //lazy text content
  }


  for (var i = 2; i < arguments.length; i++)
    this.appendChild(arguments[i])
  
  G.record.pop()
}

G.Node.prototype.getTextContent = function() {
  var result;
  if (this.$first)
    for (var lead = this; lead = lead.$following;) {
      if (lead && !lead.tag && lead.text) {
        result = (result || '') + lead.text;
      }
      if (lead == this.$last)
        break;
    }
  return result;
}

// Update itemvalue
G.Node.updateTrigger = function(node, prop) {
  var watchers = node.$watchers[prop];
  for (var i = 0; i < watchers.length; i++)
    if (watchers[i].$getter === G.Node.triggers[prop]) {
      G.callback.future(node[prop], watchers[i])
      break;
    }
}

G.Node.updateTextContent = function(node) {
  for (var parent = node; parent = parent.$parent;) {
    if (parent.itemprop)
      G.Node.updateTrigger(parent, 'itemprop');
  }
}

// Apply attribute changes to element
G.Node.prototype.onChange = function(key, value, old) {
  var trigger = G.Node.triggers[key];
  if (trigger) {
    var prop = G.Node.inheriting[key];
    if (value && old == null) {
      this.watch(key, trigger)
      if (prop)
        G.Node.inherit.property(this, prop);

    } else if (old && value == null) {
      this.unwatch(key, trigger)
      if (prop)
        G.Node.deinherit.property(this, prop);
    }
  }
  var callback = G.Node.callbacks[key];
  if (callback)
    callback.call(this, value, old)

  if (this.itemprop && G.Node.itemvalues[key] && this.microdata)
    G.Node.updateTrigger(this, 'itemprop');

  if (!this.$node || !(value || old).$context || key == 'tag')
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
G.Node.prototype.appendChild = function(child) {
  if (!child) return;
  if (typeof child.valueOf() == 'string') {
    var text = child;
    child = new G.Node(null, text)
  }
  if (G.Node.$migration)
    return;
  return G.verbs.append(child, this);
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
    if (parent[property] && node[$prop] != parent[property]) {
      if (!node[property]) {
        node[property] = parent[property];
      }
      node[$prop] = parent[property]
      G.Node.updateTrigger(node, G.Node.inherited[property])
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
G.Node.itemvalues = {
  content: function() {},
  href: function() {},
  src: function() {}
}

G.Node.inheritable = Object.keys(G.Node.inherited);

// Triggers should have return statement 
// if they are expected to observe all properties
G.Node.triggers = {
  name: function(name) {
    this.values.set(name, this.value, this);
    return
  },

  itemprop: function(itemprop) { // itemprop future is optimized to
    if (this['itemscope']) {
      if (this.$microdata)
        this.$microdata.push(itemprop, this.microdata)
      return;
    } else if (this['href'] != null)    // be triggered by any possible
      var value = this['href'];  // source of itemvalue without 
    else if (this['src'] != null)// individual subscription
      var value = this['src'];
    else if (this['content'] != null)
      var value = this['content'];
    else
      var value = this.getTextContent()

    if (this.microdata[itemprop] != value){
          this.microdata.push(itemprop, value, this);}
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

  itemscope: function() {
    var microdata = this.set('microdata', {}, this);
    microdata.$composable = true;
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

G.Node.prototype.onregister = function(parent) {
  var last = this.$last;
  for (var child = this; child != this.$last; child = child.$following)
    G.Node.inherit(child);
  if (this.itemprop && this.$microdata)
    G.Node.reorderMicrodata(this)

}
G.Node.reorderMicrodata = function(node) {
  var prop = node.itemprop.valueOf()
  for (var before = node; before = before.$leading;) { // Find nodes in DOM with same itemprop
    if (before.itemscope && 
      before.itemscope.microdata == node.$microdata)
      break;
    if (prop == before.itemprop) {
      var current = node.$microdata[prop];
      for (; current; current = current.$previous) {
        if (current.$caller === before.itemprop 
        || current.$caller == before.itemscope) {
          if (node.$previous != before)
            return G.after(node, before); // put value where it should be
          return;
        }
      }
    }
  }
  
  var current = node.$microdata[node.itemprop];
  for (; current; current = current.$previous) {
    if (current.$caller === node.itemprop) {
      var first = G.Array.first(current);
      if (first !== current)
        return G.before(current, first) // put value on top
      return;
    }
  }
}
G.Node.prototype.onunregister = function(parent) {
  var last = this.$last;
  for (var child = this; child != this.$last; child = child.$following)
    G.Node.deinherit(child);
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

// Render descendant nodes
G.Node.descend = function(node) {
  for (var last = node; last.$last;)
    last = last.$last;

  for (var after = node; after = after.$following;) {              // for each effect
    if (after.$future) {
      if (after.$current.$multiple) {
        var first = after.$current;
        while (first.$previous)
          first = first.$previous;
        while (first) {
          var child = G.Node.render(first)
          if (child) G.Node.place(first);
          first = first.$next;
        }
      } else {
        var child = G.Node.render(after.$current, false)
        if (child) G.Node.place(after.$current);
      }
    } else {
      var child = G.Node.render(after, false)
      if (child) G.Node.place(after);
    }
    if (after == node.$last)
      node = after;
    if (last == after)
      break;
  }
}

// Place DOM node in relation to its G siblings
// This method applies changes in G node to DOM 
G.Node.place = function(node) {
  G.Node.unschedule(node, node.$parent, '$detached', '$detaching')
  G.Node.unschedule(node, node.$parent, '$attached', '$attaching')

  if (!node.$node) return;
  
  for (var parent = node; parent = parent.$parent || parent.$cause;)      // find closest parent that is in dom
    if (parent.$node)
      break;

  var anchor = G.Node.findNextElement(node, parent);
  if (anchor === false)
    anchor = parent.$node.firstChild;
  if (anchor != node.$node)
  if (node.$node.parentNode != parent.$node || node.$node.nextSibling != anchor)
      parent.$node.insertBefore(node.$node, anchor)
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
    G.children(this, G.Node.detach, force)
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





G.Node.prototype.migrate = function(record) {
  G.Node.$migration = record;
  G.Node.$migrated = []
  return this;
};
G.Node.prototype.finalize = function() {
  var migrated = G.Node.$migrated;
  G.Node.$migration = undefined;
  G.Node.$migrated = undefined;
  return migrated;
}

G.Node.remember = function(tag, attributes) {
  G.Node.$recording.push(this, attributes);
}
G.Node.record = function() {
  return G.Node.$recording = []
};
G.Node.stop = function() {
  var recording = G.Node.$recording;
  G.Node.$recording = undefined;
  return recording;
}
G.Node.migrate = function(tag, attributes) {
  var node = G.Node.$migration[G.Node.$migrated.length];
  var old  = G.Node.$migration[G.Node.$migrated.length + 1];

  if (attributes)
    attributes = attributes.valueOf();

  G.Node.updateAttributes(node, attributes, old);
  G.Node.$migrated.push(node, attributes)

  return node;
}

G.Node.updateAttributes = function(node, attributes, old) {
  G.record.push()
  if (typeof attributes == 'string') {
    node.set('text', attributes);
  } else {
    if (attributes)
      for (var key in attributes) {
        var v = attributes[key];
        var o = (old ? old[key] : undefined);
        
        if (o != v) {
          if (o == null || G.stack(node, key, o, o && o.$meta)) 
            node.push(key, v)
        }
      }
    if (old)
      for (var key in old) {
        if (!attributes || attributes[key] !== old[key])
          node.unset(key, old[key])
      }
  }
  G.record.pop()
}



G.Directive = function(attributes) {
  G.Node.extend(this, null, attributes);
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
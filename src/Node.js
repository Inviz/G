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
// conditional rules, or fragments are still kept in that
// graph, while DOM is unaware of them them.
// This allows easy detaching and reattaching of DOM
// spans not necessarily wrapped into shared physical
// parent.  

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
    var self = this;
    if (tag)
      self.tag = tag;
    if (attributes)
      self.merge(attributes);
  }

  for (var i = 2; i < arguments.length; i++)
    G.Node.append(self, arguments[i])

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
      var self = new G.Node;
      self.text = element.textContent;
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
            G.Node.append(self, rule)
            while (++i < j)
              G.Node.append(rule, G.Node.fromElement(element.childNodes[i], mapping))
          }
        }
      }
    } else {
      var node = G.Node.fromElement(child, mapping);
      G.Node.append(self, node)
    }
  }
  return self;
}
G.Node.prototype = new G.Array;
G.Node.prototype.$multiple = true;
G.Node.prototype.$referenced = true;

G.Node.extend           = G.Node.call;
G.Node.prototype.call   = function() {
  G.Node.unschedule(this, this.$parent, '$detached', '$detaching')
  G.Node.schedule(this, this.$parent, '$attached', '$attaching')
  var called = G.Array.call(this);
  var transaction = G.Node.$transaction
  if (transaction) {
    (transaction.$nodes || (transaction.$nodes = [])).push(this)
  } else {
    if (this.$node)
      G.Node.place(this)
    else
      G.children(this, G.Node.place)
  }
  return called
}
G.Node.prototype.recall = function() {
  G.Node.detach(this)
  return G.Array.recall(this)
};

// Apply attribute changes to element
G.Node.prototype.onChange = function(key, value, old) {
  if (!this.$node || !(value || old).$context)
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
G.Node.append = function(context, child) {
  if (!child) return;
  if (typeof child.valueOf() == 'string') {
    var text = child;
    child = new G.Node
    child.text = text
  }
  return G.verbs.append(child, context);
}


G.Node.attributes = {
  text: function(value) {
    if (this.$node)
      this.$node.textContent = value
    return
  },

  tag: function() {
    return null;
  },

  type: function(value) {
    var type = G.Node.types[value];
    if (type) {

    }
  },

  name: function() {
    this.$inherited.values.propagate(this.name, this.value);
  },

  action: function() {
    this.add('class', 'selected')
  },

  do: function() {
    this.push('action', this.action)
  },

  onclick: function() {
    
  }
}


// sort values in accordance to DOM order
G.verbs.propagate = function(value, old) {
  return value;
}

G.Node.tags = {
  form: function() {
    this.set('values', new G);
  },
  fieldset: function() {
    //this.scope('values', this.inherited.values)
  },
  dialog: function() {

  }
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
  if (this.$future && this.$current)
    return G.Node.render(this.$current, deep)
  if (G.Node.isScheduled(this, this.$parent, '$detached'))
    return G.Node.detach(this, true)
  if (this.$attached) {
    for (var i = 0; i < this.$attached.length; i++)
      G.Node.place(this.$attached[i], true)
    this.$attached = undefined;
  }
  if (this.$detached) {
    for (var i = 0; i < this.$detached.length; i++)
      G.Node.detach(this.$detached[i], true)
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
    G.Node.detach(this);
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
          var node = transaction.$detaching[i];
          G.Node.detach(node, true)
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
    last = last.$last
  for (var after = node; after = after.$following;) {              // for each effect
    var child = G.Node.render(after, false)
    if (child) G.Node.place(after);
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
  
  for (var parent = node; parent = parent.$parent;)      // find closest parent that is in dom
    if (parent.$node)
      break;
  for (var prev = node; prev = prev.$leading;) {     // see previous effects
    if (prev == parent) {
      var anchor = parent.$node.firstChild;
      parent.$node.insertBefore(node.$node, anchor)
      return
    } else if (prev.$node) {
      if (prev.$node.parentNode == parent.$node) {
        if (node.$node.previousSibling != prev.$node) {
          var anchor = prev.$node.nextSibling;
          // avoid extra dom mutations when splicing children in transction
          while (anchor && 
              G.Node.isScheduled(anchor, anchor.$parent, '$detached')) {
            anchor = anchor.nextSibling
          }
          parent.$node.insertBefore(node.$node, anchor);
        }
        return
      }
    }
  }
}

// Remove DOM node from its parent
G.Node.detach = function(node, force) {
  var transaction = G.Node.$transaction
  if (transaction && !force) {
    G.Node.unschedule(node, node.$parent, '$attached', '$attaching')
    G.Node.schedule(node, node.$parent, '$detached', '$detaching')
    return;
  }
  if (force)
    G.Node.unschedule(node, node.$parent, '$detached', '$detaching')
  if (node.$node) {
    node.$node.parentNode.removeChild(node.$node)
  } else 
    G.children(node, G.Node.detach, force)
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


G.Directive = function(attributes) {
  G.Node.extend(this, null, attributes);
  for (var i = 1; i < arguments.length; i++)
    G.Node.append(this, arguments[i])
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
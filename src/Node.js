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
        if (tag.tagName) {
          if (tag.$operation) {
            var self = tag.$operation
          } else {
            var self = new G.Node(tag.tagName);    
            tag.$operation = self;
            self.$node = tag;
          }
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
G.Node.prototype = new G.Array;

G.Node.extend           = G.Node.call;
G.Node.prototype.call   = G.Array.prototype.call;
G.Node.prototype.recall = function() {
  if (this.$node)
    G.Node.detach(this)
  else
    G.children(this, G.Node.detach)
  return G.Array.recall(this)
};

// Apply attribute changes to element
G.Node.prototype.onChange = function(key, value, old) {
  if (!this.$node)
    return;
  var transaction = G.Node.$transaction
  if (transaction) {
    (transaction.$mutations || (transaction.$mutations = [])).push(value || old)
    return
  } else {
    this.updateAttribute(value || old)
  }
}

// Inject node into another
// If child is a string, creates text node
G.Node.append = function(context, child) {
  if (typeof child == 'string') {
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
  if (!this.$node) {
    if (this.tag) {
      this.$node = document.createElement(this.tag);
      this.$node.$operation = this;
      this.each(this.onChange);
    } else if (this.text) {
      this.$node = document.createTextNode(this.text);
      this.$node.$operation = this;
    }
  }
  if (deep !== false) {
    G.Node.descend(this);
    this.commit(true)
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
    var child = after.render(false)
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
  for (var parent = node; parent = parent.$parent;)      // find closest parent that is in dom
    if (parent.$node)
      break;
  for (var prev = node; prev = prev.$leading;) {     // see previous effects
    if (prev == parent) {
      var anchor = parent.$node.firstChild;
      parent.$node.insertBefore(node.$node, anchor)
      return
    } else if (prev == node 
           ||  prev.$node && prev.$parent == parent
           ||  prev.$parent == parent) {
      if (node.$node.previousSibling != prev.$node 
      ||  node.$node.parentNode != parent.$node) {
        var anchor = prev.$node && prev.$node.nextSibling;
        parent.$node.insertBefore(node.$node, anchor);
      }
      return
    }
  }
}

// Remove DOM node from its parent
G.Node.detach = function(node) {
  if (node.$node)
    node.$node.parentNode.removeChild(node.$node)
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
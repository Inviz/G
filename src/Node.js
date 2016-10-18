// Virtual dom with JSX-friendly constructor
// Each node is an observable object of attributes
// and an array oh childnodes.

// In addition to $next/$previous/$parent/$first/$last
// pointers, nodes also maintain $following/$succeeding
// depth-first list of nodes. When node is detached
// from document, it keeps the latter references together
// with $parent, so it can be be returned to its place later.

// That extra list is also used for document fragments
// and virtual elements. Invisible parts of DOM, like
// conditional rules, or fragments are still kept in that
// graph, while usual DOM-like pointers are ignoring them.
// This allows easy detaching and reattaching of DOM
// elements not necessarily wrapped into shared parent.  

// Changes to actual DOM are applied in batch when 
// node.render() method is called.

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
    G.Node.inject(arguments[i], self)

  return self
}
G.Node.prototype = new G.Array;

G.Node.call = G.Array.call;
G.Node.extend = G.Array.extend;
G.Node.recall = function(self) {
  G.Array.unlink(self)
  if (self.$node)
    G.Node.detach(self)
  else
    G.Array.forEach(self, G.Node.detach)
  return self
};


// Apply attribute changes to element
G.Node.prototype.onChange = function(key, value, old) {
  if (!this.$node)
    return;
  var descriptor = G.Node.attributes[key];
  if (descriptor) {
    var descripted = descriptor.call(this, value, old);
    if (descripted === null)
      return;
    if (descripted !== undefined)
      value = descripted
  }
  
  if (this.tag) {
    var formatted = this.decorate(value);
    if (value) {
      this.$node.setAttribute(value.$key, formatted);
    } else {
      this.$node.removeAttribute(old.$key)
    }
  }
}

// Inject node into another
// If child is a string, creates text node
G.Node.inject = function(child, context) {
  if (typeof child == 'string') {
    var text = child;
    child = new G.Node
    child.text = text
  }
  return G.verbs.inject(child, context);
}


G.Node.attributes = {
  text: function(value) {
    if (this.$node)
      this.$node.textContent = value
    return
  },

  tag: function() {
    return null;
  }
}

G.Node.prototype.decorate = function(value) {
  return value
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
  if (deep !== false)
    G.Node.descend(this);
  return this.$node
}

// Render descendant nodes
G.Node.descend = function(node) {
  for (var last = node; last.$last;)
    last = last.$last
  for (var after = node; after = after.$following;) {              // for each effect
    var child = after.render(false)
    if (child) G.Node.place(after, node);
    if (after == node.$last)
      node = after;
    if (last == after)
      break;
  }
}

// Place DOM node in relation to its G siblings
G.Node.place = function(node, limit) {
  for (var parent = node; parent = parent.$parent;) {      // and each of their parents
    if (parent.$node)
      var last = parent;
    if (!last) continue;

    for (var prev = node; prev = prev.$leading;) {     // see previous effects
      if (prev == last) {
        var anchor = parent.$node.firstChild;
        parent.$node.insertBefore(node.$node, anchor)
        return
      } else if (prev == node 
             ||  prev.$node && prev.$parent == last || prev.$parent == parent) {
        if (node.$node.previousSibling != prev.$node 
        ||  node.$node.parentNode != parent.$node) {
          var anchor = prev.$node && prev.$node.nextSibling;
          last.$node.insertBefore(node.$node, anchor);
        }
        return
      }
      if (prev == parent.$first)
        throw 'Oops'
    }
    if (parent == limit)  throw 'Oops'
  }
}

// Remove DOM node from its parent
G.Node.detach = function(node) {
  if (node.$node)
    node.$node.parentNode.removeChild(node.$node)
}

G.Directive = function(attributes) {
  G.Node.extend(this, null, attributes);
}
G.Directive.prototype = new G.Node;

G.If = function(attributes) {
  this.rule = 'if'
  G.Directive.apply(this, attributes);
  for (var i = 1; i < arguments.length; i++)
    G.Node.inject(arguments[i], this)
}
G.If.prototype = new G.Directive 

G.Else = function(attributes) {
  this.rule = 'else'
  G.Directive.apply(this, arguments);
  for (var i = 1; i < arguments.length; i++)
    G.Node.inject(arguments[i], this)
}
G.Else.prototype = new G.Directive 
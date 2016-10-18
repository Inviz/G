// Virtual dom 
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

G.Node.call = G.Array.call;
G.Node.extend = G.Array.extend;
G.Node.recall = function(operation) {
  G.Array.unlink(operation)
  if (operation instanceof G.Node)
    if (operation.$node)
      G.Node.detach(operation)
    else
      G.Array.Children(operation, G.Node.detach)
  return operation
};

G.Node.prototype = new G.Array;

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

// Adopt a single child
G.Node.inject = function(child, context) {
  if (typeof child == 'string') {
    var text = child;
    child = new G.Node
    child.text = text
  }
  return G.Methods.Array.inject(child, context);
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
G.Node.descend = function(context) {
  for (var last = context; last.$last;)
    last = last.$last
  for (var after = context; after = after.$following;) {              // for each effect
    var child = after.render(false)
    if (child) G.Node.place(after, context);
    if (after == context.$last)
      context = after;
    if (last == after)
      break;
  }
}

// Place DOM node in relation to its G siblings
G.Node.place = function(context, limit) {
  for (var parent = context; parent = parent.$parent;) {      // and each of their parents
    if (parent.$node)
      var last = parent;
    if (!last) continue;

    for (var prev = context; prev = prev.$leading;) {     // see previous effects
      if (prev == last) {
        var anchor = parent.$node.firstChild;
        parent.$node.insertBefore(context.$node, anchor)
        return
      } else if (prev == context 
             ||  prev.$node && prev.$parent == last || prev.$parent == parent) {
        if (context.$node.previousSibling != prev.$node 
        ||  context.$node.parentNode != parent.$node) {
          var anchor = prev.$node && prev.$node.nextSibling;
          last.$node.insertBefore(context.$node, anchor);
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
G.Node.detach = function(operation) {
  if (operation.$node)
    operation.$node.parentNode.removeChild(operation.$node)
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
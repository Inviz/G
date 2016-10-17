G.Element = function(tag, attributes) {
  if (!(this instanceof G.Element)) {
    if (typeof tag == 'function')
      var self = new tag(attributes)
    else if (G.Element[tag])
      var self = new G.Element[tag](attributes)
    else
      var self = new G.Element(tag, attributes)
  } else {
    var self = this;
    if (tag)
      self.tag = tag;
    if (attributes)
      self.merge(attributes);
  }

  var last = self;
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i]
    if (typeof child == 'string') {
      child = new G.Element
      child.text = arguments[i]
    }
    last.$after = child;
    child.$before = last;
    child.$parent = self
    for (last = child; last.$after;)
      last = last.$after;
  }

  return self
}

G.Element.prototype = new G;

// Apply attribute changes to element
G.Element.prototype.onChange = function(key, value, old) {
  if (!this.$node)
    return;
  var descriptor = G.Element.attributes[key];
  if (descriptor)
    if (descriptor.call(this, value, old) === false)
      return;
  
  if (this.tag) {
    var formatted = this.decorate(value);
    if (value) {
      this.$node.setAttribute(value.$key, formatted);
    } else {
      this.$node.removeAttribute(old.$key)
    }
  }
}

G.Element.attributes = {
  text: function() {

  },

  tag: function() {
    return false;
  }
}

G.Element.prototype.decorate = function(value) {
  return value
}

G.Element.prototype.render = function(deep) {
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
    this.descend();
  return this.$node
}

G.Element.prototype.descend = function() {
  for (var after = this; after = after.$after;) {              // for each effect
    var child = after.render(false)
    if (child) after.inject(this)
  }
}

G.Element.prototype.inject = function(limit) {
  for (var parent = this; parent = parent.$parent;) {      // and each of their parents
    if (parent.$node)
      var last = parent;
    if (!last) continue;

    for (var prev = this; prev = prev.$before;) {     // see previous effects
      if (prev == last) {
        var anchor = parent.$node.firstChild;
        parent.$node.insertBefore(this.$node, anchor)
        return
      } else if (prev == this 
             ||  prev.$node && prev.$parent == last || prev.$parent == parent) {
        if (this.$node.previousSibling != prev.$node 
        ||  this.$node.parentNode != parent.$node) {
          var anchor = prev.$node && prev.$node.nextSibling;
          last.$node.insertBefore(this.$node, anchor);
        }
        return
      }
    }
    if (parent == limit) return
  }
}

G.Element.Children = function(value, callback, argument) {
  var after, last;
  after = value;
  while (after.$after && after.$after.$before == after) {
    after = after.$after
    if (after.$parent === value) {
      last = callback(after, argument) || after;
    }
  }
  return last;
}

G.Element.recall = function(operation, hard) {
  var to = G.Element.Children(operation, G.Element.recall, false)      //    Recurse to recall side effects, returns last one
  if (hard !== false) {
    if (to && to.$after && to == to.$after.$before)
      to.$after.$before = operation.$before
    if (operation.$before && operation == operation.$before.$after)
      operation.$before.$after = to && to.$after

    if (operation.$node)
      G.Element.detach(operation)
    else
      G.Element.Children(operation, G.Element.detach)

  }
  return to || operation
};
G.Element.detach = function(operation) {
  if (operation.$node)
    operation.$node.parentNode.removeChild(operation.$node)
}

G.Element.extend = G.Element.call
G.Element.call = function(operation, hard) {
  if (operation.$before)
    operation.$before.$after = operation;
  var to = G.Element.Children(operation, G.Element.call, false) || operation      //    Recurse to recall side effects, returns last one
  if (hard !== false) {
    G.link(operation.$before, operation)                //    Patch graph and detach the tree at top
    G.link(to, to.$after)
    return operation;
  }
  return to
};


G.Directive = function(attributes) {
  G.Element.apply(this, null, attributes);
}
G.Directive.prototype = new G.Element;

G.If = function() {
  this.rule = 'if'
  G.Element.apply(this, null, arguments);
}
G.If.prototype = new G.Directive 

G.Else = function() {
  this.rule = 'else'
  G.Element.apply(this, null, arguments);
}
G.Else.prototype = new G.Directive 

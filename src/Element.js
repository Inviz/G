G.Element = function(tag, attributes) {
  if (!(this instanceof G.Element)) {
    if (G.Element[tag])
      var self = new G.Element[tag](attributes)
    else
      var self = new G.Element(attributes)
  } else {
    var self = this;
  }
  if (tag)
    self.tagName = tag;
  if (attributes)
    self.merge(attributes);

  var last = self;
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i]
    if (typeof child == 'string') {
      child = new G.Element
      child.textContent = arguments[i]
    }
    last.$after = child;
    child.$before = last;
    child.$parent = self
    for (last = child; last.$after;)
      last = last.$after;
  }

  return self
}

// Apply attribute changes to element
G.Element.prototype.onChange = function(key, value, old) {
  if (!this.$node)
    return;
  var descriptor = G.Element.attributes[key];
  if (descriptor)
    if (descriptor.call(this, value, old) === false)
      return;
  
  if (this.tagName) {
    var formatted = this.decorate(value);
    if (value) {
      this.$node.setAttribute(value.$key, formatted);
    } else {
      this.$node.removeAttribute(old.$key)
    }
  }
}

G.Element.attributes = {
  textContent: function() {

  },

  tagName: function() {
    return false;
  }
}

G.Element.prototype.decorate = function(value) {
  return value
}

G.Element.prototype.render = function(deep) {
  if (!this.$node) {
    if (this.tagName) {
      this.$node = document.createElement(this.tagName)
      this.each(this.onChange)
    } else {
      this.$node = document.createTextNode(this.textContent)
    }
    this.$node.$operation = this
  }
  if (deep !== false)
    this.descend();
  return this.$node
}

G.Element.prototype.descend = function() {
  for (var after = this; after = after.$after;) {              // for each effect
    var child = after.render(false)
    after.inject(this)
  }
}

G.Element.prototype.inject = function(limit) {
  for (var parent = this; parent = parent.$parent;) {      // and each of their parents
    if (!parent.$node) continue;
    for (var prev = this; prev = prev.$before;) {     // see previous effects
      if (prev == parent) {
        var anchor = parent.$node.firstChild;
        parent.$node.insertBefore(this.$node, anchor)
        return
      } else if (prev == this 
             ||  prev.$node && prev.$parent == parent) {
        if (this.$node.previousSibling != prev.$node 
        ||  this.$node.parentNode != parent.$node) {
          var anchor = prev.$node && prev.$node.nextSibling;
          parent.$node.insertBefore(this.$node, anchor);
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
      operation.$node.parentNode.removeChild(operation.$node)

  }
  return to || operation
};

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

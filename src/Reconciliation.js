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
  
  if (tag != this.tag) {                             // node types dont match
    var node = G.Node.create(tree);                   // replace instead of migration
    G.verbs.replace(node, this);
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

G.Node.eachChild = function(node, callback, a1, a2, a3, a4) {
  if (node instanceof Array) {
    for (var i = 2; i < node.length; i++)
      if (node[i] != null)
        callback.call(this, node[i], a1, a2, a3, a4);
  } else if (node.nodeType == 1) {
    for (var child = node.firstChild; child; child = child.nextSibling)
      callback.call(this, child, a1, a2, a3, a4);
  } else {
    for (var child = node.$first; child; child = child.$next)
      callback.call(this, child, a1, a2, a3, a4);
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
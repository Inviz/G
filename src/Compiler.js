// Wrap functions, export methods to G namespace
// This function will be called initially
G.compile = function() {
  var verbs = G.compile.struct(G, {})
  for (var name in G) {
    // Find Uppercase methods
    var first = name.charAt(0)
    if (first == first.toUpperCase() && first != first.toLowerCase())
      verbs = G.compile.struct(G[name])
  }
}
G.compile.struct = function(struct) {
  // Convert G.watch to G.prototype.watch
  for (var property in struct.prototype) {
    if (struct.prototype.hasOwnProperty(property) 
    && property.charAt(0) != '_'
    && property.charAt(0) != '$'
    && typeof struct.prototype[property] == 'function') {
      // function that accept `self` as first argument,
      // are patched up to use `this` in their prototype variants
      var instance = G.compile.method(struct.prototype[property], 'self')
      if (instance) {
        struct[property] = instance
      }
    }
  }

  if (struct.verbs) {
    for (var verb in struct.verbs) {
      var handler = struct.verbs[verb]
      if (struct.multiple)                            // Pass flag that allows method to set
        handler.multiple = struct.multiple            // multiple values /w same meta in array 
      G.verbs[verb]  = handler;                       // Plain callback    `G.verbs.set(value, old)`
      G['$' + verb]  = G.compile.setter(verb);        // Gerneric function `G.set(context)`
      if (!G[verb])
        G[verb]      = G['$' + verb]      
      if (!struct[verb])
        struct[verb] = G['$' + verb]    
      struct.prototype['$' + verb] = G.compile.verb(verb)     // Prototype method  `context.set()`
      if (!struct.prototype[verb])  
        struct.prototype[verb] = struct.prototype['$' + verb];
      if (!G.prototype[verb])
        G.prototype[verb] = struct.prototype['$' + verb];
    }
  }
};


// object.class.push('abc', 'cde')
G.compile.verb = function(verb) {
  return function(key, value) {
    if (value != null) {
      switch (arguments.length) {
        case 1:
        case 2:  return G.create(this, key, value).call(verb);
        case 3:  return G.create(this, key, value, arguments[2]).call(verb);
        case 4:  return G.create(this, key, value, arguments[2], arguments[3]).call(verb);
        default: return G.create(this, key, value, arguments[2], arguments[3], arguments[4]).call(verb);
      }
    } else {
      switch (arguments.length) {
        case 1:
        case 2:  return this[key].recall();
        case 3:  return this[key].recall(arguments[2]);
        case 4:  return this[key].recall(arguments[2], arguments[3]);
        default: return this[key].recall(arguments[2], arguments[3], arguments[4]);
      }
    }
  };
}

G.compile.setter = function(verb) {
  return function(context, key, value) {
    if (value != null) {
      switch (arguments.length) {
        case 3:  return G.create(context, key, value).call(verb);
        case 4:  return G.create(context, key, value, arguments[3]).call(verb);
        case 5:  return G.create(context, key, value, arguments[3], arguments[4]).call(verb);
        default: return G.create(context, key, value, arguments[3], arguments[4], arguments[5]).call(verb);
      }
    } else {
      switch (arguments.length) {
        case 2:
        case 3:  return context[key].recall();
        case 4:  return context[key].recall(arguments[3]);
        case 5:  return context[key].recall(arguments[3], arguments[4]);
        default: return context[key].recall(arguments[3], arguments[4], arguments[5]);
      }
    }
  };
};

G.compile.observer = function(fn, verb) {
  var string = fn.toString()
  var arguments = string.slice(string.indexOf('(') + 1, string.indexOf(')'))
  var body = string.slice(string.indexOf('{') + 1, string.lastIndexOf('}'))

  return new Function(
    arguments, 
    body.replace(/G.set/g, 'G.' + verb)
        .replace(/'set'/g, "'" + verb + "'")
  )

}

G.compile.method = function(fn, scope) {
  var string = fn.toString();
  if (string.indexOf('[native') > -1)
    return
  var arguments = string.slice(string.indexOf('(') + 1, string.indexOf(')'))
  var body = string.slice(string.indexOf('{') + 1, string.lastIndexOf('}'))
  var index
  var digit
  body = body.replace(/this/g, scope) //fixme better regexp

      // decrement argument counter if any
      .replace(/(Array.prototype.slice.call\(arguments,)\s*(\d+)/, function(match, prefix, d, i) {
        digit = d
        index = i
        return prefix + (parseInt(d) + 1);
      })

      // genericize method reference
      .replace(/G.prototype/g, 'G')

  if (index) {
    var z = body.lastIndexOf(digit, index);
    if (z != -1) 
      body = body.substring(0, z) + (parseInt(digit) + 1) + body.substring(z + 1);
  }
  if (arguments)
    arguments = scope + ', ' + arguments
  else
    arguments = scope
  return new Function(
    arguments, 
    body
  )
}



if (typeof global !== "undefined")
  global.G = G;
if (typeof window !== "undefined")
  window.G = G;
if (typeof module != "undefined")
  module.exports = G;
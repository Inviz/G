/* 
Location encapsulate browsing state of a single user on a single page.
and is accessible as `G.history` global variable. 
Location objects are doubly linked into navigation history.

It manages global scopes of various data structures used on the page:
  - params:   Query string data
  - input:   Incoming input data
  - data:     Outgoing input data, e.g. form fields 
  - scope:    Container for models, used to populate templates 

URLs of locations are parsed as properties like `schema`, `domain` and `path`, 
in addition to `params` object for parsed query string parameters.

Locations provide properties similar to ones of DOM document:
  - title:    A textual representation of page title
  - body:     A G.Node tree representing <body> contents
  - head:     A G.Node tree representing <head> contents

Effects induced by user are registered as if location called them,
so effects could be undone when navigating away.

Locations may serve different purposes:
  - to handle history of navigation and actions on page
  - to populate templates with data
  - to route urls to custom logic
  - to stack views like dialogs and detail view
  - to make requests and sync with API endpoints
  - to fetch data with associations
  - to map identity of models and their representations

todo:
  - uid:      Unique identification of current user
  - storage:  Model data stored for offline use
  - session:  Data shared within browsing session
*/
G.Location = function(url, base) {
  if (this instanceof G.Location) {                   // 1. Creating new location
    if (url != null)
      this.merge(
        G.Location.rebase(                              // Parse and rebase URL
          G.Location.parse(url), 
        base));         
  } else {                                            // 
    return (new G.Location(url)).navigate(base);      // 2. Navigate to new location
  }
};

G.Location.recursive = true;
G.Location.prototype = new G.Data;
G.Location.prototype.constructor = G.Location;

G.Location.prototype.affect = function(callback) {
  G.record.push(this);
  if (typeof callback == 'string')
    this.execute(callback)
  if (typeof callback == 'function')
    callback()
  G.record.pop();
}

G.Location.prototype.toXHR = function(method) {
  var xhr = new XMLHttpRequest();
  var url = '';
  if (this.domain) {
    url = '//' + this.domain
  }
  if (this.path) {
    if (this.domain && this.path.charAt(0) != '/')
      url += '/' + this.path;
    else
      url += this.path
  }
  if (this.params) {
    var query = this.params.toString();;
    if (query.length)
      url += '?' + query;
  }
  xhr.open(method || 'GET', url);
  xhr.method = method || 'get';
  xhr.url = url;
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      debugger
    }
  }
  return xhr;
}
G.Location.inherit = function(params, base, concat) {
  if (!params.domain && base.domain)
    params.domain = base.domain;
  if (!params.schema && base.schema)
    params.schema = base.schema;
  if (!params.method && base.method)
    params.method = base.method;
  if (base.path)
    if (!params.path || (concat !== false && params.path.charAt(0) != '/'))
      params.path = base.path + (params.path ? '/'  + params.path : '');
}

G.Location.rebase = function(params, base, path) {    // contextualize location parameters
  if (base)                                           // Inherit URL parts from given location
    G.Location.inherit(params, base);

  if (!params.caller)
    return params;

  if (params.target || !params.domain) {              // Inherit URL parts from parent scopes & document
    var skip = G.Location.targets[params.target];
    parents: for (var p = params.caller; p; p = p.$parent) {
      var url = p.getURL();
      if (url) {
        if (skip && p !== params.caller) {
          if (!isFinite(skip)) {                      // looking for `top` scope
            for (var pp = p; pp = pp.$parent;)
              if (pp.getURL())
                continue parents;
          } else {                                    // skipping scopes for `parent` and `grandparent`
            skip--;
          }
          continue;
        }
        G.Location.inherit(params, G.Location.parse(p), p !== params.caller)
      }
    }
  }

  return params;
}

G.Location.prototype.send = function(method) {
  var xhr = this.toXHR(method)
  xhr.send(this.data && this.data.toString());
  return xhr;
};

G.Location.prototype.push = function(location) {
  if (!(location instanceof G.Location))
    location = new G.Location(location);
  return G.Object.prototype.push.apply(this, arguments);
}

G.Location.prototype.match = function(input, cursor, params) {
  var url = input.url || input;

  var start = cursor || 0;
  var length = url.length;
  if (url.charAt(start) == '/')
    start++;

  // extract one level of path
  var end = start;
  loop: while (end < length) {
    switch (url.charAt(end)) {
      case '/': case '?': case '#': case '&':
        break loop;
      default:
        end++;
    }
  }

  if (end !== start) {
    var path = url.substring(start, end);
    var location = this[path];
    if (location) {                                   // if resource matched by name
      if (url.charAt(end) != '/' && typeof location == 'function') {
        var result = Object.create(this)
        result.action = path;
        if (params)
          for (var param in params)
            result[param] = params[param]
      }
    } else if (this.key) {
      if (url.charAt(end) != '/') {         // interpret file name as id
        var result = Object.create(this)
        result.id = path;
        if (params)
          for (var param in params)
            result[param] = params[param]
        return result;
      } else {                                  // interpret next level of path as parent id
        if (url.indexOf('/', end + 1) > -1)
          (params || (params = {}))[this.key] = path
        else
          (params || (params = {})).id = path
      }
    }
    if (end !== length)
      return (location || this).match(input, end + 1, params)

    return result || location || this;
  }
}

G.Location.prototype.navigate = function() {
  if (this.needsNavigation(G.history))                // 1. Location is on another page
    G.push(G, 'history', this);                       //    Push new location into history
  else                                                // 2. Location is on the same page
    G.history.merge(this)                             //    Modify current location 
}        

G.Location.prototype.needsNavigation = function(old) {
  if (!old)                                           // 1. Initial page loaded
    return true;
  if (old.path != this.path)                          // 2. Going to another page
    return true;   
  if (old.domain != this.domain)                      // 3. Going to another site
    return true;   
}

G.Location.targets = {
  'self': 0,
  'parent': 1,
  'grandparent': 2,
  'top': Infinity
}

// Parse href into intermediate data representation
G.Location.parse = function(input, prefix) {
  if (input instanceof G.Node)
    var caller = input;
  var method = input.method;
  var target = input.target;
  var action = G.Node.prototype.getURL.call(input);    // 1. Parse location/node object
  if (action) 
    var href = action.valueOf();                       //    use href property of location
  else if (typeof input.valueOf() != 'object')
    var href = input;
  else if (input.query && !input.params)              // 2. only parse query, re-use other properties
    var href = '?' + input.query
  
  if (typeof href === 'string') {                     // 3. Parse url string
    var hash = href.indexOf('#');                     // process fragment
    if (hash > -1) {
      var fragment = decodeURIComponent(href.substring(hash + 1));
      href = href.substring(0, hash);
    }
    var question = href.indexOf('?');                 // process raw query string
    if (question > -1) {
      var url = href.substring(0, question);
      var query = href.substring(question + 1);
    } else {
      var ampersand = href.indexOf('&');
      if (ampersand > -1) {
        var url = href.substring(0, ampersand);
        var query = href.substring(ampersand + 1);
      } else {
        var url = href;
      }
    }
    var slashes = url.indexOf('//');                  // process absolute urls
    if (slashes > -1) {
      if (slashes > 0) {
        var schema = url.substring(0, slashes - 1);
      }
      var slash = url.indexOf('/', slashes + 2);
      if (slash > -1) {
        var domain = url.substring(slashes + 2, slash);
        if (slash > 0)
          var path = decodeURIComponent(url.substring(slash));
      } else {
        var domain = url.substring(slashes + 2);
      }
    } else if (url.length) {
      var path = decodeURIComponent(url);
    }
    if (query) {                                      // keep composite keys in query string unparsed
      var pairs = query.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var eql = pairs[i].indexOf('=');
        if (!params)
          var params = {};
        if (eql > -1) {
          var key = decodeURIComponent(pairs[i].substring(0, eql));
          var value = decodeURIComponent(pairs[i].substring(eql + 1));
          if (key.match(/\[\]$/)) {
            if (!params[key]) 
              params[key] = []
            params[key].push(value)
          } else {
            params[key] = value;
          }
        } else {
          var prop = decodeURIComponent(pairs[i]);
          params[prop] = G.compile.toggler(prop)
        }
      }
    }
  }
  if (prefix) {
    if (path)
      path = prefix + '/' + path;
    else
      path = prefix;
  } 
  var result = {
    caller: caller,
    target: target,
    method: method,
    schema: schema,
    domain: domain,
    path: path,
    params: params,
    fragment: fragment
  };


  if (!caller && typeof input.valueOf() == 'object') {// parse and rebase nested locations
    for (var property in input) {
      if (input[property] == null)
        continue;
      if (typeof input[property] == 'object') {
        var prefix = input.key ? ':' + input.key + '/' + property : property;
        result[property] =  G.Location.rebase(
                              G.Location.parse(input[property], prefix), 
                            result);
      } else {
        result[property] = input[property];
      }
    }
  }
  return result;
}

G.Location.serialize = function(input, params) {
  var url = ''
  if (input.domain) {
    if (input.schema)
      url += input.schema + '://' + input.domain
    else
      url += '//' + input.domain
  }
  if (input.path) {
    if (url && input.path.charAt(0) != '/')
      url += '/' + input.path
    else
      url += input.path
  }
  if (input.id) {
    if (url && url.charAt(url.length - 1) != '/')
      url += '/' + input.id
    else
      url += input.id
  }
  if (input.action) {
    if (url && url.charAt(url.length - 1) != '/')
      url += '/' + input.action
    else
      url += input.action
  }
  if (input.params) {
    url += '?' + input.params.toString();
  } else if (input.query) {
    url += '?' + input.query;
  }
  if (input.fragment) {
    url += '#' + input.fragment;
  }
  return url.replace(/:([a-z0-9_-]+)/g, function(m, property) {
    if (params && params[property] != null)
      return params[property];
    if (input && input[property] != null)
      return input[property];
    return m;
  });
}

G.Location.prototype.fetch = function() {
  
}

G.Location.prototype.execute = function() {
  if (this.action) {
    var argv = this[this.action].length;
    if (argv) {                                       // 1. explicit action over fetched data  
      // todo async
      this.args = [];
      var parent = this;
      for (var i = 0; i < argv; i++) {
        var loc = parent === this ? this : parent.match(this[parent.key])
        this.args[i] = loc.fetch()
        parent = parent.$context
      }
      return this[this.action].apply(this, this.args)
    } else {                                          // 2. shallow action over raw URL params
      return this[this.action]()
    }
  } else if (!this.method || this.method == 'get') {  // 3. implicit fetch action
    return this.fetch();
  }
}
G.Location.prototype.toString = function(params) {
  return G.Location.serialize(this, params);
}

G.Location.prototype.onChange = function(key, value, old) {
  if (G.Location.callbacks[key])
    G.Location.callbacks[key].call(this, value, old);
}

G.Location.callbacks = {
  inputs: function(value, old) {

  }
}

G.Location.prototype.constructors = {
  params: G.Data
}
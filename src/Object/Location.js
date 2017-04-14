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

todo:
  - uid:      Unique identification of current user
  - storage:  Model data stored for offline use
  - session:  Data shared within browsing session
*/
G.Location = function(url, base) {
  if (this instanceof G.Location) {                   // 1. Creating new location
    this.merge(
      G.Location.rebase(                              // Parse and rebase URL
        G.Location.parse(url), 
      base));         
  } else {                                            // 
    return (new G.Location(url)).navigate(base);      // 2. Navigate to new location
  }
};

G.Location.prototype = new G.Data;

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
G.Location.rebase = function(params, base) {
  if (params.caller && (params.target || !params.domain)) {
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
  if (base)
    G.Location.inherit(params, base);

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
G.Location.parse = function(href) {
  if (href instanceof G.Node)
    var caller = href;
  var method = href.method;
  var target = href.target;
  var action = G.Node.prototype.getURL.call(href);    // 1. Parse location/node object
  if (action) href = action;                          //    use href property of location

  
  if (href.query && !href.params) {                   // 2. only parse query, re-use other properties
    var schema = href.schema
    var domain = href.domain
    var path   = href.path
    var params = href.params
    href = '?' + href.query
  }
  
  href = href.valueOf();

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
  return {
    caller:   caller,
    target:   target,
    method:   method,
    
    schema:   schema,
    domain:   domain,
    path:     path,
    params:   params,
    fragment: fragment
  }
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
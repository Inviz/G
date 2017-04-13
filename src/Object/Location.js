// Location encapsulate browsing state of a single user on a single page.
// and is accessible as `G.location` global variable. 
// Location objects are doubly linked into navigation history.

// It consists of:
//   - inputs:   Side effects induced by user 
//               e.g. clicking elements, filling forms
// todo:
//   - location: Representation of an URL
//   - uid:      Unique identification of current user
//   - storage?:  stored local data

G.Location = function(url) {
  G.unbox(this, G.Location.parse(url))

  if (this.needsNavigation(G.location))
    G.push(G, 'location', this);                        // Register new location
};

G.Location.prototype = new G;

G.Location.prototype.needsNavigation = function(old) {
  if (!old)                                           // 1. Initial page loaded
    return true;
  if (old.path != this.path)                          // 2. Going to another page
    return true;   
  if (old.domain != this.domain)                      // 3. Going to another site
    return true;   
}

// parse url
G.Location.parse = function(href) {
  if (href.href)
    href = href.href;
  if (typeof href === 'string') {
    var hash = href.indexOf('#');
    if (hash > -1) {
      var fragment = href.substring(hash + 1);
      href = href.substring(0, hash);
    }
    var question = href.indexOf('?');
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
    var slashes = url.indexOf('//');
    if (slashes > -1) {
      if (slashes > 0) {
        var schema = url.substring(0, slashes - 1);
      }
      var slash = url.indexOf('/', slashes + 2);
      if (slash > -1) {
        var domain = url.substring(slashes + 2, slash);
        if (slash > 0)
          var path = url.substring(slash);
      } else {
        var domain = url.substring(slashes + 2);
      }
    } else if (url.length) {
      var path = url;
    }
    return {
      schema: schema,
      domain: domain,
      path: path,
      query: query,
      fragment: fragment
    }
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

new G.Location(location);
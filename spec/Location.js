describe('G.Location', function() {
  describe('Parsing', function() {
    it ('should parse complex url', function() {
      var url = new G.Location('http://google.com');
      expect(url.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com'}))
    })
    it ('should parse domain', function() {
      var url = new G.Location('http://google.com');
      expect(url.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com'}))
    })
    it ('should parse domain with path', function() {
      var url = new G.Location('http://google.com/addd/b');
      expect(url.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com', path: '/addd/b'}))
    })
    it ('should parse absolute path', function() {
      var url = new G.Location('/addd/b');
      expect(url.stringify()).to.eql(G.stringify({path: '/addd/b'}))
    })
    it ('should parse relative path', function() {
      var url = new G.Location('addd');
      expect(url.stringify()).to.eql(G.stringify({path: 'addd'}))
    })
    it ('should parse query', function() {
      var url = new G.Location('?addd');
      expect(url.stringify()).to.eql(G.stringify({query: 'addd'}))
    })
    it ('should parse query continuation', function() {
      var url = new G.Location('&addd');
      expect(url.stringify()).to.eql(G.stringify({query: 'addd'}))
    })
    it ('should parse fragment', function() {
      var url = new G.Location('#addd');
      expect(url.stringify()).to.eql(G.stringify({fragment: 'addd'}))
    })
    it ('should parse relative schema', function() {
      var url = new G.Location('//a/b');
      expect(url.stringify()).to.eql(G.stringify({domain: 'a', path: '/b'}))
    })
  })


})
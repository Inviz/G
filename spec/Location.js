describe('G.Location', function() {
  describe('URL', function() {
    it ('should parse complex url', function() {
      var url = new G.Location('http://google.com');
      expect(url.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com'}))
    })
    it ('should parse domain', function() {
      var url = new G.Location('http://google.com');
      expect(url.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com'}))
    })
    it ('should parse domain with path', function() {
      var url = new G.Location('http://google.com/ad%20dd/b');
      expect(url.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com', path: '/ad dd/b'}))
    })
    it ('should parse absolute path', function() {
      var url = new G.Location('/ad%20dd/b');
      expect(url.stringify()).to.eql(G.stringify({path: '/ad dd/b'}))
    })
    it ('should parse relative path', function() {
      var url = new G.Location('addd');
      expect(url.stringify()).to.eql(G.stringify({path: 'addd'}))
    })
    it ('should parse query', function() {
      var url = new G.Location('?ad%20dd');
      expect(url.stringify()).to.eql(G.stringify({params: {'ad dd': true}}))
    })
    it ('should parse query continuation', function() {
      var url = new G.Location('&ad%20dd');
      expect(url.stringify()).to.eql(G.stringify({params: {'ad dd': true}}))
    })
    it ('should parse fragment', function() {
      var url = new G.Location('#addd%20yes');
      expect(url.stringify()).to.eql(G.stringify({fragment: 'addd yes'}))
    })
    it ('should parse relative schema', function() {
      var url = new G.Location('//a/b');
      expect(url.stringify()).to.eql(G.stringify({domain: 'a', path: '/b'}))
    })
  })
  describe('Query String', function() {
    it ('should parse query k/v pair', function() {
      var url = new G.Location('?hello=world');
      expect(url.stringify()).to.eql(G.stringify({params: {hello: 'world'}}))
    })
    it ('should parse array-like k/v pair', function() {
      var url = new G.Location('?hello[]=world&hello[]=мир');
      expect(url.stringify()).to.eql(G.stringify({
        params: {
          'hello[]': ['world', 'мир'], 
          hello: ['world', 'мир']
        }}))
    })
    it ('should parse structured k/v pairs', function() {
      var url = new G.Location('?person[name]=yaro&person[title]=author');
      expect(url.stringify()).to.eql(G.stringify({
        params: {
          'person[name]': 'yaro', 
          person: {
            name: 'yaro', 
            title: 'author'
          }, 
          'person[title]': 'author'
        }}))
    })
    it ('should parse indexed k/v pairs', function() {
      var url = new G.Location('?person[0][name]=yaro&person[0][title]=author&person[2][name]=john&person[2][title]=the%20revelator');
      expect(url.stringify()).to.eql(G.stringify({
        params: {
          'person[0][name]': 'yaro', 
          person: [
            {name: 'yaro', title: 'author'}, 
            {name: 'john', title: 'the revelator'}
          ], 
          'person[0][title]': 'author', 
          'person[2][name]': 'john', 
          'person[2][title]': 'the revelator'}}))
    })
  })
  describe('Sending', function() {
    it ('should create xhr object', function() {
      var location = new G.Location('');
      var xhr = location.toXHR();
      if (xhr) {
        expect(xhr.url).to.eql('');
        expect(xhr.method).to.eql('get');
      }
    })

    it ('should serialize query', function() {
      var location = new G.Location('');
      location.merge('params', {hello: 'world'})
      var xhr = location.toXHR();
      if (xhr) {
        expect(xhr.url).to.eql('?hello=world');
        expect(xhr.method).to.eql('get');
      }
    })

    it ('should serialize multiple k/v pairs', function() {
      var location = new G.Location('');
      location.merge('params', {hello: 'world'})
      location.merge('params', {bye: 'zogg'})
      var xhr = location.toXHR();
      if (xhr) {
        expect(xhr.url).to.eql('?hello=world&bye=zogg');
        expect(xhr.method).to.eql('get');
      }
    })

    it ('should serialize array-like k/v pairs', function() {
      var location = new G.Location('');
      location.merge('params', {hello: ['world', 'zogg']})
      var xhr = location.toXHR();
      if (xhr) {
        expect(xhr.url).to.eql('?hello[]=world&hello[]=zogg');
        expect(xhr.method).to.eql('get');
      }
    })

    it ('should serialize array-like indexed k/v pairs', function() {
      var location = new G.Location('');
      location.merge('params', {
        person: [
          {name: 'yaro', title: 'author'}, 
          {name: 'john', title: 'the revelator'}
        ]
      })
      var xhr = location.toXHR();
      if (xhr) {
        expect(xhr.url).to.eql('?person[0][name]=yaro&person[0][title]=author&person[1][name]=john&person[1][title]=the%20revelator');
        expect(xhr.method).to.eql('get');
      }
    })
  });

  describe('Creating', function() {
    it('should merge locations', function() {
      var root = new G.Location('/root')
      var location = new G.Location('path', root);

      expect(location.stringify()).to.eql(G.stringify({path: '/root/path'}));
    })
    it('should merge absolute locations', function() {
      var root = new G.Location('http://google.com/root')
      var location = new G.Location('/path', root);

      expect(location.stringify()).to.eql(G.stringify({schema: 'http', domain: 'google.com', path: '/path'}));
    })
    it ('should generate from relative link', function() {
      var node = new G.Node('a', {href: 'abc', method: 'put'});
      var location = new G.Location(node)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: node,
        method: 'put',
        path:   'abc'
      }))
    })
    it ('should generate from relative link in body', function() {
      var node = new G.Node('a', {href: 'abc', method: 'put'});
      var body = new G.Node('body', {basepath: 'ftp://google.com'}, node);
      var location = new G.Location(node)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: node,
        method: 'put',
        schema: 'ftp',
        domain: 'google.com',
        path:   'abc'
      }))
    })

    it ('should generate from form', function() {
      var node =  new G.Node('form', {action: 'http://abc.com/abc', method: 'put'}, 
                    new G.Node('input', {'name': 'field', 'value': 'value'}));
      var location = new G.Location(node)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: node,
        method: 'put',
        schema: 'http',
        domain: 'abc.com',
        path:   '/abc'
      }))
    })
    it ('should generate from link within form', function() {
      var link = new G.Node('a', {'href': 'def', target: 'self'})
      var node =  new G.Node('form', {action: 'http://abc.com/abc', method: 'put'}, link);
      var location = new G.Location(link)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: link,
        target: 'self',
        method: 'put',
        schema: 'http',
        domain: 'abc.com',
        path:   '/abc/def'
      }))
    })
    it ('should generate from link within form in body', function() {
      var link = new G.Node('a', {'href': 'def', target: 'self'})
      var node =  new G.Node('body', {basepath: 'http://google.com/test'},
                    new G.Node('form', {action: 'abc', method: 'put'}, link));
      var location = new G.Location(link)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: link,
        target: 'self',
        method: 'put',
        schema: 'http',
        domain: 'google.com',
        path:   '/test/abc/def'
      }))
    })
    it ('should generate from absolute link within form', function() {
      var link = new G.Node('a', {'href': '/def', target: 'self'})
      var node =  new G.Node('form', {action: 'http://abc.com/abc', method: 'put'}, link);
      var location = new G.Location(link)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: link,
        target: 'self',
        method: 'put',
        schema: 'http',
        domain: 'abc.com',
        path:   '/def'
      }))
    })
    it ('should generate from external link within form', function() {
      var link = new G.Node('a', {'href': '//google.com/def', target: 'self'})
      var node =  new G.Node('form', {action: 'https://abc.com/abc', method: 'put'}, link);
      var location = new G.Location(link)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: link,
        target: 'self',
        method: 'put',
        schema: 'https',
        domain: 'google.com',
        path:   '/def'
      }))
    })
    it ('should generate link to top scope', function() {
      var link = new G.Node('a', {'href': 'def', target: 'parent'})
      var node =  new G.Node('form', {action: 'http://abc.com/abc', method: 'put'}, link);
      var location = new G.Location(link)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: link,
        target: 'parent',
        path:   'def'
      }))
    })

    it ('should generate from microdata scope', function() {
      var node =  new G.Node('div', {
        itemscope: true,
        itemtype: 'http://abc.com/abc',
        itemid: '123'}, 
          new G.Node('div', {'itemprop': 'field'}, 'value'));
      var location = new G.Location(node)
      
      expect(location.stringify()).to.eql(G.stringify({
        caller: node,
        schema: 'http',
        domain: 'abc.com',
        path:   '/abc/123'
      }))
    })
  })

  describe('Routing', function() {
    it ('should match urls to locations', function() {
      var location = new G.Location({
        people: {
          key: 'project_id',
          show: function() {
            return - parseInt(this.id);
          }
        }
      })
      expect(location.toString()).to.eql('');
      expect(location.people.toString()).to.eql('people');
      var route = location.match('/people/123/show');
      expect(route.stringify()).to.eql(G.stringify({"action":"show","id":"123"}));
      expect(route.toString()).to.eql('people/123/show');
      expect(route.execute()).to.eql(-123)

      var partial = location.people.match('123/show');
      expect(partial.stringify()).to.eql(G.stringify({"action":"show","id":"123"}));
      expect(partial.toString()).to.eql('people/123/show');
      expect(partial.execute()).to.eql(-123)
    })

    it ('should match locations to nested routes', function() {
      var location = new G.Location({
        projects: {
          key: 'project_id',
          people: {
            key: 'person_id',
            show: function() {
              return - parseInt(this.id);
            }
          }
        }
      })
      expect(location.toString()).to.eql('');
      expect(location.projects.toString()).to.eql('projects');
      expect(location.projects.people.toString()).to.eql('projects/:project_id/people');
      expect(location.projects.people.toString({project_id: 333})).to.eql('projects/333/people');

      var route = location.match('/projects/123/people/321/show');
      expect(route.stringify()).to.eql(G.stringify({"action":"show","project_id": "123", "id":"321"}));
      expect(route.toString()).to.eql('projects/123/people/321/show');

      expect(route.execute()).to.eql(-321)
    })

    it ('should execute implicit actions', function() {
      var location = new G.Location({
        people: {
          key: 'project_id',
          fetch: function() {
            return {id: this.id, title: 'Hello'}
          },
          custom_action: function(person) {
            return {id: this.id, title: person.title, displayed: true}
          },
          shallow_action: function() {
            return {id: this.id}
          }
        }
      })
      expect(location.toString()).to.eql('');
      expect(location.people.toString()).to.eql('people');

      var route = location.match('/people/123');
      expect(route.stringify()).to.eql(G.stringify({"id":"123"}));
      expect(route.toString()).to.eql('people/123');
      expect(route.execute()).to.eql({id: '123', title: 'Hello'})

      var route = location.match('/people/123/custom_action');
      expect(route.stringify()).to.eql(G.stringify({action: 'custom_action', "id":"123"}));
      expect(route.toString()).to.eql('people/123/custom_action');
      expect(route.execute()).to.eql({id: '123', title: 'Hello', displayed: true})

      var route = location.match('/people/123/shallow_action');
      expect(route.stringify()).to.eql(G.stringify({action: 'shallow_action', "id":"123"}));
      expect(route.toString()).to.eql('people/123/shallow_action');
      expect(route.execute()).to.eql({id: '123'})

    })

    it ('should execute nested implicit actions', function() {
      var location = new G.Location({
        projects: {
          key: 'project_id',
          fetch: function() {
            return {id: this.id, title: 'Goodbye'}
          },
          people: {
            key: 'person_id',
            fetch: function() {
              return {id: this.id, title: 'Hello'}
            },
            custom_action: function(person, project) {
              return {id: this.id, title: person.title, project: project}
            },
            shallow_action: function() {
              return {id: this.id}
            }
          }
        }
      })

      var route = location.match('/projects/333/people/123/custom_action');
      expect(G.stringify(route.execute())).to.eql(G.stringify({
        id: '123', 
        title: 'Hello', 
        project: {
          id: '333',
          title: 'Goodbye'
        }
      }))


    })

  })

  describe('Building', function() {
    it ('should render nodes', function() {
      var location = new G.Location({
        people: {
          key: 'project_id',
          fetch: function() {
            return {id: this.id, title: 'Hello'}
          }
        }
      })
      var route = location.match('/projects/333');
    })
  });


})

describe('G.watch', function() {
  it('should transform present values', function() {
    var callback, context;
    context = {
      key: 'test'
    };
    callback = function(value) {
      return value + 123;
    };
    G.watch(context, 'key', callback, true);
    expect(ValueStack(context.key)).to.eql([context.key]);
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', 'test123']));
    expect(context.key.valueOf()).to.eql('test123');
    G.unwatch(context, 'key', callback, true);
    expect(context.key.valueOf()).to.eql('test');
    expect(ValueStack(context.key)).to.eql([context.key]);


    return expect(StateGraph(context.key)).to.eql([context.key]);
  });
  it('should retransform value on redo', function() {
    var before, callback, context;
    context = {};
    G.set(context, 'key', 'test', 1);
    expect(context.key.valueOf()).to.eql('test');
    var before = G.set(context, 'key', 'pest', 2);
    expect(context.key.valueOf()).to.eql('pest');
    callback = function(value) {
      return value + 123;
    };
    G.watch(context, 'key', callback, true);
    expect(context.key.valueOf()).to.eql('pest123');
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test', 'pest123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['pest', 'pest123']));

    before.recall(2);
    expect(context.key.valueOf()).to.eql('test123');
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test123', 'pest123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', 'test123']));
    G.unwatch(context, 'key', callback, true);
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test', 'pest123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test']));
    before.call()
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test', 'pest']));
    return expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['pest']));
  });
  it('should transform preassigned values', function() {
    var callback, context;
    context = {};
    G.set(context, 'key', 'test');
    expect(context.key.valueOf()).to.eql('test');
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test']));
    callback = function(value) {
      return value + 123;
    };
    G.watch(context, 'key', callback, true);
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', 'test123']));
    expect(context.key.valueOf()).to.eql('test123');
    G.unwatch(context, 'key', callback, true);
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['test']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test']));
    return expect(context.key.valueOf()).to.eql('test');
  });
  it('should observe future value', function() {
    var context, op, op2;
    context = {
      context: true
    };
    G.watch(context, 'key', function(value) {
      return value + 123;
    }, true);
    op = G.set(context, 'key', 'value', 'meta1', 'scope');
    expect(context.key).to.eql(op);
    expect(context.key.valueOf()).to.eql('value123');
    expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'value123'
    }));
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123']));
    op2 = G.set(context, 'key', 'zalue', 'meta2', 'scope');
    expect(context.key).to.eql(op2);
    expect(context.key.valueOf()).to.eql('zalue123');
    expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'zalue123'
    }));
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value123', 'zalue123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue123']));
    G.recall(context.key, 'meta2', 'scope');
    expect(context.key).to.eql(op);
    expect(context.key.valueOf()).to.eql('value123');
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value123', 'zalue123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123']));
    expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'value123'
    }));
    G.recall(context.key, 'meta1', 'scope');
    expect(context.key).to.eql(void 0);

    G.call(op2);
    expect(context.key).to.eql(op2);
    expect(context.key.valueOf()).to.eql('zalue123');
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value123', 'zalue123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue123']));
    expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'zalue123'
    }));
    G.call(op);
    expect(context.key).to.eql(op);
    expect(context.key.valueOf()).to.eql('value123');
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value123', 'zalue123']));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123']));
    return expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'value123'
    }));
  });

  it ('should assign computed properties', function() {
    var context = new G;

    var Property = function() {
      return this.firstName + ' ' + this.lastName
    }

    G.define(context, 'fullName', Property, 'ololo')

    expect(context.fullName).to.eql(undefined)

    context.set('firstName', 'John')
    expect(context.fullName).to.eql(undefined)
    
    var lastName = context.set('lastName', 'Doe')
    expect(context.fullName.valueOf()).to.eql('John Doe')
    expect(context.fullName.$meta).to.eql(['ololo'])
    
    G.recall(lastName)
    expect(context.fullName).to.eql(undefined)
    
    G.call(lastName)
    expect(context.fullName.valueOf()).to.eql('John Doe')

    G.preset(context, 'fullName', 'Unknown', 'value by default')
    expect(context.fullName.valueOf()).to.eql('John Doe')
    G.recall(lastName)
    expect(context.fullName.valueOf()).to.eql('Unknown')
    
    G.call(lastName)
    expect(context.fullName.valueOf()).to.eql('John Doe')

    G.undefine(context, 'fullName', Property, 'ololo')
    expect(context.fullName.valueOf()).to.eql('Unknown')
    expect(context.$watchers).to.eql({
        firstName: undefined,
        lastName: undefined
    })

    //G.define.preset(context, 'fullName', Property)
  })
  it ('should assign computed properties that observe deep keys', function() {
    
    var called = 0;
    var Property = function() {
      return 'Story by' + ' ' + this.author.name.toUpperCase()
    }
    var post = new G();
    var author = post.set('author', {});

    post.define('title', Property);
    expect(post.title).to.eql(undefined)

    post.author.set('name', 'HP Lovecraft')
    expect(post.title.valueOf()).to.eql('Story by HP LOVECRAFT')
    
    post.author.name.recall()
    expect(post.title).to.eql(undefined)
    
    post.author.set('name', 'LN Tolstoy')
    expect(post.title.valueOf()).to.eql('Story by LN TOLSTOY')

    expect(author.$watchers).to.not.eql(undefined);
    expect(author.$watchers).to.not.eql({name: undefined});
    post.author.recall();
    expect(author.$watchers).to.eql({name: undefined});

    post.set('author', author);
    expect(post.title.valueOf()).to.eql('Story by LN TOLSTOY')
    expect(post.author).to.eql(author)

    post.preset('author', {name: 'Boka & Joka'}, 'music revolution')
    expect(author.$watchers).to.not.eql(undefined);
    expect(author.$watchers).to.not.eql({name: undefined});
    expect(post.title.valueOf()).to.eql('Story by LN TOLSTOY')
    expect(post.author).to.eql(author);

    post.author.uncall()
    var boka = post.author;
    expect(author.$watchers).to.eql({name: undefined});
    expect(boka.$watchers).to.not.eql(undefined);
    expect(boka.$watchers).to.not.eql({name: undefined});
    expect(post.title.valueOf()).to.eql('Story by BOKA & JOKA')
    expect(post.author).to.not.eql(author);

    author.call()
    expect(boka.$watchers).to.eql({name: undefined});
    expect(author.$watchers).to.not.eql(undefined);
    expect(author.$watchers).to.not.eql({name: undefined});
    expect(post.title.valueOf()).to.eql('Story by LN TOLSTOY')
    expect(post.author).to.eql(author);

    post.undefine('title', Property);
    expect(post.title).to.eql(undefined)
    expect(author.$watchers).to.eql({name: undefined});
    expect(boka.$watchers).to.eql({name: undefined});
    expect(post.$watchers).to.eql({author: undefined});

    post.define('title', Property);
    expect(boka.$watchers).to.eql({name: undefined});
    expect(author.$watchers).to.not.eql(undefined);
    expect(author.$watchers).to.not.eql({name: undefined});
    expect(post.title.valueOf()).to.eql('Story by LN TOLSTOY')
    expect(post.author).to.eql(author);
  })
  
  it ('should assign objects', function() {
    var post = new G();
    post.set('title', 'Hello world')
    var author = new G()
    author.set('name', 'George')
    author.set('pet', 'dog')
    var authorship = post.set('author', author, 123)
    expect(post.author).to.not.eql(author)


    expect(post.author.stringify()).to.eql(author.stringify())
    expect(post.author.name.valueOf()).to.eql('George')


    var defaults = new G({
      title: 'author',
      pet: 'hamster'
    })

    var placeholders = post.defaults('author', defaults, 'hola')
    expect(post.author.stringify()).to.not.eql(author.stringify())
    expect(post.author.stringify()).to.eql('{"name":"George","pet":"dog","title":"author"}')
    expect(G.stringify(ValueStack(post.author.pet))).to.eql(G.stringify(['hamster', 'dog']));

    author.pet.recall()
    expect(post.author.stringify()).to.eql('{"name":"George","pet":"hamster","title":"author"}')
    expect(G.stringify(ValueStack(post.author.pet))).to.eql(G.stringify(['hamster']));

    post.author.set('name', 'Vasya', 666)
    expect(post.author.name.valueOf()).to.eql('Vasya')

    expect(G.stringify(ValueStack(post.author.name))).to.eql(G.stringify(['George', 'Vasya']));
    expect(G.stringify(ValueStack(author.name))).to.eql(G.stringify(['George']));

    author.set('name', null)
    expect(G.stringify(ValueStack(post.author.name))).to.eql(G.stringify(['Vasya']));
    expect(author.name).to.eql(undefined);

    author.set('pet', 'bull')
    expect(G.stringify(ValueStack(post.author.pet))).to.eql(G.stringify(['hamster', 'bull']));

    defaults.set('pet', 'cat')
    expect(G.stringify(ValueStack(post.author.pet))).to.eql(G.stringify(['cat', 'bull']));

    authorship.uncall() // does NOT remove `pet`
    expect(G.stringify(ValueStack(post.author.name))).to.eql(G.stringify(['Vasya']));
    expect(G.stringify(ValueStack(post.author.pet))).to.eql(G.stringify(['cat', 'bull']));
    
    author.set('name', 'Borya', 123)
    expect(G.stringify(ValueStack(author.name))).to.eql(G.stringify(['Borya']));
    authorship.call('defaults')
    expect(G.stringify(ValueStack(post.author.name))).to.eql(G.stringify(['Borya', 'Vasya']));
    expect(G.stringify(ValueStack(post.author.pet))).to.eql(G.stringify(['cat', 'bull']));

    //post.author.set('author.name', 'Anonymous')


    //post['author.name'] = 'abc'



  })

});

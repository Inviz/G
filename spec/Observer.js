
describe('Observers', function() {
  describe('Transforming', function() {
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
  })

  describe('Computing', function() {

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
    
  })
  describe('Merging', function() {
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
  })

  describe('Iterating', function() {
    it('should track local property changes', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var loop = context.toys.forEach(function(toy) {
        toy.set('test', 123)
      })
      expect(Number(trex.test)).to.eql(123)
      expect(Number(doll.test)).to.eql(123)

      doll.uncall()
      expect(doll.test).to.eql(undefined)

      G.call(doll)
      expect(Number(doll.test)).to.eql(123)
    })


    it('should track global property changes', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var loop = context.toys.forEach(function(toy) {
        context.set('names', toy.name, toy) // values will stack because of unique toy meta
        context.set('test', 123)            // values will overwrite each other (todo: counter)
      })
      expect(Number(context.test)).to.eql(123)
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Doll']))

      doll.uncall()
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex']))
      expect(Number(context.test)).to.eql(123) // accidently correct behavior

      G.call(doll)
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Doll']))

      doll.set('name', 'Roll')
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Roll']))

      var ship = context.push('toys', {name: 'Starship'})

      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Roll', 'Starship']))
      
      doll.set('name', 'Ball')
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Ball', 'Starship']))
      
      ship.uncall();

      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Ball']))

      ship.set('name', 'Boat')
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Ball']))

      ship.call()
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Ball', 'Boat']))

      doll.set('name', 'Mall')
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Mall', 'Boat']))

      ship.set('name', 'Boaty McBoatFace')
      expect(G.stringify(ValueStack(context.names))).to.eql(G.stringify(['T-Rex', 'Mall', 'Boaty McBoatFace']))

    })


    it('should track global array changes', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var loop = context.toys.forEach(function(toy) {
        context.push('names', toy.name, toy) // values will stack because of unique toy meta
        context.set('test', 123)            // values will overwrite each other (todo: counter)
      })
      expect(Number(context.test)).to.eql(123)
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Doll']))
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Doll'}, 'Doll', 123]))

      doll.uncall()
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex']))
      expect(context.test).to.eql() // bad behavior
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Doll'}, 'Doll', 123]))

      G.call(doll)
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Doll']))
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Doll'}, 'Doll', 123]))

      doll.set('name', 'Roll')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Roll']))
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Roll'}, 'Roll', 123]))

      var ship = context.push('toys', {name: 'Starship'})

      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Roll'}, 'Roll']))
      expect(G.stringify(StateGraph(ship))).to.eql(G.stringify([{name: 'Starship'}, 'Starship', 123]))
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Roll', 'Starship']))
      
      doll.set('name', 'Ball')
      expect(ValueGroup(context.toys)).to.eql([trex, doll, ship])
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball', 'Starship']))
      
      ship.uncall();
      expect(ValueGroup(context.toys)).to.eql([trex, doll])
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball']))

      ship.set('name', 'Boat')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball']))

      ship.call()
      expect(ValueGroup(context.toys)).to.eql([trex, doll, ship])
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball', 'Boat']))

      doll.set('name', 'Mall')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Mall', 'Boat']))

      ship.set('name', 'Boaty McBoatFace')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Mall', 'Boaty McBoatFace']))

    })


    it('should track global array changes with unshift', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var loop = context.toys.forEach(function(toy) {
        context.unshift('names', toy.name, toy) // values will stack because of unique toy meta
        context.set('test', 123)            // values will overwrite each other (todo: counter)
      })
      expect(Number(context.test)).to.eql(123)
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Doll', 'T-Rex']))
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Doll'}, 'Doll', 123]))

      doll.uncall()
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex']))
      expect(context.test).to.eql(undefined) // bad behavior
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Doll'}, 'Doll', 123]))

      G.call(doll)
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Doll', 'T-Rex']))
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Doll'}, 'Doll', 123]))

      doll.set('name', 'Roll')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Roll', 'T-Rex']))
      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Roll'}, 'Roll', 123]))

      var ship = context.push('toys', {name: 'Starship'})

      expect(G.stringify(StateGraph(trex))).to.eql(G.stringify([{name: 'T-Rex', price: 195.99}, 'T-Rex']))
      expect(G.stringify(StateGraph(doll))).to.eql(G.stringify([{name: 'Roll'}, 'Roll']))
      expect(G.stringify(StateGraph(ship))).to.eql(G.stringify([{name: 'Starship'}, 'Starship', 123]))
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Starship', 'Roll', 'T-Rex']))
      
      doll.set('name', 'Ball')
      expect(ValueGroup(context.toys)).to.eql([trex, doll, ship])
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Starship', 'Ball', 'T-Rex']))
      
      ship.uncall();
      expect(ValueGroup(context.toys)).to.eql([trex, doll])
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Ball', 'T-Rex']))

      ship.set('name', 'Boat')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Ball', 'T-Rex']))

      ship.call()
      expect(ValueGroup(context.toys)).to.eql([trex, doll, ship])
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Boat', 'Ball', 'T-Rex']))

      doll.set('name', 'Mall')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Boat', 'Mall', 'T-Rex']))

      ship.set('name', 'Boaty McBoatFace')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['Boaty McBoatFace', 'Mall', 'T-Rex']))

    })

    it('should track condition after property change', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var product = new G({
        price: 95.99,
        description: 'Serious toy'
      })
      trex.preset('price', product.price, 'deflt')
      trex.preset('description', product.description, 'deflt')
      doll.preset('price', product.price, 'deflt')
      doll.preset('description', product.description, 'deflt')
      var loop = context.toys.forEach(function(toy) {
        context.set('names', toy.name, toy) // values will stack because of unique toy meta
        toy.set('body', toy.name + '\n' + toy.description)
        if (toy.price > 100)
          toy.set('expensive', true)
      })

      expect(String(trex.description)).to.eql('Serious toy')
      expect(Number(trex.price)).to.eql(195.99)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(doll.description)).to.eql('Serious toy')

      var price = G.uncall(trex.price)
      expect((trex.expensive)).to.eql(undefined)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')

      G.call(price)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')

      G.uncall(price)
      expect((trex.expensive)).to.eql(undefined)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')

      context.push('toys', {name: 'Starship', description: 'Dull uninteresting piece of space aviation'})
      
    })

    it('should track condition before property change', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var product = new G({
        price: 95.99,
        description: 'Serious toy'
      })
      trex.preset('price', product.price, 'deflt')
      trex.preset('description', product.description, 'deflt')
      doll.preset('price', product.price, 'deflt')
      doll.preset('description', product.description, 'deflt')
      var loop = context.toys.forEach(function(toy) {
        if (toy.price > 100)
          toy.set('expensive', true)
        toy.set('body', toy.name + '\n' + toy.description)
      })

      expect(String(trex.description)).to.eql('Serious toy')
      expect(Number(trex.price)).to.eql(195.99)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(doll.description)).to.eql('Serious toy')

      var price = G.uncall(trex.price)
      expect((trex.expensive)).to.eql(undefined)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')

      G.call(price)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')

      G.uncall(price)
      expect((trex.expensive)).to.eql(undefined)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')

      context.push('toys', {name: 'Starship', description: 'Dull uninteresting piece of space aviation'})
      
    })


    it('should track condition between property change', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var product = new G({
        price: 95.99,
        description: 'Serious toy',
        //content: function() {
        //  return this.title + 'for $' + this.price
        //}
      })
      trex.preset('price', product.price, 'deflt')
      trex.preset('description', product.description, 'deflt')
      doll.preset('price', product.price, 'deflt')
      doll.preset('description', product.description, 'deflt')
      var loop = context.toys.forEach(function(toy) {
        toy.set('zody', toy.name + '\n' + toy.description)
        if (toy.price > 100)
          toy.set('expensive', true)
        toy.set('body', toy.name + '\n' + toy.description)
      })

      expect(String(trex.description)).to.eql('Serious toy')
      expect(Number(trex.price)).to.eql(195.99)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(doll.description)).to.eql('Serious toy')


      var price = G.uncall(trex.price)
      expect((trex.expensive)).to.eql(undefined)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')
      expect(String(trex.zody)).to.eql('T-Rex\nSerious toy')

      G.call(price)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')
      expect(String(trex.zody)).to.eql('T-Rex\nSerious toy')

      G.uncall(price)
      expect((trex.expensive)).to.eql(undefined)
      expect(String(trex.body)).to.eql('T-Rex\nSerious toy')
      expect(String(trex.zody)).to.eql('T-Rex\nSerious toy')


      context.push('toys', {name: 'Starship', description: 'Dull uninteresting piece of space aviation'})
      
    })

    xit('should create empty array (self changing callback)', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var product = new G({
        price: 95.99,
        description: 'Serious toy',
        //content: function() {
        //  return this.title + 'for $' + this.price
        //}
      })
      var transaction = G.transact()
      var loop = context.toys.forEach(function(toy) {
        debugger
        toy.preset('price', product.price, 'deflt')
        toy.preset('description', product.description, 'deflt')
        if (toy.price > 100)
          toy.set('expensive', true)
      })

      expect(String(trex.description)).to.eql('Serious toy')
      expect(Number(trex.price)).to.eql(195.99)
      expect(Boolean(trex.expensive)).to.eql(true)
      expect(String(doll.description)).to.eql('Serious toy')

      G.uncall(trex.price)
      expect(Boolean(trex.expensive)).to.eql(false)



      context.push('toys', {name: 'Starship', description: 'Dull uninteresting piece of space aviation'})
      
    })
})
});

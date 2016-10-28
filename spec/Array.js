(function() {
  afterEach(function() {
    G.$caller = null;
  })

  describe('G.Array', function() {
    it('should unroll local property changes', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var loop = context.toys.forEach(function(toy) {
        toy.set('test', 123)
      })
      expect(Number(trex.test)).to.eql(123)
      expect(Number(doll.test)).to.eql(123)

      doll.recall()
      expect(doll.test).to.eql(undefined)

      G.call(doll)
      expect(Number(doll.test)).to.eql(123)
    })


    it('should unroll global property changes', function() {
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


    it('should unroll global array changes', function() {
      var context = new G;
      var trex = context.push('toys', {name: 'T-Rex', price: 195.99});
      var doll = context.push('toys', {name: 'Doll'});
      var loop = context.toys.forEach(function(toy) {
        context.push('names', toy.name, toy) // values will stack because of unique toy meta
        context.set('test', 123)            // values will overwrite each other (todo: counter)
      })
      expect(Number(context.test)).to.eql(123)
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Doll']))

      doll.uncall()
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex']))
      expect(Number(context.test)).to.eql(123) // accidently correct behavior

      G.call(doll)
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Doll']))

      doll.set('name', 'Roll')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Roll']))

      var ship = context.push('toys', {name: 'Starship'})

      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Roll', 'Starship']))
      
      doll.set('name', 'Ball')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball', 'Starship']))
      
      ship.uncall();

      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball']))

      ship.set('name', 'Boat')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball']))

      ship.call()
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Ball', 'Boat']))

      doll.set('name', 'Mall')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Mall', 'Boat']))

      ship.set('name', 'Boaty McBoatFace')
      expect(G.stringify(ValueGroup(context.names))).to.eql(G.stringify(['T-Rex', 'Mall', 'Boaty McBoatFace']))

    })
    it('should unroll condition after property change', function() {
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

    it('should unroll condition before property change', function() {
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


    it('should unroll condition between property change', function() {
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
    it('#push', function() {
      return it('should add items on top of the stack', function() {
        var context;
        context = {};
        G.push(context, 'key', 'value1', 'meta1', 'scope1');
        G.push(context, 'key', 'value2', 'meta2', 'scope2');
        expect(context.key.valueOf()).to.eql('value2');
        expect(context.key.$previous.valueOf()).to.eql('value1');
        return expect(context.key.$previous.$next.valueOf()).to.eql('value2');
      });
    });
    it('#unshift', function() {
      return it('should add items on bottom of the stack', function() {
        var context;
        context = {};
        G.unshift(context, 'key', 'value1', 'meta1', 'scope1');
        G.unshift(context, 'key', 'value2', 'meta2', 'scope2');
        expect(context.key.valueOf()).to.eql('value1');
        expect(context.key.$previous.valueOf()).to.eql('value2');
        return expect(context.key.$previous.$next.valueOf()).to.eql('value1');
      });
    });
    it('#recall', function() {
      return it('should remove value, keep links', function() {
        var context, head;
        context = {};
        G.push(context, 'key', 'value1', 'meta1', 'scope1');
        head = G.push(context, 'key', 'value2', 'meta2', 'scope2');
        G.recall(head);
        expect(context.key).to.eql(void 0);
        expect(head.valueOf()).to.eql('value2');
        expect(head.$previous.valueOf()).to.eql('value1');
        return expect(head.$previous.$next.valueOf()).to.eql('value2');
      });
    });
    return it('#call', function() {
      return it('should bring back value, keep links', function() {
        var context, head;
        context = {};
        G.push(context, 'key', 'value1', 'meta1', 'scope1');
        head = G.push(context, 'key', 'value2', 'meta2', 'scope2');
        G.recall(head);
        G.call(head);
        expect(context.key).to.eql(head);
        expect(head.valueOf()).to.eql('value2');
        expect(head.$previous.valueOf()).to.eql('value1');
        return expect(head.$previous.$next.valueOf()).to.eql('value2');
      });
    });
  });

}).call(this);


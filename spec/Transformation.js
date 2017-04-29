describe('Transformation', function() {
  describe('Generation', function() {

    it ('should generate number assigment operation', function() {
      var object = new G;
      G.transformation.transact(object);
      object.set('key', 123);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
          new jot.PUT('key', 123)
      ]).simplify().serialize())
    })
    
    it ('should generate string assigment operation', function() {
      var object = new G;
      G.transformation.transact(object);
      object.set('key', 'Test');
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.PUT('key', 'Test')
      ]).simplify().serialize())
    })

    it ('should generate object operation', function() {
      var object = new G;
      G.transformation.transact(object);
      object.set('key', {});
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.PUT('key', {})
      ]).simplify().serialize())
    })

    it ('should simplify multiple assigment operations', function() {
      var object = new G;
      G.transformation.transact(object);
      object.set('key', 123);
      object.set('key', 333);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.PUT('key', 333)
      ]).simplify().serialize())
    })

    it ('should obliterate assigment/deassignment pairs', function() {
      var object = new G;
      G.transformation.transact(object);
      object.set('key', 123);
      object.key.uncall();
      expect(G.$operations.ops.length).to.eql(2)
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.NO_OP().serialize())
    })
    it ('should obliterate assigment/deassignment pairs within G transaction, not visible by jot', function() {
      var object = new G;
      G.transformation.transact(object);
      G.effects.transact();
      object.set('key', 123);
      object.key.uncall();
      G.effects.commit();
      expect(G.$operations.ops.length).to.eql(0)
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.NO_OP().serialize())
    })

    it ('should generate reassigment operation', function() {
      var object = new G({key: 321});
      G.transformation.transact(object);
      object.set('key', 123);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('key', 
          new jot.SET(321, 123)
        )
      ]).simplify().serialize())
    })

    it ('should generate unassignment operation', function() {
      var object = new G({key: 321});
      G.transformation.transact(object);
      object.key.uncall();
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.REM('key', 321)
      ]).simplify().serialize())
    })

    it ('should generate push operation', function() {
      var object = new G();
      G.transformation.transact(object);
      object.push('key', 123);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('key', 
          new jot.SPLICE(0, [], [123])
        )
      ]).simplify().serialize())
    })

    it ('should generate multiple push operations', function() {
      var object = new G();
      G.transformation.transact(object);
      object.push('key', 123);
      object.push('key', 321);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('key', 
          new jot.SPLICE(0, [], [123, 321])
        )
      ]).simplify().serialize())
    })

    it ('should generate nested object operation', function() {
      var object = new G({ctx: {}});
      G.transformation.transact(object);
      object.ctx.set('key', 123);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('ctx', 
          new jot.PUT('key', 123)
        )
      ]).simplify().serialize())
    })
  })
  describe('Diffing', function() {
    it ('should diff strings', function() {
      var object = new G({'test': 'hello'});
      G.transformation.transact(object);
      object.set('test', 'hello brother!');
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('test', 
          new jot.LIST([
            new jot.SPLICE(5, '', ' brother!')
          ]).simplify()
        )
      ]).simplify().serialize())
    })

    it ('should diff native arrays', function() {
      var object = new G();
      object.set('test', ['hello', 'world'])
      G.transformation.transact(object);
      object.set('test', ['world', 'destroyed']);
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('test', 
          new jot.LIST([
            new jot.SPLICE(0, ['hello'], []),
            new jot.SPLICE(1, [], ['destroyed'])
          ]).simplify()
        )
      ]).simplify().serialize())
    })

    it ('should diff different G objects', function() {
      var object = new G();
      object.set('test', {
        hello: 1,
        world: 'yes'
      })
      G.transformation.transact(object);
      object.set('test', {
        destroyed: 1,
        world: 'no'
      });
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('test', 
          new jot.LIST([
            new jot.APPLY('world', 
              new jot.SET('yes', 'no')),
            new jot.REM('hello'),
            new jot.PUT('destroyed', 1)
          ])).simplify(),
      ]).simplify().serialize())
    })

    it ('should diff merged properties', function() {
      var object = new G();
      object.set('test', {
        hello: 1,
        world: 'yes'
      })
      G.transformation.transact(object);
      object.merge('test', {
        destroyed: 1,
        world: 'no'
      });
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.APPLY('test', 
          new jot.LIST([
            new jot.PUT('destroyed', 1),
            new jot.APPLY('world', 
              new jot.SET('yes', 'no'))
          ])).simplify(),
      ]).simplify().serialize())
    })
  });

  describe('Tracking', function() {

    xit ('should generate nested merge operation', function() {
      var object = new G();
      G.transformation.transact(object);
      object.merge({
        ctx: {
          key: 123
        }
      })
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.PUT('ctx', {}),
        new jot.APPLY('ctx', 
          new jot.PUT('key', 123)
        )
      ]).simplify().serialize())
    })
    it ('should combine local & nested operations in order', function() {
      var object = new G();
      G.transformation.transact(object);
      object.set('ctx', {});
      object.ctx.set('key', 123)
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.PUT('ctx', {}),
        new jot.APPLY('ctx', 
          new jot.PUT('key', 123)
        )
      ]).simplify().serialize())
    })
    it ('should ignore side effects not reachable by transaction', function() {
      var object = new G;
      var effect = new G;
      G.transformation.transact(object);
      object.set('key', 123);
      object.watch('key', function(value) {
        effect.set('key', value)
      })
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
          new jot.PUT('key', 123)
      ]).simplify().serialize())
    })
    it ('should not ignore side effects reachable by transaction', function() {
      var object = new G;
      var effect = object.set('effect', {});

      G.transformation.transact(object);
      object.set('key', 123);
      object.watch('key', function(value) {
        effect.set('key', value)
      })
      expect(G.transformation.commit().serialize())
      .to.eql(new jot.LIST([
        new jot.PUT('key', 123),
        new jot.APPLY('effect', 
          new jot.PUT('key', 123)
        )
      ]).simplify().serialize())
    })
  })

  describe('Merging', function() {
    it ('should merge operations over the same object', function() {
      var data = {
        name: 'Gregory Gorgeous',
        bio: 'Raised by elves',
        title: 'Destroyer of worlds',
        rank: 2
      };
      var alice = new G(data);
      var bob = new G(data);

      G.transformation.transact(alice);
      alice.set('name', 'Legory Gorgeous')
      alice.set('bio', 'Taught by elvez')
      alice.set('title', 'Devourer of worlds')
      alice.rank.uncall()
      var Alice = G.transformation.commit();


      G.transformation.transact(bob);
      bob.set('name', 'Giggidy Gorgeous')
      bob.set('bio', 'Raised by gnomes')
      bob.title.uncall()
      var Bob = G.transformation.commit();

      G.transformation(alice, Bob.rebase(Alice, true))

      expect(String(alice.name)).to.eql('Giggidy Gorgeous');
      expect(String(alice.bio)).to.eql('Taught by gnomes');
      expect(alice.title).to.eql(undefined);
      expect(alice.rank).to.eql(undefined);
      expect(String(bob.name)).to.eql('Giggidy Gorgeous');
      expect(String(bob.bio)).to.eql('Raised by gnomes');
      expect(Number(bob.rank)).to.eql(2);
      expect(bob.title).to.eql(undefined);

      G.transformation(bob, Alice.rebase(Bob, true))

      expect(String(bob.name)).to.eql('Giggidy Gorgeous');
      expect(String(bob.bio)).to.eql('Taught by gnomes');
      expect(alice.title).to.eql(undefined);
      expect(bob.rank).to.eql(undefined);
    })


    it ('should merge array mutations', function() {
      var data = {
        oldies: ['Hola']
      };
      var alice = new G(data);
      var bob = new G(data);

      // CASE 1: Concurrent optimistic changes
      // Alice added two things
      G.transformation.transact(alice);
      alice.push('oldies', 'Zuck')
      alice.push('newbies', 'Andie')
      var Alice = G.transformation.commit();

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Hola', 'Zuck'],
        newbies: 'Andie'
      }))

      G.transformation.transact(bob);
      bob.unshift('oldies', 'Arkham')
      bob.push('newbies', 'Zonder')

      // Bob added two things as well
      var Bob = G.transformation.commit();

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Hola', 'Zuck'],
        newbies: 'Andie'
      }))

      // Bob sent his commands to alice to sync, she rebases against her history
      Bob2 = G.transformation(alice, Bob.rebase(Alice, true))

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Hola', 'Zuck'],
        newbies: ['Andie', 'Zonder']
      }))

      // Alice sends her history before rebase to Bob, so Bob can rebase it against his
      Alice2 = G.transformation(bob, Alice.rebase(Bob, true))

      expect(bob.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Hola', 'Zuck'],
        newbies: ['Andie', 'Zonder']
      }))

      // CASE 2: One-way changes 
      G.transformation.transact(bob);
      bob.oldies.uncall()
      var newb = bob.newbies.uncall()
      var Bob2 = G.transformation.commit();

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Hola', 'Zuck'],
        newbies: ['Andie', 'Zonder']
      }))
      expect(bob.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Hola'],
        newbies: 'Andie'
      }))

      G.transformation(alice, Bob2)
      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Hola'],
        newbies: 'Andie'
      }))


      // CASE 3: One-way redo
      G.transformation.transact(bob);
      newb.call()
      var Bob3 = G.transformation.commit();

      G.transformation(alice, Bob3)
      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Hola'],
        newbies: ['Andie', 'Zonder']
      }))

    })


    it ('should merge array movements', function() {
      var data = {
        oldies: ['Hola', 'Ticka', 'Zigg']
      };
      var alice = new G(data);
      var bob = new G(data);

      G.transformation.transact(alice);
      G.after(G.Array.first(alice.oldies), G.Array.last(alice.oldies))
      var Alice = G.transformation.commit();
      

      G.transformation.transact(bob);
      bob.unshift('oldies', 'Arkham')
      var Bob = G.transformation.commit();

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Ticka', 'Zigg', 'Hola']
      }))

      // Bob sent his commands to alice to sync, she rebases against her history
      Bob2 = G.transformation(alice, Bob.rebase(Alice, true))

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka', 'Zigg', 'Hola']
      }))

      // Alice sends her history before rebase to Bob, so Bob can rebase it against his

      Alice2 = G.transformation(bob, Alice.rebase(Bob, true))

      expect(bob.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka', 'Zigg', 'Hola']
      }))

      // CASE 2: One-way changes 
      G.transformation.transact(bob);
      var newb = bob.oldies.uncall()
      var newb2 = bob.oldies.uncall()
      var Bob2 = G.transformation.commit();

      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka', 'Zigg', 'Hola']
      }))
      expect(bob.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka']
      }))

      G.transformation(alice, Bob2)
      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka']
      }))


      // CASE 3: One-way redo in wrong order
      G.transformation.transact(bob);
      newb.call()
      var Bob3 = G.transformation.commit();

      G.transformation(alice, Bob3)
      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka', 'Hola']
      }))

      G.transformation.transact(bob);
      newb2.call()
      var Bob4 = G.transformation.commit();

      G.transformation(alice, Bob4)
      expect(alice.stringify()).to.eql(G.stringify({
        oldies: ['Arkham', 'Ticka', 'Zigg', 'Hola']
      }))

    })
  })
})
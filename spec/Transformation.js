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
      object.ctx.set('key', {});
      expect(G.transformation.commit()).to.eql({
        ctx: {
          key: new jot.SET(undefined, {})
        }
      })
    })
  })
})
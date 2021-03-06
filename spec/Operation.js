
describe('Operations', function() {
  describe('Invoking', function() {
    it('should instantiate as observable object', function() {
      var context;
      context = new G({
        context: true
      });
      context.set('a', 'Test', 'unique');
      expect(context.a.valueOf()).to.eql('Test');
      expect(context.a.$context).to.eql(context);
      context.set('a', 'Test2', 'unique');
      expect(context.a.valueOf()).to.eql('Test2');
      expect(context.a.$context).to.eql(context);
      expect(context.a.$preceeding).to.eql(void 0);
      expect(context.a.$succeeding).to.eql(void 0);
      context.set('a', 'Test3', 'b');
      expect(context.a.valueOf()).to.eql('Test3');
      context.set('a', null, 'unique');
      expect(context.a.valueOf()).to.eql('Test3');
      context.set('a', null, 'b');
      expect(context.a.valueOf()).to.eql('Test2');
      context.set('a', null, 'unique');
      expect(context.a).to.eql(undefined);
    });

    it('should assign value with meta data', function() {
      var context, op, string;
      context = {};
      op = G.set(context, 'key', 'value', 'meta', 'arg');
      string = Object('value');
      string.$context = context;
      string.$key = 'key';
      string.$meta = ['meta', 'arg'];
      string.call = G.prototype.call
      string.recall = G.prototype.recall
      string.uncall = G.prototype.uncall
      expect(op).to.eql(string);
      expect(context.key).to.eql(string);
      expect(context.key == 'value').to.eql(true);
      return expect(G.stringify(context)).to.eql(G.stringify({
        key: 'value'
      }));
    });


    it('should assign value with meta data in array', function() {
      var context, op, string;
      context = {};
      op = G.set(context, 'key', 'value', ['meta', 'arg']);
      string = Object('value');
      string.$context = context;
      string.$key = 'key';
      string.$meta = ['meta', 'arg'];
      string.call = G.prototype.call
      string.recall = G.prototype.recall
      string.uncall = G.prototype.uncall
      expect(op).to.eql(string);
      expect(context.key).to.eql(string);
      expect(context.key == 'value').to.eql(true);
      return expect(G.stringify(context)).to.eql(G.stringify({
        key: 'value'
      }));
    });

    it('should be able to reassign operations if key/context matches', function() {
      var context = new G;

      var value = context.set('key', 'value');


      var other = context.set('other', value);

      expect(value).to.not.eql(other)

      context.set('other', 'zzz');

      expect(context.other).to.not.eql(other);

      context.set('other', other)

      expect(context.other).to.eql(other);

      context.set('other', value)

      expect(context.other).to.not.eql(value);

    });

    (window.Proxy ? it : xit)('should be compatible with ES6 proxy', function() {
      var context, proxy;
      context = {
        context: true
      };
      proxy = new Proxy(context, {
        set: G.set
      });
      proxy.a = 'Test';
      expect(proxy.a.valueOf()).to.eql('Test');
      expect(proxy.a.$context).to.eql(proxy);
      proxy.a = 'Test2';
      expect(proxy.a.valueOf()).to.eql('Test2');
      expect(proxy.a.$context).to.eql(proxy);
      expect(proxy.a.$preceeding).to.eql(void 0);
      expect(proxy.a.$succeeding).to.eql(void 0);
      return expect(ValueStack(proxy.a)).to.eql([proxy.a]);
    });

  });
  describe('Stacking', function() {


    it('should keep stack of values with different meta', function() {
      var context, op, op2;
      context = {
        context: true
      };
      op = G.set(context, 'key', 'value', 'meta', 'scope');
      op2 = G.set(context, 'key', 'value2', 'meta2', 'scope2');
      op3 = G.set(context, 'zorro', 'value3', ['meta2', 'scope2']);
      expect(op2.$meta).to.eql(op3.$meta)
      expect(context.key).to.eql(op2);
      expect(ValueStack(op2)).to.eql([op, op2]);
      expect(context.key.valueOf()).to.eql('value2');
      expect(G.stringify(context)).to.eql(G.stringify({
        context: true,
        key: 'value2',
        zorro: 'value3'
      }));

      // does nothing, meta doesnt match
      context.zorro.recall()
      expect(G.stringify(context)).to.eql(G.stringify({
        context: true,
        key: 'value2',
        zorro: 'value3'
      }));

      // now recall for sure (same as G.uncall(op3))
      context.zorro.recall('meta2', 'scope2');
      expect(G.stringify(context)).to.eql(G.stringify({
        context: true,
        key: 'value2'
      }));

      // recall with array
      context.key.recall(['meta2', 'scope2'])
      expect(G.stringify(context)).to.eql(G.stringify({
        context: true,
        key: 'value'
      }));

      // recall whatever
      G.uncall(context.key)
      expect(G.stringify(context)).to.eql(G.stringify({
        context: true
      }));
    });


    it('should update values by meta', function() {
      var before, context, key1234;
      context = {};
      G.set(context, 'key', 123, 'meta1');
      expect(context.key.valueOf()).to.eql(123);
      G.set(context, 'key', 1234, 'meta1');
      key1234 = context.key;
      expect(context.key.valueOf()).to.eql(1234);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([1234]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([1234]));
      G.set(context, 'key', 555, 'lol omg this is weird', 'you say!');
      expect(context.key.valueOf()).to.eql(555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([1234, 555]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([555]));
      G.set(context, 'key', 12345, 'meta1');
      expect(context.key.valueOf()).to.eql(555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([12345, 555]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([555]));
      G.set(context, 'key', 5555, 'lol omg this is weird', 'you say!');
      expect(context.key.valueOf()).to.eql(5555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([12345, 5555]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([5555]));
      G.set(context, 'key', 55555, 'lol omg this is weird');
      expect(context.key.valueOf()).to.eql(55555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([12345, 5555, 55555]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([55555]));
      G.set(context, 'key', 123456, 'meta1');
      expect(context.key.valueOf()).to.eql(55555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([123456, 5555, 55555]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([55555]));

      // Remove operation from history 
      before = context.key.$preceeding;
      G.revoke(before);
      expect(context.key.valueOf()).to.eql(55555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([123456, 55555]));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([55555]));

      // Re-apply operation on top of the stack 
      G.call(before, 'set');
      expect(context.key.valueOf()).to.eql(5555);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([123456, 55555, 5555]));
      return expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([5555]));
    });

    it ('values with meta dont overwrite values without', function() {
      var context = {}
      var op1 = G.set(context, 'key', 'value');
      var op2 = G.set(context, 'key', 'value', 'meta', 'scope');
      expect(ValueStack(op2)).to.eql([op2, op1]);
    });
    it ('presetting values without meta still puts them after ones with meta', function() {
      var context = {}
      var op1 = G.set(context, 'key', 'value', 'meta', 'scope');
      var op2 = G.preset(context, 'key', 'value');
      expect(ValueStack(op2)).to.eql([op1, op2]);
    });

    it ('should stack objects', function() {
      var context = new G
      var a = context.set('collection', {a: 1}, 'a')
      var b = context.preset('collection', {b: 2}, 'b')
      // top value is eagerly reified into observable object
      expect(a).to.eql(context.collection)
      expect(a.a).to.not.eql(undefined)
      expect(a.$meta).to.eql(['a'])
      // the other stacked value is not converted into full blown object
      expect(b.b).to.eql(undefined)
      expect(b.$meta).to.eql(['b'])
      // remove top value and expose lazy value
      a.uncall()
      // the value is a different objectm, but meta is kept in place
      expect(context.b).to.not.eql(context.collection)
      expect(context.collection.b).to.not.eql(undefined)
      expect(context.collection.$meta).to.eql(['b'])
    })

    it ('should stack foreign observable objects', function() {
      var context = new G
      var A = new G({a: 1})
      var B = new G({b: 1})
      var a = context.set('collection', A, 'a')
      var b = context.preset('collection', B, 'b')
      // top operation is shallow subscription
      expect(a).to.not.eql(context.collection)
      expect(a.a).to.eql(undefined)
      expect(context.collection.a.$meta).to.eql(['a'])
      // the other is just a shallow ref without subscription
      expect(b.b).to.eql(undefined)
      expect(b.$meta).to.eql(['b'])
      expect(context.collection.b).to.eql(undefined)
      // remove top value and expose lazy value
      a.uncall()
      // the value is a different objectm, but meta is kept in place
      expect(context.b).to.not.eql(context.collection)
      expect(context.collection.a).to.eql(undefined)
      expect(context.collection.b).to.not.eql(undefined)
      expect(context.collection.$meta).to.eql(['b'])

      b.uncall()
      expect(context.collection).to.eql(undefined)

      b.call()
      expect(a).to.not.eql(context.collection)
      expect(b).to.not.eql(context.collection)
      expect(context.collection.b.$meta).to.eql(['b'])
      expect(context.collection.a).to.eql(undefined)

      a.call()
      expect(a).to.not.eql(context.collection)
      expect(b).to.not.eql(context.collection)
      expect(context.collection.b).to.eql(undefined)
      expect(context.collection.a.$meta).to.eql(['a'])

    })
  })
  describe('Groupping', function() {
    it('should add items on top of the stack', function() {
      var context = {};
      G.push(context, 'key', 'value1', 'meta1', 'scope1');
      G.push(context, 'key', 'value2', 'meta2', 'scope2');
      expect(context.key.valueOf()).to.eql('value2');
      expect(context.key.$previous.valueOf()).to.eql('value1');
      return expect(context.key.$previous.$next.valueOf()).to.eql('value2');
    });
    it ('should sort items by meta', function() {
      var context = {};
      G.push(context, 'key', 'value2', 2);
      var value1 = G.push(context, 'key', 'value1', 1);
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value2']))

      var value1_5 = G.push(context, 'key', 'value1.5', 1.5)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value1.5', 'value2']))

      var value0 = G.push(context, 'key', 'value0', 0)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value1.5', 'value2']))

      value0.uncall()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value1.5', 'value2']))

      value0.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value1.5', 'value2']))

      value1_5.uncall()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value2']))

      value1_5.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value1.5', 'value2']))

      value1.uncall()
      value0.uncall()
      value1_5.uncall()
      value1.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value2']))

    })

    it ('should sort items by comparable meta object', function() {
      var Num = function(number) {
        this.number = number
      }
      Num.prototype.comparePosition = function(num) {
        return this.number > num.number ? -1 : this.number == num.number ? 0 : 1;
      }
      var context = {};
      G.push(context, 'key', 'value2', new Num(2));
      var value1 = G.push(context, 'key', 'value1', new Num(1));
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value2']))

      var value1_5 = G.push(context, 'key', 'value1.5', new Num(1.5))
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value1.5', 'value2']))

      var value0 = G.push(context, 'key', 'value0', new Num(0))
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value1.5', 'value2']))

      value0.uncall()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value1.5', 'value2']))

      value0.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value1.5', 'value2']))

      value1_5.uncall()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value2']))

      value1_5.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value1.5', 'value2']))

      value1.uncall()
      value0.uncall()
      value1_5.uncall()
      value1.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value2']))

      // update value
      Num.call(value1.$meta[0], 11);
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value2']))

      context.key.$previous.call()

      // manually re-call property to resort
      context.key.$previous.call()
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value2', 'value1']))

    })

    it('should add items on bottom of the stack', function() {
      var context = {};
      G.unshift(context, 'key', 'value1', 'meta1', 'scope1');
      G.unshift(context, 'key', 'value2', 'meta2', 'scope2');
      expect(context.key.valueOf()).to.eql('value1');
      expect(context.key.$previous.valueOf()).to.eql('value2');
      return expect(context.key.$previous.$next.valueOf()).to.eql('value1');
    });
    it('should bring back value, keep links', function() {
      var context = {};
      G.push(context, 'key', 'value1', 'meta1', 'scope1');
      var head = G.push(context, 'key', 'value2', 'meta2', 'scope2');
      G.uncall(head);
      expect(context.key).to.not.eql(head);
      G.call(head);
      expect(context.key).to.eql(head);
      expect(head.valueOf()).to.eql('value2');
      expect(head.$previous.valueOf()).to.eql('value1');
      return expect(head.$previous.$next.valueOf()).to.eql('value2');
    });
    it('should be able to splice and rearrange arrays', function() {
      var context = {};
      var value1 = G.push(context, 'key', 'value1', 'meta1', 'scope1');
      var value3 = G.push(context, 'key', 'value3', 'meta2', 'scope3');
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value1', 'value3']))

      var value0 = G.before('value0', value1)

      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value3']))

      G.before('value2', value3)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'value1', 'value2', 'value3']))

      var valueR = G.replace('valueR', value1)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value0', 'valueR', 'value2', 'value3']))

      var valueS = G.swap('valueS', value0)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['valueS', 'valueR', 'value2', 'value3']))

      G.swap(valueS, valueR)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['valueR', 'valueS', 'value2', 'value3']))

      G.swap(valueS, valueR)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['valueS', 'valueR', 'value2', 'value3']))

      G.swap(valueS, value3)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value3', 'valueR', 'value2', 'valueS']))

      G.swap(valueS, valueR)
      expect(G.stringify(ValueGroup(context.key))).to.eql(G.stringify(['value3', 'valueS', 'value2', 'valueR']))
    });
  });
})
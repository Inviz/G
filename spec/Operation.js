
describe('G', function() {
  it('should assign value with meta data', function() {
    var context, op, string;
    context = {
      context: true
    };
    op = G.set(context, 'key', 'value', 'meta', 'scope');
    string = Object('value');
    string.$context = context;
    string.$key = 'key';
    string.$meta = ['meta', 'scope'];
    string.call = G.prototype.call
    string.recall = G.prototype.recall
    expect(op).to.eql(string);
    expect(context.key).to.eql(string);
    expect(context.key == 'value').to.eql(true);
    return expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'value'
    }));
  });
  it('should keep stack of values with different meta', function() {
    var context, op, op2;
    context = {
      context: true
    };
    op = G.set(context, 'key', 'value', 'meta', 'scope');
    op2 = G.set(context, 'key', 'value2', 'meta2', 'scope2');
    expect(context.key).to.eql(op2);
    expect(ValueStack(op2)).to.eql([op, op2]);
    expect(context.key.valueOf()).to.eql('value2');
    return expect(G.stringify(context)).to.eql(G.stringify({
      context: true,
      key: 'value2'
    }));
  });


  it('should update values by meta', function() {
    var before, context, key1234;
    context = {};
    G.set(context, 'key', 123);
    expect(context.key.valueOf()).to.eql(123);
    G.set(context, 'key', 1234);
    key1234 = context.key;
    expect(context.key.valueOf()).to.eql(1234);
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([1234]));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([1234]));
    G.set(context, 'key', 555, 'lol omg this is weird', 'you say!');
    expect(context.key.valueOf()).to.eql(555);
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([1234, 555]));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([555]));
    G.set(context, 'key', 12345);
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
    G.set(context, 'key', 123456);
    expect(context.key.valueOf()).to.eql(55555);
    expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify([123456, 5555, 55555]));
    expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify([55555]));

    // Remove operation from history 
    before = context.key.$preceeding;
    debugger
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


  it('should use G as context', function() {
    var context;
    context = new G({
      context: true
    });
    context.set('a', 'Test');
    expect(context.a.valueOf()).to.eql('Test');
    expect(context.a.$context).to.eql(context);
    context.set('a', 'Test2');
    expect(context.a.valueOf()).to.eql('Test2');
    expect(context.a.$context).to.eql(context);
    expect(context.a.$preceeding).to.eql(void 0);
    expect(context.a.$succeeding).to.eql(void 0);
    context.set('a', 'Test3', 'b');
    expect(context.a.valueOf()).to.eql('Test3');
    context.set('a', null);
    expect(context.a.valueOf()).to.eql('Test3');
    context.set('a', null, 'b');
    expect(context.a.valueOf()).to.eql('Test2');
    context.set('a', null);
    expect(context.a).to.eql(undefined);
  });
});

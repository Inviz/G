
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
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['test', 'test123']));
    expect(context.key.valueOf()).to.eql('test123');
    G.unwatch(context, 'key', callback, true);
    expect(context.key.valueOf()).to.eql('test');
    expect(ValueStack(context.key)).to.eql([context.key]);
    return expect(StateGraph(context.key)).to.eql([context.key]);
  });
  it('should retransform value on redo', function() {
    var before, callback, context;
    context = {};
    G(context, 'key', 'test');
    expect(context.key.valueOf()).to.eql('test');
    G(context, 'key', 'pest', 2);
    expect(context.key.valueOf()).to.eql('pest');
    callback = function(value) {
      return value + 123;
    };
    G.watch(context, 'key', callback, true);
    expect(context.key.valueOf()).to.eql('pest123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test', 'pest123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['pest', 'pest123']));
    G.recall(before = context.key);
    expect(context.key.valueOf()).to.eql('test123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test123', 'pest123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['test', 'test123']));
    G.unwatch(context, 'key', callback, true);
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test', 'pest123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['test']));
    G.call(before);
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test', 'pest']));
    return expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['pest']));
  });
  it('should transform preassigned values', function() {
    var callback, context;
    context = {};
    G(context, 'key', 'test');
    expect(context.key.valueOf()).to.eql('test');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['test']));
    callback = function(value) {
      return value + 123;
    };
    G.watch(context, 'key', callback, true);
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['test', 'test123']));
    expect(context.key.valueOf()).to.eql('test123');
    G.unwatch(context, 'key', callback, true);
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['test']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['test']));
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
    op = G(context, 'key', 'value', 'meta1', 'scope');
    expect(context.key).to.eql(op);
    expect(context.key.valueOf()).to.eql('value123');
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'value123'
    }));
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value123']));
    op2 = G(context, 'key', 'zalue', 'meta2', 'scope');
    expect(context.key).to.eql(op2);
    expect(context.key.valueOf()).to.eql('zalue123');
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'zalue123'
    }));
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value123', 'zalue123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['zalue', 'zalue123']));
    G.recall(context.key);
    expect(context.key).to.eql(op);
    expect(context.key.valueOf()).to.eql('value123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value123', 'zalue123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value123']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'value123'
    }));
    G.recall(context.key);
    expect(context.key).to.eql(void 0);

    G.call(op2);
    expect(context.key).to.eql(op2);
    expect(context.key.valueOf()).to.eql('zalue123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value123', 'zalue123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['zalue', 'zalue123']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'zalue123'
    }));
    G.call(op);
    expect(context.key).to.eql(op);
    expect(context.key.valueOf()).to.eql('value123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value123', 'zalue123']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value123']));
    return expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'value123'
    }));
  });
});

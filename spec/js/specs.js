(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
describe('List', function() {
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


},{}],2:[function(require,module,exports){
var StateGraph, ValueStack;

StateGraph = function(operation, before, after) {
  var lastAfter, lastBefore, list;
  list = [];
  before = after = operation;
  lastBefore = lastAfter = operation;
  while (before = before.$before) {
    if (before.$after !== lastBefore) {
      throw 'List is broken';
    }
    list.unshift(before);
    lastBefore = before;
  }
  list.push(operation);
  while (after = after.$after) {
    if (after.$before !== lastAfter) {
      throw 'List is broken';
    }
    list.push(after);
    lastAfter = after;
  }
  return list;
};

ValueStack = function(operation, before, after) {
  var lastAfter, lastBefore, list;
  list = [];
  before = after = operation;
  lastBefore = lastAfter = operation;
  while (before = before.$preceeding) {
    if (before.$succeeding !== lastBefore) {
      throw 'List of values in the stack is not valid';
    }
    list.unshift(before);
    lastBefore = before;
  }
  list.push(operation);
  while (after = after.$succeeding) {
    if (after.$preceeding !== lastAfter) {
      throw 'List of values in the stack is not valid';
    }
    list.push(after);
    lastAfter = after;
  }
  return list;
};

describe('G', function() {
  it('should assign value with meta data', function() {
    var context, op, string;
    context = {
      context: true
    };
    op = G(context, 'key', 'value', 'meta', 'scope');
    string = Object('value');
    string.$context = context;
    string.$key = 'key';
    string.$meta = ['meta', 'scope'];
    expect(op).to.eql(string);
    expect(context.key).to.eql(string);
    expect(context.key == 'value').to.eql(true);
    return expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'value'
    }));
  });
  return it('should update value', function() {
    var context, op, op2;
    context = {
      context: true
    };
    op = G(context, 'key', 'value', 'meta', 'scope');
    op2 = G(context, 'key', 'value2', 'meta2', 'scope2');
    expect(context.key).to.eql(op2);
    expect(ValueStack(op2)).to.eql([op, op2]);
    expect(context.key.valueOf()).to.eql('value2');
    return expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: true,
      key: 'value2'
    }));
  });
});

describe('Proxy setting', function() {
  it('should wrap object around via ES6 proxy', function() {
    var context, proxy;
    context = {
      context: true
    };
    proxy = new Proxy(context, {
      set: G
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
  return it('should wrap object with G proxy', function() {
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
    return expect(context.a.valueOf()).to.eql('Test2');
  });
});

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
  it('should track side effects in callbacks', function() {
    var context, op, op2, subject;
    context = {
      'context': 'context'
    };
    subject = {
      'subject': 'subject'
    };
    G.watch(context, 'key', function(value) {
      G(subject, 'mutated', value + 123);
      G(context, 'asis', value);
    });
    op = G(context, 'key', 'value', 'meta1', 'scope');
    expect(context.key).to.eql(op);
    expect(subject.mutated.valueOf()).to.eql('value123');
    expect(context.asis.valueOf()).to.eql('value');
    expect(subject.mutated.$before).to.eql(op);
    expect(subject.mutated.$after).to.eql(context.asis);
    expect(context.asis.$before).to.eql(subject.mutated);
    expect(context.asis.$after).to.eql(void 0);
    expect(JSON.stringify(subject)).to.eql(JSON.stringify({
      'subject': 'subject',
      mutated: 'value123'
    }));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      'context': 'context',
      key: 'value',
      asis: 'value'
    }));
    op2 = G(context, 'key', 'zalue', 'meta2', 'scope');
    expect(context.key).to.eql(op2);
    expect(subject.mutated.valueOf()).to.eql('zalue123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value', 'zalue']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['zalue', 'zalue123', 'zalue']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      'context': 'context',
      key: 'zalue',
      asis: 'zalue'
    }));
    G.recall(context.key);
    expect(context.key).to.eql(op);
    expect(subject.mutated.valueOf()).to.eql('value123');
    expect(subject.mutated.$before).to.eql(context.key);
    expect(subject.mutated.$after).to.eql(context.asis);
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value', 'zalue']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value123', 'value']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      'context': 'context',
      key: 'value',
      asis: 'value'
    }));
    G.recall(context.key);
    expect(context.mutated).to.eql(void 0);
    expect(context.asis).to.eql(void 0);
    expect(context.key).to.eql(void 0);
    G.call(op2);
    expect(context.key).to.eql(op2);
    expect(subject.mutated.valueOf()).to.eql('zalue123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value', 'zalue']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['zalue', 'zalue123', 'zalue']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: 'context',
      key: 'zalue',
      asis: 'zalue'
    }));
    expect(JSON.stringify(subject)).to.eql(JSON.stringify({
      subject: 'subject',
      mutated: 'zalue123'
    }));
    G.call(op);
    expect(context.key).to.eql(op);
    expect(subject.mutated.valueOf()).to.eql('value123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value', 'zalue']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value123', 'value']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: 'context',
      key: 'value',
      asis: 'value'
    }));
    return expect(JSON.stringify(subject)).to.eql(JSON.stringify({
      subject: 'subject',
      mutated: 'value123'
    }));
  });
  it('should handle transformations and side effects together', function() {
    var context, op, op2, subject;
    context = {
      'context': 'context'
    };
    subject = {
      'subject': 'subject'
    };
    G.watch(context, 'key', function(value) {
      G(subject, 'mutated', value + 123);
      G(context, 'asis', value);
    });
    G.watch(context, 'key', function(value) {
      return value + 666;
    }, true);
    op = G(context, 'key', 'value', 'meta1', 'scope');
    expect(context.key).to.eql(op);
    expect(JSON.stringify(subject)).to.eql(JSON.stringify({
      'subject': 'subject',
      mutated: 'value666123'
    }));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      'context': 'context',
      key: 'value666',
      asis: 'value666'
    }));
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value666']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value666', 'value666123', 'value666']));
    op2 = G(context, 'key', 'zalue', 'meta2', 'scope');
    expect(context.key).to.eql(op2);
    expect(subject.mutated.valueOf()).to.eql('zalue666123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value666', 'zalue666']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      'context': 'context',
      key: 'zalue666',
      asis: 'zalue666'
    }));
    G.recall(context.key);
    expect(context.key).to.eql(op);
    expect(subject.mutated.valueOf()).to.eql('value666123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value666', 'zalue666']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value666', 'value666123', 'value666']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      'context': 'context',
      key: 'value666',
      asis: 'value666'
    }));
    G.recall(context.key);
    expect(context.mutated).to.eql(void 0);
    expect(context.asis).to.eql(void 0);
    expect(context.key).to.eql(void 0);
    G.call(op2);
    expect(context.key).to.eql(op2);
    expect(subject.mutated.valueOf()).to.eql('zalue666123');
    expect(subject.mutated.$before.valueOf()).to.eql('zalue666');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value666', 'zalue666']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: 'context',
      key: 'zalue666',
      asis: 'zalue666'
    }));
    expect(JSON.stringify(subject)).to.eql(JSON.stringify({
      subject: 'subject',
      mutated: 'zalue666123'
    }));
    G.call(op);
    expect(context.key).to.eql(op);
    expect(subject.mutated.valueOf()).to.eql('value666123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['value666', 'zalue666']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['value', 'value666', 'value666123', 'value666']));
    expect(JSON.stringify(context)).to.eql(JSON.stringify({
      context: 'context',
      key: 'value666',
      asis: 'value666'
    }));
    expect(JSON.stringify(subject)).to.eql(JSON.stringify({
      subject: 'subject',
      mutated: 'value666123'
    }));
    return 1;
  });
  it('should handle transformations and side effects together', function() {
    var before, callback, context, subject;
    context = {
      'context': 'context',
      key: 'lol'
    };
    subject = {
      'subject': 'subject'
    };
    G.watch(context, 'key', function(value) {
      G(subject, 'mutated', value + 123);
      G(context, 'asis', value);
    });
    expect(context.asis.valueOf()).to.eql('lol');
    expect(subject.mutated.valueOf()).to.eql('lol123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol123', 'lol']));
    callback = function(value) {
      return value + 666;
    };
    G.watch(context, 'key', callback, true);
    expect(context.asis.valueOf()).to.eql('lol666');
    expect(subject.mutated.valueOf()).to.eql('lol666123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol666']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol666', 'lol666123', 'lol666']));
    G.unwatch(context, 'key', callback, true);
    expect(context.asis.valueOf()).to.eql('lol');
    expect(subject.mutated.valueOf()).to.eql('lol123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol']));
    expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol123', 'lol']));
    before = context.key;
    G.recall(before);
    expect(context.asis).to.eql(void 0);
    expect(subject.mutated).to.eql(void 0);
    G.watch(context, 'key', callback, true);
    expect(context.asis).to.eql(void 0);
    expect(subject.mutated).to.eql(void 0);
    G.call(before);
    expect(context.asis.valueOf()).to.eql('lol666');
    expect(subject.mutated.valueOf()).to.eql('lol666123');
    expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol666']));
    return expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol666', 'lol666123', 'lol666']));
  });
  it('should update values by meta', function() {
    var before, context, key1234;
    context = {};
    G.set(context, 'key', 123);
    expect(context.key.valueOf()).to.eql(123);
    G.set(context, 'key', 1234);
    key1234 = context.key;
    expect(context.key.valueOf()).to.eql(1234);
    expect(context.key.$succeeding).to.eql(void 0);
    expect(context.key.$preceeding).to.eql(void 0);
    G.set(context, 'key', 555, 'lol omg this is weird', 'you say!');
    expect(context.key.valueOf()).to.eql(555);
    expect(context.key.$succeeding).to.eql(void 0);
    expect(context.key.$preceeding).to.eql(key1234);
    G.set(context, 'key', 12345);
    expect(context.key.valueOf()).to.eql(555);
    expect(context.key.$succeeding).to.eql(void 0);
    expect(context.key.$preceeding).not.to.eql(key1234);
    expect(context.key.$preceeding.valueOf()).eql(12345);
    G.set(context, 'key', 5555, 'lol omg this is weird', 'you say!');
    expect(context.key.valueOf()).to.eql(5555);
    expect(context.key.$succeeding).to.eql(void 0);
    expect(context.key.$preceeding).not.to.eql(key1234);
    expect(context.key.$preceeding.valueOf()).eql(12345);
    G.set(context, 'key', 55555, 'lol omg this is weird');
    expect(context.key.valueOf()).to.eql(55555);
    expect(context.key.$preceeding.valueOf()).eql(5555);
    expect(context.key.$preceeding.$preceeding.valueOf()).eql(12345);
    G.set(context, 'key', 123456);
    expect(context.key.valueOf()).to.eql(55555);
    expect(context.key.$preceeding.valueOf()).eql(5555);
    expect(context.key.$preceeding.$preceeding.valueOf()).eql(123456);
    before = context.key.$preceeding;
    G.recall(before, true);
    expect(context.key.valueOf()).to.eql(55555);
    expect(context.key.$preceeding.valueOf()).eql(123456);
    G.call(before, 'set');
    expect(context.key.valueOf()).to.eql(5555);
    expect(context.key.$succeeding).eql(void 0);
    expect(context.key.$preceeding.valueOf()).eql(55555);
    expect(context.key.$preceeding.$succeeding).eql(context.key);
    expect(context.key.$preceeding.$preceeding.$succeeding).eql(context.key.$preceeding);
    return expect(context.key.$preceeding.$preceeding.$preceeding).eql(void 0);
  });
  return it('should handle revoke effect from context with transform', function() {
    var before, callback, context, subject;
    context = {
      'context': 'context',
      key: 'lol'
    };
    subject = {
      'subject': 'subject'
    };
    G.watch(context, 'key', function(value) {
      G(subject, 'mutated', value);
      G(context, 'asis', value);
    });
    expect(context.key.valueOf()).to.eql('lol');
    expect(subject.mutated.valueOf()).to.eql('lol');
    expect(context.asis.valueOf()).to.eql('lol');
    callback = function(value) {
      return value + 666;
    };
    G.watch(subject, 'mutated', callback, true);
    expect(context.key.valueOf()).to.eql('lol');
    expect(subject.mutated.valueOf()).to.eql('lol666');
    expect(context.asis.valueOf()).to.eql('lol');
    before = context.key;
    G.recall(context.key);
    expect(context.key).to.eql(void 0);
    expect(subject.mutated).to.eql(void 0);
    expect(context.asis).to.eql(void 0);
    G.unwatch(subject, 'mutated', callback, true);
    expect(context.key).to.eql(void 0);
    expect(subject.mutated).to.eql(void 0);
    expect(context.asis).to.eql(void 0);
    G.call(before);
    expect(context.key.valueOf()).to.eql('lol');
    expect(subject.mutated.valueOf()).to.eql('lol');
    return expect(context.asis.valueOf()).to.eql('lol');
  });
});


},{}],3:[function(require,module,exports){
describe('G.version', function() {
  return it('should generate and apply deferred commands', function() {
    var context, ivan, ivohn, john;
    context = {};
    john = G.insert(context, 'name', 0, 'John', 'meta', 'scope', true);
    ivan = G.insert(context, 'name', 0, 'Ivan', 'meta', 'scope', true);
    expect(context.name).to.eql(void 0);
    G.apply(john, ivan);
    expect(String(context.name)).to.eql('IvanJohn');
    ivohn = G["delete"](context, 'name', 2, 3, 'meta', 'scope', true);
    expect(String(context.name)).to.eql('IvanJohn');
    G.apply(ivohn);
    return expect(String(context.name)).to.eql('Ivohn');
  });
});


},{}]},{},[1,2,3]);

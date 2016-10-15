(function() {
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

      // Todo: Cleanup cycling links 
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

      // Callback causes two side effects 
      G.watch(context, 'key', function(value) {
        G(subject, 'mutated', value + 123);
        G(context, 'asis', value);
      });
      op = G(context, 'key', 'value', 'meta1', 'scope');
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(context.asis.valueOf()).to.eql('value');

      // side effects are aware of their sequence 
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

      // Todo: Cleanup cycling links 
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

      // Two different objects 
      var context, op, op2, subject;
      context = {
        'context': 'context'
      };
      subject = {
        'subject': 'subject'
      };

      // Callback causes two side effects 
      G.watch(context, 'key', function(value) {

        // One over different object 
        G(subject, 'mutated', value + 123);

        // And another changes key in the same object 
        G(context, 'asis', value);
      });

      // The object also has a formatting accessor 
      G.watch(context, 'key', function(value) {
        return value + 666;
      }, true);

      // First operation tagged with ['meta1', 'scope'] 
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

      // Second operation over same key with different meta values 
      // (puts this value on top of the stack, references old value) 
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

      // We recall that second operation to fall back to first 
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

      // The first operation is also recalled, objects are cleaned up 
      // (only local variable in this spec holds reference to operations now) 
      G.recall(context.key);
      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(context.key).to.eql(void 0);

      // Reapply operation stored here in the local variable 
      // It brings up whole graph of state with it 
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

      // Reapply first operation 
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

      // Callback causes two side effects 
      G.watch(context, 'key', function(value) {
        G(subject, 'mutated', value + 123);
        G(context, 'asis', value);
      });
      expect(context.asis.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol123');
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol']));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol123', 'lol']));

      // Apply transformation for the value that caused side effects 
      // It'll add transform op into state graph and recompute effects 
      callback = function(value) {
        return value + 666;
      };
      G.watch(context, 'key', callback, true);
      expect(context.asis.valueOf()).to.eql('lol666');
      expect(subject.mutated.valueOf()).to.eql('lol666123');
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol666']));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol666', 'lol666123', 'lol666']));

      // Remove that transformation, recompute effects again 
      G.unwatch(context, 'key', callback, true);
      expect(context.asis.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol123');
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify(['lol']));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol123', 'lol']));

      // Recall operation, store it in local variable 
      before = context.key;
      G.recall(before);
      expect(context.asis).to.eql(void 0);
      expect(subject.mutated).to.eql(void 0);

      // Add transformation again, does nothing 
      G.watch(context, 'key', callback, true);
      expect(context.asis).to.eql(void 0);
      expect(subject.mutated).to.eql(void 0);

      // Restore operation back, effects will be reaplied with transformed value 
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
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([1234]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([1234]));
      G.set(context, 'key', 555, 'lol omg this is weird', 'you say!');
      expect(context.key.valueOf()).to.eql(555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([1234, 555]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([555]));
      G.set(context, 'key', 12345);
      expect(context.key.valueOf()).to.eql(555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([12345, 555]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([555]));
      G.set(context, 'key', 5555, 'lol omg this is weird', 'you say!');
      expect(context.key.valueOf()).to.eql(5555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([12345, 5555]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([5555]));
      G.set(context, 'key', 55555, 'lol omg this is weird');
      expect(context.key.valueOf()).to.eql(55555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([12345, 5555, 55555]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([55555]));
      G.set(context, 'key', 123456);
      expect(context.key.valueOf()).to.eql(55555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([123456, 5555, 55555]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([55555]));

      // Remove operation from history 
      before = context.key.$preceeding;
      G.recall(before, true);
      expect(context.key.valueOf()).to.eql(55555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([123456, 55555]));
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([55555]));

      // Re-apply operation on top of the stack 
      G.call(before, 'set');
      expect(context.key.valueOf()).to.eql(5555);
      expect(JSON.stringify(ValueStack(context.key))).to.eql(JSON.stringify([123456, 55555, 5555]));
      return expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify([5555]));
    });
    it('should be able to revoke operation mid transaction', function() {
      var before, callback, context, subject, watcher;
      context = {
        'context': 'context',
        key: 'lol'
      };
      subject = {
        'subject': 'subject'
      };

      // Watcher causes two side effects 
      watcher = function(value) {
        G(subject, 'mutated', value);
        G(context, 'asis', value);
      };
      G.watch(context, 'key', watcher);
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
      expect(context.asis.valueOf()).to.eql('lol');
      G.unwatch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      G.watch(subject, 'mutated', callback, true);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      G.watch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol666');
      return expect(context.asis.valueOf()).to.eql('lol');
    });
    it('should write to transaction', function() {
      var context = {
        'context': 'context',
        key: 'lol'
      };
      var subject = {
        'subject': 'subject'
      };

      // Watcher causes two side effects 
      watcher = function(value) {
        G(subject, 'mutated', value + 123);
        G(context, 'asis', value);
      };

      G.watch(context, 'key', watcher);
      G.watch(context, 'title', watcher);
      var transaction = G.$caller = new G


      G.set(context, 'key', 'test')
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'test', 'test123', 'test']));

      G.set(context, 'key', 'protest')
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'protest', 'protest123', 'protest']));

      G.set(context, 'zozo', 'kiki')
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'protest', 'protest123', 'protest', 'kiki']));

      G.set(context, 'key', 'grotesque')
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kiki']));

      G.set(context, 'xaxa', 'kek')
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kiki', 'kek']));

      G.set(context, 'zozo', 'buba')
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'buba', 'kek']));

      var zozo = context.zozo
      G.recall(context.zozo)
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kek']));

      G.call(zozo)
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kek', 'buba']));
      
      var key = context.key
      G.recall(context.key)
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'kek', 'buba']));
      
      G.call(key)
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'kek', 'buba', 'grotesque', 'grotesque123', 'grotesque']));
      

    })
  });

}).call(this);


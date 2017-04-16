describe ('Effects', function() {
  describe('Tracking', function() {
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
        G.set(subject, 'mutated', value + 123);
        G.set(context, 'asis', value);
      });
      op = G.set(context, 'key', 'value', 'meta1', 'scope');
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(context.asis.valueOf()).to.eql('value');

      // side effects are aware of their sequence 
      expect(subject.mutated.$before).to.eql(op);
      expect(subject.mutated.$after).to.eql(context.asis);
      expect(context.asis.$before).to.eql(subject.mutated);
      expect(context.asis.$after).to.eql(void 0);
      expect(G.stringify(subject)).to.eql(G.stringify({
        'subject': 'subject',
        mutated: 'value123'
      }));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value',
        asis: 'value'
      }));
      op2 = G.set(context, 'key', 'zalue', 'meta2', 'scope');
      expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue123', 'zalue']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'zalue',
        asis: 'zalue'
      }));
      G.recall(context.key, 'meta2', 'scope');
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(subject.mutated.$before).to.eql(context.key);
      expect(subject.mutated.$after).to.eql(context.asis);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123', 'value']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value',
        asis: 'value'
      }));
      G.recall(context.key, 'meta1', 'scope');
      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(context.key).to.eql(void 0);

      G.call(op2);
      expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue123', 'zalue']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'zalue',
        asis: 'zalue'
      }));
      expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'zalue123'
      }));
      G.call(op);
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123', 'value']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'value',
        asis: 'value'
      }));
      return expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'value123'
      }));
    });


    it('should track transformations and side effects togethez', function() {

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
        G.set(subject, 'mutated', value + 123);

        // And another changes key in the same object 
        G.set(context, 'asis', value);
      });

      // The object also has a formatting accessor 
      G.define(context, 'key', function(value) {
        return value + 666;
      });

      // First operation tagged with ['meta1', 'scope'] 
      op = G.set(context, 'key', 'value', 'meta1', 'scope');
      expect(context.key).to.eql(op);
      expect(G.stringify(subject)).to.eql(G.stringify({
        'subject': 'subject',
        mutated: 'value666123'
      }));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value666',
        asis: 'value666'
      }));
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666']));
      expect(G.stringify(ValueStack(context.asis))).to.eql(G.stringify(['value666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));

      // Second operation over same key with different meta values 
      // (puts this value on top of the stack, references old value) 
      op2 = G.set(context, 'key', 'zalue', 'meta2', 'scope');
      expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue666123');
      expect(G.stringify(ValueStack(context.asis))).to.eql(G.stringify(['zalue666']));
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'zalue666',
        asis: 'zalue666'
      }));

      // We recall that second operation to fall back to first 
      G.recall(context.key, 'meta2', 'scope');
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value666123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value666',
        asis: 'value666'
      }));

      // The first operation is also recalled, objects are cleaned up 
      // (only local variable in this spec holds reference to operations now) 
      G.recall(context.key, 'meta1', 'scope');
      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(context.key).to.eql(void 0);

      // Reapply operation stored here in the local variable 
      // It brings up whole graph of state with it 
      G.call(op2);
      //expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue666123');
      expect(subject.mutated.$before.valueOf()).to.eql('zalue666');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'zalue666',
        asis: 'zalue666'
      }));
      expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'zalue666123'
      }));

      // Reapply first operation 
      G.call(op);
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value666123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'value666',
        asis: 'value666'
      }));
      expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'value666123'
      }));
      return 1;
    });

    it('should track transformations and side effects together x 50000', function() {
      var cb1 = function(value) {

        // One over different object 
        G.set(subject, 'mutated', value + 123);

        // And another changes key in the same object 
        G.set(context, 'asis', value);
      };
      var cb2 = function(value) {
        return value + 666;
      }
      // Two different objects 
      var context, op, op2, subject;
      for (var i = 0; i < 50000; i++) {
      context = {
        'context': 'context'
      };
      subject = {
        'subject': 'subject'
      };

      // Callback causes two side effects 
      G.watch(context, 'key', cb1);

      // The object also has a formatting accessor 
      G.define(context, 'key', cb2);

      // First operation tagged with ['meta1', 'scope'] 
      op = G.set(context, 'key', 'value', 'meta1', 'scope');
      //expect(context.key).to.eql(op);
      //expect(G.stringify(subject)).to.eql(G.stringify({
      //  'subject': 'subject',
      //  mutated: 'value666123'
      //}));
      //expect(G.stringify(context)).to.eql(G.stringify({
      //  'context': 'context',
      //  key: 'value666',
      //  asis: 'value666'
      //}));
      //expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666']));
      //expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));

      // Second operation over same key with different meta values 
      // (puts this value on top of the stack, references old value) 
      op2 = G.set(context, 'key', 'zalue', 'meta2', 'scope');
      //expect(context.key).to.eql(op2);
      //expect(subject.mutated.valueOf()).to.eql('zalue666123');
      //expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      //expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
      //expect(G.stringify(context)).to.eql(G.stringify({
      //  'context': 'context',
      //  key: 'zalue666',
      //  asis: 'zalue666'
      //}));

      // We recall that second operation to fall back to first 
      G.recall(context.key, 'meta2', 'scope');
      //expect(context.key).to.eql(op);
      //expect(subject.mutated.valueOf()).to.eql('value666123');
      //expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      //expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));
      //expect(G.stringify(context)).to.eql(G.stringify({
      //  'context': 'context',
      //  key: 'value666',
      //  asis: 'value666'
      //}));

      // The first operation is also recalled, objects are cleaned up 
      // (only local variable in this spec holds reference to operations now) 
      G.recall(context.key, 'meta1', 'scope');
      //expect(context.mutated).to.eql(void 0);
      //expect(context.asis).to.eql(void 0);
      //expect(context.key).to.eql(void 0);

      // Reapply operation stored here in the local variable 
      // It brings up whole graph of state with it 
      G.call(op2);
      //expect(context.key).to.eql(op2);
      //expect(subject.mutated.valueOf()).to.eql('zalue666123');
      //expect(subject.mutated.$before.valueOf()).to.eql('zalue666');
      //expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      //expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
      //expect(G.stringify(context)).to.eql(G.stringify({
      //  context: 'context',
      //  key: 'zalue666',
      //  asis: 'zalue666'
      //}));
      //expect(G.stringify(subject)).to.eql(G.stringify({
      //  subject: 'subject',
      //  mutated: 'zalue666123'
      //}));

      // Reapply first operation 
      G.call(op);
      //expect(context.key).to.eql(op);
      //expect(subject.mutated.valueOf()).to.eql('value666123');
      //expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      //expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));
      //expect(G.stringify(context)).to.eql(G.stringify({
      //  context: 'context',
      //  key: 'value666',
      //  asis: 'value666'
      //}));
      //expect(G.stringify(subject)).to.eql(G.stringify({
      //  subject: 'subject',
      //  mutated: 'value666123'
      //}));
      }
      return 1;
    });
    it('should track side effects with transformations', function() {
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
        G.set(subject, 'mutated', value + 123);
        G.set(context, 'asis', value);
      });
      expect(context.asis.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['lol']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol123', 'lol']));

      // Apply transformation for the value that caused side effects 
      // It'll add transform op into state graph and recompute effects 
      callback = function(value) {
        return value + 666;
      };
      G.define(context, 'key', callback);
      expect(context.asis.valueOf()).to.eql('lol666');
      expect(subject.mutated.valueOf()).to.eql('lol666123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['lol666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol666', 'lol666123', 'lol666']));

      // Remove that transformation, recompute effects again 
      G.undefine(context, 'key', callback);
      expect(context.asis.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['lol']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol123', 'lol']));

      // Recall operation, store it in local variable 
      before = context.key;
      G.recall(before);
      expect(context.asis).to.eql(void 0);
      expect(subject.mutated).to.eql(void 0);

      // Add transformation again, does nothing 
      G.define(context, 'key', callback);
      expect(context.asis).to.eql(void 0);
      expect(subject.mutated).to.eql(void 0);

      // Restore operation back, effects will be reaplied with transformed value 
      G.call(before);
      expect(context.asis.valueOf()).to.eql('lol666');
      expect(subject.mutated.valueOf()).to.eql('lol666123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['lol666']));
      return expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol666', 'lol666123', 'lol666']));
    });
    it('should track revoke effect from context with transform', function() {
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
        G.set(subject, 'mutated', value);
        G.set(context, 'asis', value);
      };
      G.watch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol');
      expect(context.asis.valueOf()).to.eql('lol');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol', 'lol']));
      callback = function(value) {
        return value + 666;
      };
      G.define(subject, 'mutated', callback);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol666');
      expect(context.asis.valueOf()).to.eql('lol');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol', 'lol666', 'lol']));
      before = context.key;
      G.recall(context.key);
      expect(context.key).to.eql(void 0);
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      G.undefine(subject, 'mutated', callback);
      expect(context.key).to.eql(void 0);
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      G.call(before);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol');
      expect(context.asis.valueOf()).to.eql('lol');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol', 'lol']));
      G.unwatch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol']));
      G.define(subject, 'mutated', callback);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol']));
      G.watch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol666');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['lol', 'lol', 'lol666', 'lol']));
      return expect(context.asis.valueOf()).to.eql('lol');
    });
  })
  describe('Buffering', function() {

    it('should transact side effects in callbacks', function() {
      var context, op, op2, subject;
      context = {
        'context': 'context'
      };
      subject = {
        'subject': 'subject'
      };

      // Callback causes two side effects 
      G.watch(context, 'key', function(value) {
        G.set(subject, 'mutated', value + 123);
        G.set(context, 'asis', value);
      });
      G.effects.transact();
      op = G.set(context, 'key', 'value', 'meta1', 'scope');
      expect(context.key).to.eql(op);
      expect(subject.mutated).to.eql(undefined);
      expect(context.asis).to.eql(undefined);
      G.effects.commit()
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(context.asis.valueOf()).to.eql('value');

      // side effects are aware of their sequence 
      expect(subject.mutated.$before).to.eql(op);
      expect(subject.mutated.$after).to.eql(context.asis);
      expect(context.asis.$before).to.eql(subject.mutated);
      expect(context.asis.$after).to.eql(void 0);
      expect(G.stringify(subject)).to.eql(G.stringify({
        'subject': 'subject',
        mutated: 'value123'
      }));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value',
        asis: 'value'
      }));

      G.effects.transact();
      op2 = G.set(context, 'key', 'zalue', 'meta2', 'scope');
      expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(context.asis.valueOf()).to.eql('value');
      G.effects.commit()

      expect(subject.mutated.valueOf()).to.eql('zalue123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue123', 'zalue']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'zalue',
        asis: 'zalue'
      }));

      G.effects.transact();
      G.recall(context.key, 'meta2', 'scope');
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('zalue123');
      expect(context.asis.valueOf()).to.eql('zalue');
      G.effects.commit()
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(context.asis.valueOf()).to.eql('value');
      expect(subject.mutated.$before).to.eql(context.key);
      expect(subject.mutated.$after).to.eql(context.asis);
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123', 'value']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value',
        asis: 'value'
      }));

      G.effects.transact();
      G.recall(context.key, 'meta1', 'scope');
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(context.asis.valueOf()).to.eql('value');
      G.effects.commit()
      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(context.key).to.eql(void 0);

      G.effects.transact();
      G.call(op2);
      expect(context.key).to.eql(op2);
      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);

      G.effects.commit();
      expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue123', 'zalue']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'zalue',
        asis: 'zalue'
      }));
      expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'zalue123'
      }));


      G.effects.transact();
      G.call(op);
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('zalue123');
      expect(context.asis.valueOf()).to.eql('zalue');
      G.effects.commit();

      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value', 'zalue']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value123', 'value']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'value',
        asis: 'value'
      }));
      return expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'value123'
      }));
    });

    it ('should transact effects and transforms together', function() {

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
        G.set(subject, 'mutated', value + 123);

        // And another changes key in the same object 
        G.set(context, 'asis', value);
      });

      // The object also has a formatting accessor 
      G.define(context, 'key', function(value) {
        return value + 666;
      });

      G.effects.transact();
      op = G.set(context, 'key', 'value', 'meta1', 'scope');
      expect(context.key).to.eql(op);
      expect(context.key.valueOf()).to.eql('value666');
      expect(subject.mutated).to.eql(undefined);
      expect(context.asis).to.eql(undefined);
      G.effects.commit()

      expect(G.stringify(subject)).to.eql(G.stringify({
        'subject': 'subject',
        mutated: 'value666123'
      }));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value666',
        asis: 'value666'
      }));
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666']));
      expect(G.stringify(ValueStack(context.asis))).to.eql(G.stringify(['value666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));

      // Second operation over same key with different meta values 
      // (puts this value on top of the stack, references old value) 
      
      G.effects.transact();
      op2 = G.set(context, 'key', 'zalue', 'meta2', 'scope');
      expect(context.key).to.eql(op2);
      expect(context.key.valueOf()).to.eql('zalue666');
      expect(subject.mutated.valueOf()).to.eql('value666123');
      expect(context.asis.valueOf()).to.eql('value666');
      G.effects.commit()

      expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue666123');
      expect(G.stringify(ValueStack(context.asis))).to.eql(G.stringify(['zalue666']));
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'zalue666',
        asis: 'zalue666'
      }));

      // We recall that second operation to fall back to first 

      G.effects.transact();
      G.recall(context.key, 'meta2', 'scope');
      expect(context.key).to.eql(op);
      expect(context.key.valueOf()).to.eql('value666');
      expect(subject.mutated.valueOf()).to.eql('zalue666123');
      expect(context.asis.valueOf()).to.eql('zalue666');
      G.effects.commit()

      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value666123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        'context': 'context',
        key: 'value666',
        asis: 'value666'
      }));

      // The first operation is also recalled, objects are cleaned up 
      // (only local variable in this spec holds reference to operations now) 

      G.effects.transact();
      G.recall(context.key, 'meta1', 'scope');
      expect(context.key).to.eql(undefined);
      expect(subject.mutated.valueOf()).to.eql('value666123');
      expect(context.asis.valueOf()).to.eql('value666');
      G.effects.commit()

      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(context.key).to.eql(void 0);

      // Reapply operation stored here in the local variable 
      // It brings up whole graph of state with it 
      G.effects.transact();
      G.call(op2);
      expect(context.key).to.eql(op2);
      expect(context.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);

      G.effects.commit();
      //expect(context.key).to.eql(op2);
      expect(subject.mutated.valueOf()).to.eql('zalue666123');
      expect(subject.mutated.$before.valueOf()).to.eql('zalue666');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['zalue', 'zalue666', 'zalue666123', 'zalue666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'zalue666',
        asis: 'zalue666'
      }));
      expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'zalue666123'
      }));

      // Reapply first operation 
      G.effects.transact();
      G.call(op);
      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('zalue666123');
      expect(context.asis.valueOf()).to.eql('zalue666');
      G.effects.commit();

      expect(context.key).to.eql(op);
      expect(subject.mutated.valueOf()).to.eql('value666123');
      expect(G.stringify(ValueStack(context.key))).to.eql(G.stringify(['value666', 'zalue666']));
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['value', 'value666', 'value666123', 'value666']));
      expect(G.stringify(context)).to.eql(G.stringify({
        context: 'context',
        key: 'value666',
        asis: 'value666'
      }));
      expect(G.stringify(subject)).to.eql(G.stringify({
        subject: 'subject',
        mutated: 'value666123'
      }));
    })

  })
  describe('Updating', function() {
    it('should propagate value through callbacks and rebuild the tree', function() {
      var A = new G;

      var watcher2 = function(value) {
        G.set(value.$context, value.$key + '-left', value);
        if (value.$key.indexOf('left-right') > -1 || value.$key.indexOf('right-right') > -1)
        G.set(value.$context, value.$key + '-middle', value);
        G.set(value.$context, value.$key + '-right', value);
      };

      G.watch(A, 'key-left', watcher2);
      G.watch(A, 'key', watcher2);
      
      var transaction = G.record.transact() // same as `G.$caller = new G`

      A.set('key', 'test');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test', 'test', 'test', 'test', 'test']));
      
      A.set('key', 'test2');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2']));
      
      G.$caller = null  
      return;
    })




    it('should propagate value through callbacks and rebuild the bigger tree', function() {
      var A = new G;
      var B = new G;
      var C = new G;

      // Watcher causes two side effects 
      var watcher1 = function(value) {
        G.set(value.$context, value.$key + '-deeper', value);
      };

      var watcher2 = function(value) {
        G.set(value.$context, value.$key + '-left', value);
        if (value.$key.indexOf('left-right') > -1 || value.$key.indexOf('right-right') > -1)
        G.set(value.$context, value.$key + '-middle', value);
        G.set(value.$context, value.$key + '-right', value);
      };

      G.watch(A, 'key-left', watcher2);
      G.watch(A, 'key-right', watcher2);
      G.watch(A, 'key-left-left', watcher2);
      G.watch(A, 'key-left-right', watcher2);
      G.watch(A, 'key-right-right', watcher2);
      G.watch(A, 'key', watcher2);

      
      var transaction = G.record.transact() // same as `G.$caller = new G`


      A.set('key', 'test');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test', 'test', 'test', 'test', 'test',
                                                                                    'test', 'test', 'test', 'test', 'test',
                                                                                    'test', 'test', 'test', 'test', 'test']));
      

      A.set('key', 'test2');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2', 'test2', 'test2']));
      //G.$debug(transaction, 'big tree'); 
      G.unwatch(A, 'key-left-right', watcher2);

      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2']));

      //G.$debug(transaction, 'remove deep left observer');

      G.unwatch(A, 'key-left', watcher2);

      //G.$debug(transaction, 'remove left observer');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2']));

      G.unwatch(A, 'key-right', watcher2);
      //G.$debug(transaction, 'remove right observer');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2']));
      
      G.watch(A, 'key-right', watcher2);
      //G.$debug(transaction, 'put everything back');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2']));
      G.watch(A, 'key-left', watcher2);
      //G.$debug(transaction, 'put everything back');
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2']));
      G.watch(A, 'key-left-right', watcher2);
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2', 'test2', 'test2',
                                                                                    'test2', 'test2', 'test2', 'test2', 'test2']));
      G.$debug(transaction, 'Reassembled tree');
      G.$caller = null  
      return;
    })
  })
  

  describe ('Reusing', function() {
    it('should reuse effect', function() {
      var context = new G;
      var subject = new G;

      // Callback causes two side effects 
      context.watch('key', function(value) {
        G.set(subject, 'shared', true);
        G.set(subject, 'mutated', value + 123);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', true, 'test123']));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true, 'hola123']));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));

      expect(subject.shared).to.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)

      G.uncall(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', 'hola123']));
    })

    it('should not reuse stacked effect', function() {
      var context = new G;
      var subject = new G;

      // Callback causes two side effects 
      context.watch('key', function(value) {
        G.set(subject, 'shared', true, value.$meta);
        G.set(subject, 'mutated', value + 123);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', true, 'test123']));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true, 'hola123']));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));

      expect(subject.shared).to.not.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
      expect(subject.shared.$meta).to.eql(['zozo'])

      G.uncall(zozo)
      expect(subject.shared.$meta).to.eql(['xixi'])
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));

      G.call(zozo)
      expect(subject.shared).to.not.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
      expect(subject.shared.$meta).to.eql(['zozo'])
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));
      
      // remove from history, no observable changes
      G.revoke(xixi)
      expect(subject.shared).to.not.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
      expect(subject.shared.$meta).to.eql(['zozo'])
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));

      // but undoing zozo now has nothing to go back to
      G.uncall(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));
      expect(subject.shared).to.eql(undefined)
      expect(subject.mutated).to.eql(undefined)
    })


    it('should not reuse stacked array effect', function() {
      var context = new G;
      var subject = new G;

      // Callback causes two side effects 
      context.watch('key', function(value) {
        G.push(subject, 'shared', true, value.$meta);
        G.set(subject, 'mutated', value + 123);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', true, 'test123']));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true, 'hola123']));
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(ValueGroup(subject.shared))).to.eql(G.stringify([true]));

      expect(subject.shared).to.not.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
      expect(subject.shared.$meta).to.eql(['zozo'])

      G.uncall(zozo)
      expect(subject.shared.$meta).to.eql(['xixi'])
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));
      expect(G.stringify(ValueGroup(subject.shared))).to.eql(G.stringify([true]));

      G.call(zozo)
      expect(subject.shared).to.not.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
      expect(subject.shared.$meta).to.eql(['zozo'])
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));
      expect(G.stringify(ValueGroup(subject.shared))).to.eql(G.stringify([true]));
      
      // remove from history, no observable changes
      G.revoke(xixi)
      expect(subject.shared).to.not.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
      expect(subject.shared.$meta).to.eql(['zozo'])
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));
      expect(G.stringify(ValueGroup(subject.shared))).to.eql(G.stringify([true]));

      // but undoing zozo now has nothing to go back to
      G.uncall(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true, 'hola123']));
      expect(subject.shared).to.eql(undefined)
      expect(subject.mutated).to.eql(undefined)
    })

    it('should reuse effect before conditional value', function() {
      var context = new G;
      var subject = new G;

      // Callback causes two side effects 
      context.watch('key', function(value) {
        subject.set('shared', true);
        if (value == 'test')
          subject.set('mutated', value + 123);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', true, 'test123']));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true]));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));

      expect(subject.shared).to.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)

      G.uncall(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', true, 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola']));

      G.call(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true]));
    })
    it('should reuse effect after conditional value', function() {
      var context = new G;
      var subject = new G;

      // Callback causes two side effects 
      context.watch('key', function(value) {
        if (value == 'test')
          subject.set('mutated', value + 123);
        subject.set('shared', true);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', 'test123', true]));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true]));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));

      expect(subject.shared).to.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)

      G.uncall(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123', true]));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola']));

      G.call(zozo)
      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));
      expect(G.stringify(StateGraph(zozo))).to.eql(G.stringify(['hola', true]));
    })
    it('should reuse nested effect', function() {
      var context = new G;
      var subject = new G;

      subject.watch('shared', function(value) {
        G.set(subject, 'sharedeffect', !value)
      })

      // Callback causes two side effects 
      context.watch('key', function(value) {
        G.set(subject, 'shared', true);
        G.set(subject, 'mutated', value + 123);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', true, false, 'test123']));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true, false, 'hola123']));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));

      expect(subject.shared).to.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
    })
    it('should reuse nested effect after distinct effect', function() {
      var context = new G;
      var subject = new G;

      subject.watch('shared', function(value) {
        G.set(subject, 'sharedeffect', !value)
      })

      // Callback causes two side effects 
      context.watch('key', function(value) {
        G.set(subject, 'mutated', value + 123);
        G.set(subject, 'shared', true);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', 'test123', true, false]));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', 'hola123', true, false]));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));

      expect(subject.shared).to.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
    })
    it('should reuse nested effect before distinct effect', function() {
      var context = new G;
      var subject = new G;

      subject.watch('shared', function(value) {
        G.set(subject, 'sharedeffect', !value)
      })

      // Callback causes two side effects 
      context.watch('key', function(value) {
        G.set(subject, 'shared', true);
        G.set(subject, 'mutated', value + 123);
      });

      var xixi = context.set('key', 'test', 'xixi')
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['test', true, false, 'test123']));
      
      expect(Boolean(subject.shared)).to.eql(true)
      expect(String(subject.mutated)).to.eql('test123')

      var shared = subject.shared;
      var mutated = subject.mutated;

      var zozo = context.set('key', 'hola', 'zozo');
      expect(G.stringify(StateGraph(context.key))).to.eql(G.stringify(['hola', true, false, 'hola123']));

      expect(G.stringify(StateGraph(xixi))).to.eql(G.stringify(['test', 'test123']));

      expect(subject.shared).to.eql(shared)
      expect(subject.mutated).to.not.eql(mutated)
    })
  })

  describe('Transacting', function() {
    it('should write and update log of top-level operations', function() {
      var context = {
        'context': 'context',
        key: 'lol'
      };
      var subject = {
        'subject': 'subject'
      };

      // Watcher causes two side effects 
      watcher = function(value) {
        G.set(subject, 'mutated', value + 123);
        G.set(context, 'asis', value);
      };

      G.watch(context, 'key', watcher);
      G.watch(context, 'title', watcher);

      
      var transaction = G.record.transact() // same as `G.$caller = new G`


      G.set(context, 'key', 'test')
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'test', 'test123', 'test']));

      G.set(context, 'key', 'protest')
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'protest', 'protest123', 'protest']));

      G.set(context, 'zozo', 'kiki')
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'protest', 'protest123', 'protest', 'kiki']));

      G.set(context, 'key', 'grotesque')
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kiki']));

      G.set(context, 'xaxa', 'kek')
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kiki', 'kek']));

      G.set(context, 'zozo', 'buba')
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'buba', 'kek']));

      var zozo = context.zozo
      G.recall(context.zozo)
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kek']));

      G.call(zozo)
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'grotesque', 'grotesque123', 'grotesque', 'kek', 'buba']));
      
      var key = context.key
      G.recall(context.key)
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'kek', 'buba']));
      
      G.call(key)
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'kek', 'buba', 'grotesque', 'grotesque123', 'grotesque']));
      

      G.record.abort(transaction)
      expect(context.xaxa).to.eql(undefined)
      expect(context.zozo).to.eql(undefined)
      expect(context.key).to.eql(undefined)
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'kek', 'buba', 'grotesque', 'grotesque123', 'grotesque']));
      
      G.$debug(transaction);

      G.record.commit(transaction)
      expect(context.xaxa).to.eql(transaction.$after)
      expect(context.zozo).to.eql(transaction.$after.$after)
      expect(context.key).to.eql(G.value.formatted(transaction.$after.$after.$after))
      expect(G.stringify(StateGraph(transaction))).to.eql(G.stringify([transaction, 'kek', 'buba', 'grotesque', 'grotesque123', 'grotesque']));

    })
  });




})
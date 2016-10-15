describe ('G.set', function() {
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
    it('should handle side effects with transformations', function() {
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
    it('should handle revoke effect from context with transform', function() {
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
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol', 'lol']));
      callback = function(value) {
        return value + 666;
      };
      G.watch(subject, 'mutated', callback, true);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol666');
      expect(context.asis.valueOf()).to.eql('lol');
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol', 'lol666', 'lol']));
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
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol', 'lol']));
      G.unwatch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol']));
      G.watch(subject, 'mutated', callback, true);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated).to.eql(void 0);
      expect(context.asis).to.eql(void 0);
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol']));
      G.watch(context, 'key', watcher);
      expect(context.key.valueOf()).to.eql('lol');
      expect(subject.mutated.valueOf()).to.eql('lol666');
      expect(JSON.stringify(StateGraph(context.key))).to.eql(JSON.stringify(['lol', 'lol', 'lol666', 'lol']));
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

      
      var transaction = G.transact() // same as `G.$caller = new G`


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
      

      G.abort(transaction)
      expect(context.xaxa).to.eql(undefined)
      expect(context.zozo).to.eql(undefined)
      expect(context.key).to.eql(undefined)
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'kek', 'buba', 'grotesque', 'grotesque123', 'grotesque']));
      

      G.commit(transaction)
      expect(context.xaxa).to.eql(transaction.$after)
      expect(context.zozo).to.eql(transaction.$after.$after)
      expect(context.key).to.eql(G.Formatted(transaction.$after.$after.$after))
      expect(JSON.stringify(StateGraph(transaction))).to.eql(JSON.stringify([transaction, 'kek', 'buba', 'grotesque', 'grotesque123', 'grotesque']));
      

    })
})
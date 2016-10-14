(function() {
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

}).call(this);


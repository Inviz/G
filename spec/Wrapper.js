
describe('Proxy setting', function() {
  it('should wrap object around via ES6 proxy', function() {
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

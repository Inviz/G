describe('G.Action', function() {
  xdescribe ('With node', function() {
    it('should produce navigate action from link', function() {
      var link = G.Node('a', {'href': 'http://google.com'});
      var action = G.Action(link);

      var stub = new G;
      stub.$method = 'send';
      stub.$context = link;
      stub.$key = 'href';
      expect(action).to.eql(stub);
    })

    it('should produce navigate action from form', function() {
      var form = G.Node('form', {'action': 'http://google.com'});
      var action = G.Action(form);

      var stub = new G;
      stub.$method = 'send';
      stub.$context = form;
      stub.$key = 'action';
      expect(action).to.eql(stub);
    })

    it('should produce click action from button', function() {
      var button = G.Node('button');
      var action = G.Action(button);

      var stub = new G;
      stub.$method = 'click';
      stub.$context = button;
      stub.$key = 'onclick';
      expect(action).to.eql(stub);
    })

    it('should produce check action from checkbox', function() {
      var checkbox = G.Node('input', {type: 'checkbox'});
      var action = G.Action(checkbox);

      var stub = new G;
      stub.$method = 'check';
      stub.$context = checkbox;
      stub.$key = 'oncheck';
      expect(action).to.eql(stub);
    })

    it('should produce check action from checkbox', function() {
      var checkbox = G.Node('input', {type: 'checkbox'});
      var action = G.Action(checkbox);

      var stub = new G;
      stub.$method = 'check';
      stub.$context = checkbox;
      stub.$key = 'oncheck';
      expect(action).to.eql(stub);
    })
  })
})
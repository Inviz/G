describe('G.Node', function() {
  it ('should reuse JSX AST', function() {

    var tree = G.Node(
      "div",
      null,
      G.Node(
        "h1",
        null,
        "Hello world"
      ),
      G.Node(
        'if',
        { published: true },
        "Published",
        G.Node(
          "button",
          { "class": "blah" },
          "Unpublish"
        )
      ),
      G.Node(
        'else',
        null,
        "This this is not published",
        G.Node(
          "button",
          { test: "blah" },
          "Publish"
        )
      ),
      G.Node(
        "p",
        null,
        "Test"
      )
    );

    var tags = function(e) {
      return e.tag || e.text || e.rule
    };

    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var IF = tree.$following.$following.$following;
    var ELSE = IF.$following.$following.$following.$following;
    
    G.Node.recall(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$following.$following
    var publishButton = ELSE.$following.$following
    G.Node.recall(unpublishButton)

    expect(ValueGroup(IF).map(tags)).to.eql(["if", "Published"])

    G.Node.call(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    G.Node.call(unpublishButton)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<if published="true">Published<button class="blah">Unpublish</button></if>' +
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')


    G.Node.recall(IF)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')
    G.Node.recall(publishButton)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published</else>' + 
    '<p>Test</p></div>')

    G.Node.call(IF)
    G.Node.recall(ELSE)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<if published="true">Published<button class="blah">Unpublish</button></if>' +
    '<p>Test</p></div>')


    G.Node.call(publishButton)
    G.Node.call(ELSE)
    G.Node.recall(IF)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')
  })


  it ('should use JSX namespaced tags <G.If> & tags that produce no DOM elements ', function() {

    var tree = G.Node(
      "div",
      null,
      G.Node(
        "h1",
        null,
        "Hello world"
      ),
      G.Node(
        G.If,
        { published: true },
        "Published",
        G.Node(
          "button",
          { "class": "blah" },
          "Unpublish"
        )
      ),
      G.Node(
        G.Else,
        null,
        "This this is not published",
        G.Node(
          "button",
          { test: "blah" },
          "Publish"
        )
      ),
      G.Node(
        "p",
        null,
        "Test"
      )
    );

    var tags = function(e) {
      return e.tag || e.text || e.rule
    };

    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var IF = tree.$following.$following.$following;
    var ELSE = tree.$following.$following.$following.$following.$following.$following.$following;
    
    G.Node.recall(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$following.$following
    var publishButton = ELSE.$following.$following
    G.Node.recall(unpublishButton)

    expect(ValueGroup(IF).map(tags)).to.eql(["if", "Published"])

    G.Node.call(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    G.Node.call(unpublishButton)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'Published<button class="blah">Unpublish</button>' +
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')


    G.Node.recall(IF)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')
    G.Node.recall(publishButton)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published' + 
    '<p>Test</p></div>')

    G.Node.call(IF)
    G.Node.recall(ELSE)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'Published<button class="blah">Unpublish</button>' +
    '<p>Test</p></div>')


    G.Node.call(publishButton)
    G.Node.call(ELSE)
    G.Node.recall(IF)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')
  })

  it ('shoul')
})
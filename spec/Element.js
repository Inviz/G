describe('G.Element', function() {
  it ('should reuse JSX AST', function() {

    var tree = G.Element(
      "div",
      null,
      G.Element(
        "h1",
        null,
        "Hello world"
      ),
      G.Element(
        'if',
        { published: true },
        "Published",
        G.Element(
          "button",
          { "class": "blah" },
          "Unpublish"
        )
      ),
      G.Element(
        'else',
        null,
        "This this is not published",
        G.Element(
          "button",
          { test: "blah" },
          "Publish"
        )
      ),
      G.Element(
        "p",
        null,
        "Test"
      )
    );

    var tags = function(e) {
      return e.tag || e.text || e.rule
    };

    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var IF = tree.$after.$after.$after;
    var ELSE = tree.$after.$after.$after.$after.$after.$after.$after;
    
    G.Element.recall(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$after.$after
    var publishButton = ELSE.$after.$after
    G.Element.recall(unpublishButton)

    expect(ValueGroup(IF).map(tags)).to.eql(["if", "Published"])

    G.Element.call(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    G.Element.call(unpublishButton)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<if published="true">Published<button class="blah">Unpublish</button></if>' +
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')


    G.Element.recall(IF)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')
    G.Element.recall(publishButton)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published</else>' + 
    '<p>Test</p></div>')

    G.Element.call(IF)
    G.Element.recall(ELSE)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<if published="true">Published<button class="blah">Unpublish</button></if>' +
    '<p>Test</p></div>')


    G.Element.call(publishButton)
    G.Element.call(ELSE)
    G.Element.recall(IF)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')
  })
})



describe('G.Element', function() {
  it ('should reuse JSX AST', function() {

    var tree = G.Element(
      "div",
      null,
      G.Element(
        "h1",
        null,
        "Hello world"
      ),
      G.Element(
        G.If,
        { published: true },
        "Published",
        G.Element(
          "button",
          { "class": "blah" },
          "Unpublish"
        )
      ),
      G.Element(
        G.Else,
        null,
        "This this is not published",
        G.Element(
          "button",
          { test: "blah" },
          "Publish"
        )
      ),
      G.Element(
        "p",
        null,
        "Test"
      )
    );

    var tags = function(e) {
      return e.tag || e.text || e.rule
    };

    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var IF = tree.$after.$after.$after;
    var ELSE = tree.$after.$after.$after.$after.$after.$after.$after;
    
    G.Element.recall(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$after.$after
    var publishButton = ELSE.$after.$after
    G.Element.recall(unpublishButton)

    expect(ValueGroup(IF).map(tags)).to.eql(["if", "Published"])

    G.Element.call(IF)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    G.Element.call(unpublishButton)
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'Published<button class="blah">Unpublish</button>' +
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')


    G.Element.recall(IF)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')
    G.Element.recall(publishButton)

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published' + 
    '<p>Test</p></div>')

    G.Element.call(IF)
    G.Element.recall(ELSE)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'Published<button class="blah">Unpublish</button>' +
    '<p>Test</p></div>')


    G.Element.call(publishButton)
    G.Element.call(ELSE)
    G.Element.recall(IF)
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')
  })
})
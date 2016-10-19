describe('G.Node', function() {
  it ('should be able to set attributes', function() {
    var span = new G.Node('span')
    span.set('class', 'test')
    expect(span.render().outerHTML).to.eql('<span class="test"></span>')

    // add class
    var zest = span.set('class', 'zest')
    expect(span.render().outerHTML).to.eql('<span class="zest"></span>')

    // rewrite class
    var cool = span.push('class', 'cool')
    expect(span.render().outerHTML).to.eql('<span class="zest cool"></span>')

    // add class 
    var zuul = span.unshift('class', 'zuul', 'spook source')
    expect(span.render().outerHTML).to.eql('<span class="zuul zest cool"></span>')

    // recall all classes set with no extra arguments
    span.class.recall()
    expect(span.render().outerHTML).to.eql('<span class="zuul"></span>')
    
    // add class on top
    span.unshift('class', cool)
    expect(span.render().outerHTML).to.eql('<span class="cool zuul"></span>')

    // push class to the end
    span.push('class', zest)
    expect(span.render().outerHTML).to.eql('<span class="cool zuul zest"></span>')

    // recall zuul class by its meta
    span.class.recall('spook source')
    expect(span.render().outerHTML).to.eql('<span class="cool zest"></span>')

    // replace array with a single value
    span.set('class', zuul)
    expect(span.render().outerHTML).to.eql('<span class="zuul"></span>')

    // remove value, fall back to array
    span.class.recall('spook source')
    expect(span.render().outerHTML).to.eql('<span class="cool zest"></span>')

    span.add('class', 'fool');
    expect(span.render().outerHTML).to.eql('<span class="cool zest fool"></span>')

    span.add('class', 'fool', 'something else says fool');
    expect(span.render().outerHTML).to.eql('<span class="cool zest fool"></span>')

    // removes all classes without meta, but fool is still there - 
    // it felt back to operation with meta
    span.class.recall()
    expect(span.render().outerHTML).to.eql('<span class="fool"></span>')
    
    span.class.recall('something else says fool')
    expect(span.render().outerHTML).to.eql('<span></span>')

  })
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
    
    IF.recall()
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$following.$following
    var publishButton = ELSE.$following.$following
    unpublishButton.recall()

    expect(ValueGroup(IF).map(tags)).to.eql(["if", "Published"])

    IF.call()
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    unpublishButton.call()
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<if published="true">Published<button class="blah">Unpublish</button></if>' +
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')


    IF.recall()
    
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
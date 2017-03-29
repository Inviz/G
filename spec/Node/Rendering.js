describe('G.Node rendering', function() {
  var tags = function(e) {
    return String(e.tag || e.text || e.rule)
  };
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



    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var IF = tree.$following.$following.$following;
    var ELSE = IF.$following.$following.$following.$following;
    
    IF.uncall()
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$following.$following
    var publishButton = ELSE.$following.$following
    unpublishButton.uncall()

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


    IF.uncall()
    
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published<button test="blah">Publish</button></else>' + 
    '<p>Test</p></div>')
    publishButton.uncall()

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<else>This this is not published</else>' + 
    '<p>Test</p></div>')

    G.Node.call(IF)
    ELSE.uncall()
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    '<if published="true">Published<button class="blah">Unpublish</button></if>' +
    '<p>Test</p></div>')


    G.Node.call(publishButton)
    G.Node.call(ELSE)
    IF.uncall()
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

    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "if", "Published", "button", "Unpublish", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var IF = tree.$following.$following.$following;
    var ELSE = tree.$following.$following.$following.$following.$following.$following.$following;
    
    IF.uncall()
    expect(ValueGroup(tree).map(tags)).to.eql(["div", "h1", "Hello world", "else", "This this is not published", "button", "Publish", "p", "Test"])
  
    var unpublishButton = IF.$following.$following
    var publishButton = ELSE.$following.$following
    unpublishButton.uncall()

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


    IF.uncall()

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')
    publishButton.uncall()

    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published' + 
    '<p>Test</p></div>')

    G.Node.call(IF)
    ELSE.uncall()
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'Published<button class="blah">Unpublish</button>' +
    '<p>Test</p></div>')


    G.Node.call(publishButton)
    G.Node.call(ELSE)
    IF.uncall()
    expect(tree.render().outerHTML).to.eql(
    '<div><h1>Hello world</h1>' + 
    'This this is not published<button test="blah">Publish</button>' + 
    '<p>Test</p></div>')
  });

  it ('should initialize tree from DOM node', function() {
    var html = "<div><h1> Hello guys</h1><!-- if -->This <p>is</p> wonderful<!-- /if --> <h2>For real</h2></div>"
    var fragment = document.createRange().createContextualFragment(html);

    var tree = G.Node(fragment);

    expect(G.stringify(TagTree(tree))).to.eql(G.stringify([undefined, {}, 
      ['div', {}, 
        ['h1', {}, 
          ' Hello guys'],
        ['if', {}, 
          'This ', 
          ['p', {},
            'is'],
          ' wonderful'],
        ' ',
        ['h2', {}, 'For real']
      ]
    ]))
  })


  it ('should unwrap tree from DOM node', function() {
    var html = "<div><h1> Hello guys</h1><if a=b>This <p>is</p> wonderful!!</if> <if>It <p>aint</p> cool</if> <h2>For real</h2></div>"
    var fragment = document.createRange().createContextualFragment(html);

    var tree = G.Node(fragment);

    expect(G.stringify(TagTree(tree))).to.eql(G.stringify([undefined, {}, 
      ['div', {}, 
        ['h1', {}, 
          ' Hello guys'],
        ['if', {a: 'b'}, 
          'This ', 
          ['p', {},
            'is'],
          ' wonderful!!'],
        ' ',
        ['if', {}, 
          'It ', 
          ['p', {},
            'aint'],
          ' cool'],
        ' ',
        ['h2', {}, 'For real']
      ]
    ]))

    tree.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    var IF = tree.$first.$first.$next;
    IF.uncall()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')


    tree.transact()   // dont update dom

    IF.uncall() // dom not updated
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    tree.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    tree.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    IF.uncall()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    IF.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    IF.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    IF.uncall()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    tree.commit(true);
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    tree.commit(true);
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    IF.uncall()
    G.Node.call(IF)

    expect(tree.$attaching).to.eql([IF])
    expect(tree.$detaching).to.eql([])

    G.Node.call(IF)
    expect(tree.$attaching).to.eql([IF])
    expect(tree.$detaching).to.eql([])

    IF.uncall()
    expect(tree.$attaching).to.eql([])
    expect(tree.$detaching).to.eql([IF])
    
    IF.uncall()
    expect(tree.$attaching).to.eql([])
    expect(tree.$detaching).to.eql([IF])

    tree.commit()
  })
})
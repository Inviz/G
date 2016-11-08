describe('G.Node', function() {
  it ('should be able to set attributes', function() {
    var span = new G.Node('span')
    span.set('class', 'test', ':)')
    expect(span.render().outerHTML).to.eql('<span class="test"></span>')

    // add class
    var zest = span.set('class', 'zest', ':)')
    expect(span.$node.outerHTML).to.eql('<span class="zest"></span>')

    // rewrite class
    var cool = span.push('class', 'cool', ':)')
    expect(span.$node.outerHTML).to.eql('<span class="zest cool"></span>')

    // add class 
    var zuul = span.unshift('class', 'zuul', 'spook source')
    expect(span.$node.outerHTML).to.eql('<span class="zuul zest cool"></span>')

    // recall all classes set with no extra arguments
    span.class.recall(':)')
    expect(span.$node.outerHTML).to.eql('<span class="zuul"></span>')
    
    // add class on top
    span.unshift('class', cool)
    expect(span.$node.outerHTML).to.eql('<span class="cool zuul"></span>')

    // push class to the end
    span.push('class', zest)
    expect(span.$node.outerHTML).to.eql('<span class="cool zuul zest"></span>')

    // recall zuul class by its meta
    span.class.recall('spook source')
    expect(span.$node.outerHTML).to.eql('<span class="cool zest"></span>')

    // replace array with a single value
    span.set('class', zuul)
    expect(span.$node.outerHTML).to.eql('<span class="zuul"></span>')

    // remove value, fall back to array
    span.class.recall('spook source')
    expect(span.$node.outerHTML).to.eql('<span class="cool zest"></span>')

    // Add a class without meta
    span.add('class', 'fool', ':)');
    expect(span.$node.outerHTML).to.eql('<span class="cool zest fool"></span>')

    // Add same class with meta, it doesnt create duplicate
    span.add('class', 'fool', 'something else says fool');
    expect(span.$node.outerHTML).to.eql('<span class="cool zest fool"></span>')

    // removes all classes without meta, but fool is still there - 
    // it felt back to operation with meta
    span.class.recall(':)')
    expect(span.$node.outerHTML).to.eql('<span class="fool"></span>')

    span.class.recall('something else says fool')
    expect(span.$node.outerHTML).to.eql('<span></span>')


  })

  it ('should be able to set attributes when in transaction', function() {
    var span = new G.Node('span')
    span.transact()
    span.set('class', 'test', ':)')
    expect(span.$node).to.eql(undefined)
    expect(span.render().outerHTML).to.eql('<span class="test"></span>')

    // add class
    var zest = span.set('class', 'zest', ':)')
    expect(span.$node.outerHTML).to.eql('<span class="test"></span>')
    expect(span.render().outerHTML).to.eql('<span class="zest"></span>')

    // rewrite class
    var cool = span.push('class', 'cool', ':)')
    expect(span.$node.outerHTML).to.eql('<span class="zest"></span>')
    expect(span.render().outerHTML).to.eql('<span class="zest cool"></span>')

    // add class 
    var zuul = span.unshift('class', 'zuul', 'spook source')
    expect(span.$node.outerHTML).to.eql('<span class="zest cool"></span>')
    expect(span.render().outerHTML).to.eql('<span class="zuul zest cool"></span>')

    // recall all classes set with `:)` 
    span.class.recall(':)')
    expect(span.$node.outerHTML).to.eql('<span class="zuul zest cool"></span>')
    expect(span.render().outerHTML).to.eql('<span class="zuul"></span>')
    
    // add class on top
    span.unshift('class', cool)
    expect(span.$node.outerHTML).to.eql('<span class="zuul"></span>')
    expect(span.render().outerHTML).to.eql('<span class="cool zuul"></span>')

    // push class to the end
    span.push('class', zest)
    expect(span.$node.outerHTML).to.eql('<span class="cool zuul"></span>')
    expect(span.render().outerHTML).to.eql('<span class="cool zuul zest"></span>')

    // recall zuul class by its meta
    span.class.recall('spook source')
    expect(span.$node.outerHTML).to.eql('<span class="cool zuul zest"></span>')
    expect(span.render().outerHTML).to.eql('<span class="cool zest"></span>')

    // replace array with a single value
    span.set('class', zuul)
    expect(span.$node.outerHTML).to.eql('<span class="cool zest"></span>')
    expect(span.render().outerHTML).to.eql('<span class="zuul"></span>')

    // remove value, fall back to array
    span.class.recall('spook source')
    expect(span.$node.outerHTML).to.eql('<span class="zuul"></span>')
    expect(span.render().outerHTML).to.eql('<span class="cool zest"></span>')

    // Add a class with same meta meta
    span.add('class', 'fool', ':)');
    expect(span.$node.outerHTML).to.eql('<span class="cool zest"></span>')
    expect(span.render().outerHTML).to.eql('<span class="cool zest fool"></span>')

    // Add same class with meta, it doesnt create duplicate
    span.add('class', 'fool', 'something else says fool');
    expect(span.$node.outerHTML).to.eql('<span class="cool zest fool"></span>')
    expect(span.render().outerHTML).to.eql('<span class="cool zest fool"></span>')

    // removes all classes without meta, but fool is still there - 
    // it felt back to operation with meta
    span.class.recall(':)')
    expect(span.$node.outerHTML).to.eql('<span class="cool zest fool"></span>')
    expect(span.render().outerHTML).to.eql('<span class="fool"></span>')

    span.class.recall('something else says fool')
    expect(span.$node.outerHTML).to.eql('<span class="fool"></span>')
    expect(span.render().outerHTML).to.eql('<span></span>')

    // remove global pointer
    span.commit()
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
    var html = "<div><h1> Hello guys</h1><if a=b>This <p>is</p> wonderful!!</if> <if b=c>It <p>aint</p> cool</if> <h2>For real</h2></div>"
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
    G.Node.recall(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')


    tree.transact()   // dont update dom

    G.Node.recall(IF) // dom not updated
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    tree.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    tree.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    G.Node.recall(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    IF.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    IF.render()
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    G.Node.recall(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    tree.commit(true);
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    G.Node.call(IF)
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1> It <p>aint</p> cool <h2>For real</h2>')

    tree.commit(true);
    expect(tree.$node.firstChild.innerHTML).to.eql('<h1> Hello guys</h1>This <p>is</p> wonderful!! It <p>aint</p> cool <h2>For real</h2>')

    G.Node.recall(IF)
    G.Node.call(IF)

    expect(tree.$attaching).to.eql([IF])
    expect(tree.$detaching).to.eql([])

    G.Node.call(IF)
    expect(tree.$attaching).to.eql([IF])
    expect(tree.$detaching).to.eql([])

    G.Node.recall(IF)
    expect(tree.$attaching).to.eql([])
    expect(tree.$detaching).to.eql([IF])
    
    G.Node.recall(IF)
    expect(tree.$attaching).to.eql([])
    expect(tree.$detaching).to.eql([IF])

  })

  it ('should build within iterator', function() {
    var context = new G;
    var item1 = new G({title: 'Title #1'})
    var first = context.push('items', item1);
    var second = context.push('items', {title: 'Title #2'});

    var fragment = context.watch('items', function(item) {
      return G.Node('article', null, 
        G.Node('h1', null, item.title),
        G.Node('hr'),
        G.Node('p', null, item.text))
    })

    var wrapper = G.Node('main', null, 
      G.Node('header', null, 'Hello world'),
      fragment,
      G.Node('footer', null, 'Bye world'))

    expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #1</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

    context.unshift('items', {title: 'Title #0'});
    expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title #1</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

    context.push('items', {title: 'Title #3'});
        expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title #1</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<article><h1>Title #3</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

    item1.set('title', 'Title One')

      expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title One</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<article><h1>Title #3</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

    first.uncall()

    expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<article><h1>Title #3</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')


    first.call()

    expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title One</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<article><h1>Title #3</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

    var last = context.items.uncall();

    expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title One</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

    debugger
    last.call()


    expect(wrapper.render().outerHTML).to.eql(
      '<main>' +
        '<header>Hello world</header>' + 
        '<article><h1>Title #0</h1><hr><p></p></article>' + 
        '<article><h1>Title One</h1><hr><p></p></article>' + 
        '<article><h1>Title #2</h1><hr><p></p></article>' + 
        '<article><h1>Title #3</h1><hr><p></p></article>' + 
        '<footer>Bye world</footer>' + 
      '</main>')

  })
})

TagTree = function(node, recursive) {
    if (node.$current) {
      node = node.$current;
      recursive = false;
    }
    var attrs = node.clean();
    delete attrs.tag;
    delete attrs.rule;
    var result = [node.tag || node.rule, attrs]

    for (var child = node.$first; child; child = child.$next)

        result.push(child.tag || child.rule || child.$current ? TagTree(child, true) : child.text)


    if (!recursive && node.$previous) {
      result = [result]
      while (node.$previous) {
        node = node.$previous;
        result.unshift(TagTree(node, true))
      }
    }

    return result;

}
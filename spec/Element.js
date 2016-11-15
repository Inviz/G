describe('G.Node', function() {

  var tags = function(e) {
    return String(e.tag || e.text || e.rule)
  };
  describe('Building', function() {
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
    });

  })
  describe('Migrating', function() {

    it ('should migrate text node content', function() {
      G.Node.record()
      var node = G.Node('article', null, 'Hello world');
      var record = G.Node.stop()

      expect(node.$first.text).to.eql('Hello world')
      debugger
      node.migrate(record)
      G.Node('article', null, 'Bye world');
      node.finalize()
      expect(node.$first.text).to.eql('Bye world')
    })

    it ('should migrate attribute change', function() {
      G.Node.record()
      var node = G.Node('article', {class: 'test'});
      var record = G.Node.stop()
      expect(String(node.class)).to.eql('test')

      node.migrate(record)
      G.Node('article', {class: 'nest'});
      node.finalize()
      expect(String(node.class)).to.eql('nest')
    })

    it ('should migrate removal of an attribute', function() {
      G.Node.record()
      var node = G.Node('article', {class: 'test'});
      var record = G.Node.stop()
      expect(String(node.class)).to.eql('test')

      node.migrate(record)
      G.Node('article', {});
      node.finalize()
      expect(node.class).to.eql(undefined)
    })

    it ('should migrate deep changes', function() {
      G.Node.record()
      var article = G.Node('article', {class: 'test'}, 
        G.Node('h1', null, 'Hey guys'),
        G.Node('button', {class: 'big'}, 'Press me'));
      var record = G.Node.stop()

      var h1 = article.$first;
      var button = article.$last;
      var title = h1.$first;
      var label = button.$first;

      expect(h1.class).to.eql(undefined)
      expect(String(article.class)).to.eql('test')
      expect(String(button.class)).to.eql('big')

      expect(String(title.text)).to.eql('Hey guys')
      expect(String(label.text)).to.eql('Press me')

      article.migrate(record)
      G.Node('article', {class: 'not-test'}, 
        G.Node('h1', {class: 'tight'}, 'Hey gals'),
        G.Node('button', null, 'Push me'));
      article.finalize()

      expect(String(h1.class)).to.eql('tight')
      expect(String(article.class)).to.eql('not-test')
      expect(button.class).to.eql(undefined)

      expect(String(title.text)).to.eql('Hey gals')
      expect(String(label.text)).to.eql('Push me')
    })


    it ('should migrate deep changes keeping other effects in place', function() {
      G.Node.record()
      var article = G.Node('article', {class: 'test'}, 
        G.Node('h1', null, 'Hey guys'),
        G.Node('button', {class: 'big'}, 'Press me'));
      var record = G.Node.stop()

      var h1 = article.$first;
      var button = article.$last;
      var title = h1.$first;
      var label = button.$first;

      expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['test']))
      expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['big']))

      // apply some effects
      h1.push('class', 'header')      // "header" is added
      article.set('class', 'custom'); // "test" is replaced with "custom"
      button.push('class', 'deal')    // "deal" is added to "big"

      expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['custom']))
      expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['big', 'deal']))

      article.migrate(record)
      G.Node('article', {class: 'not-test'}, 
        G.Node('h1', {class: 'tight'}, 'Hey gals'),
        G.Node('button', null, 'Push me'));
      record = article.finalize()

      expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['custom']))
      expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['deal']))
      expect(G.stringify(ValueGroup(h1.class))).to.eql(G.stringify(['header', 'tight']))

      article.migrate(record)
      G.Node('article', {}, 
        G.Node('h1', null, 'Hey gals'),
        G.Node('button', {class: 'best'}, 'Push me'));
      article.finalize()

      expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['custom']))
      expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['deal', 'best']))
      expect(G.stringify(ValueGroup(h1.class))).to.eql(G.stringify(['header']))
    })
  })
  describe('Updating', function() {
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
  })
  
  describe('Initializing', function() {

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

      tree.commit()
    })
  })
  describe("Looping", function() {
    it ('should build within iterator', function() {
      var context = new G;
      var item1 = new G({title: 'Title #1'})
      var first = context.push('items', item1);
      var second = context.push('items', {title: 'Title #2'});

      var fragment = context.watch('items', function(item) {
        /*return <article>
          <h1>{item.title}</h1>
          <hr />
          <p>{item.text}</p>
        </article>*/

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

      context.items.set('title', 'Title Three')

      expect(wrapper.render().outerHTML).to.eql(
        '<main>' +
          '<header>Hello world</header>' + 
          '<article><h1>Title #0</h1><hr><p></p></article>' + 
          '<article><h1>Title One</h1><hr><p></p></article>' + 
          '<article><h1>Title #2</h1><hr><p></p></article>' + 
          '<article><h1>Title Three</h1><hr><p></p></article>' + 
          '<footer>Bye world</footer>' + 
        '</main>')
    })


    it ('should build within iterator and batch render', function() {
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
      context.push('items', {title: 'Title #3'});
      item1.set('title', 'Title One')
      first.uncall()


      var last = context.items.uncall();

      expect(wrapper.render().outerHTML).to.eql(
        '<main>' +
          '<header>Hello world</header>' + 
          '<article><h1>Title #0</h1><hr><p></p></article>' + 
          '<article><h1>Title #2</h1><hr><p></p></article>' + 
          '<footer>Bye world</footer>' + 
        '</main>')

      context.items.set('title', 'Title Two')
      last.call()
      first.call()
      context.items.set('title', 'Title Three')

      expect(wrapper.render().outerHTML).to.eql(
        '<main>' +
          '<header>Hello world</header>' + 
          '<article><h1>Title #0</h1><hr><p></p></article>' + 
          '<article><h1>Title One</h1><hr><p></p></article>' + 
          '<article><h1>Title Two</h1><hr><p></p></article>' + 
          '<article><h1>Title Three</h1><hr><p></p></article>' + 
          '<footer>Bye world</footer>' + 
        '</main>')

    })
  })

  describe('Composing', function() {
    it ('should inherit values object from parent form', function() {
      var form = new G.Node('form', {method: 'post', action: '/whatever.html'},
        new G.Node('label', null, 'What is your name?'),
        new G.Node('input', {name: 'your_name', value: 'Boris'}),
        new G.Node('input', {type: 'submit'})
      );
      var input = form.$first.$next;

      expect(form.values).to.not.eql(undefined)
      expect(input.values).to.eql(form.values)
      expect(String(form.values.your_name)).to.eql('Boris')

      input.set('value', 'Vasya')

      expect(String(form.values.your_name)).to.eql('Vasya')

      input.set('name', 'MY_NAME')
      
      expect(String(form.values.MY_NAME)).to.eql('Vasya')
      expect(form.values.your_name).to.eql(undefined)

      input.set('value', 'Johny')
      expect(String(form.values.MY_NAME)).to.eql('Johny')
      expect(form.values.your_name).to.eql(undefined)


    })
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
    var str = node.tag || node.rule;
    var result = [str && String(str), attrs]

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
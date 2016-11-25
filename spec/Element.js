describe('G.Node', function() {

  var tags = function(e) {
    return String(e.tag || e.text || e.rule)
  };
  describe('Referencing', function() {
    
    it ('should be able to use nodes as values', function() {
      var context = new G;
      var parent = G.Node('parent');
      var child = G.Node('child');

      parent.appendChild(child);

      context.set('wrapper', parent);
      context.set('content', child)

      expect(context.wrapper).to.eql(parent)
      expect(context.content).to.eql(child)
      expect(child.$parent).to.eql(parent);
      expect(parent.$first).to.eql(child)
      
      child.uncall();
      expect(context.wrapper).to.eql(parent)
      expect(context.content).to.eql(undefined)
      expect(child.$parent).to.eql(parent);
      expect(parent.$first).to.eql(undefined)

      child.call();
      expect(context.wrapper).to.eql(parent)
      expect(context.content).to.eql(child)
      expect(child.$parent).to.eql(parent);
      expect(parent.$first).to.eql(child)
    })
  })
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

  })
  describe('Migrating', function() {

    it ('should migrate text node content', function() {
      G.Node.record()
      var node = G.Node('article', null, 'Hello world');
      var record = G.Node.stop()

      expect(String(node.$first.text)).to.eql('Hello world')
      node.migrate(record)
      G.Node('article', null, 'Bye world');
      node.finalize()
      expect(String(node.$first.text)).to.eql('Bye world')
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
      expect(G.stringify(ValueGroup(h1.class))).to.eql(G.stringify(['tight', 'header']))

      article.migrate(record)
      G.Node('article', {}, 
        G.Node('h1', null, 'Hey gals'),
        G.Node('button', {class: 'best'}, 'Push me'));
      article.finalize()

      expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['custom']))
      expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['best', 'deal']))
      expect(G.stringify(ValueGroup(h1.class))).to.eql(G.stringify(['header']))
    })

    it ('should migrate template created by observer', function() {
      var context = new G;
      var yaro = context.set('person', {name: 'Yaro', age: 26});

      var future = context.watch('person', function(person) {
        return G.Node('article', {class: 'age-' + person.age },
          G.Node('h1', null, person.name),
          G.Node('span', null, 'age is ' + person.age))
      });

      var article = future.$current;

      expect(future.$current.render().outerHTML).to.eql('<article class="age-26"><h1>Yaro</h1><span>age is 26</span></article>')

      context.person.set('age', 27)

      expect(future.$current.render().outerHTML).to.eql('<article class="age-27"><h1>Yaro</h1><span>age is 27</span></article>')

      expect(article).to.eql(future.$current)

      yaro.uncall()

      expect(future.$current).to.eql(undefined)


      yaro.call()

      expect(future.$current.render().outerHTML).to.eql('<article class="age-27"><h1>Yaro</h1><span>age is 27</span></article>')


      expect(article).to.eql(future.$current)

      var jimmy = context.push('person', {name: 'Jimmy', age: 18});
      expect(future.$current.render().outerHTML).to.eql('<article class="age-18"><h1>Jimmy</h1><span>age is 18</span></article>')

      var article2 = future.$current;
      expect(article2).to.not.eql(article);
      expect(jimmy.$previous).to.eql(yaro)
      expect(article2.$previous).to.eql(article)

      jimmy.uncall()

      expect(jimmy.$previous).to.eql(undefined)
      expect(article2.$previous).to.eql(undefined)

      jimmy.call()
      expect(jimmy.$previous).to.eql(yaro)
      expect(article2.$previous).to.eql(article)

      G.swap(jimmy, yaro)

      expect(jimmy.$previous).to.eql(undefined)
      expect(article2.$previous).to.eql(undefined)
      expect(jimmy.$next).to.eql(yaro)
      expect(article2.$next).to.eql(article)

      G.swap(jimmy, yaro)
      expect(jimmy.$previous).to.eql(yaro)
      expect(article2.$previous).to.eql(article)
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

      // uncall all classes set with no extra arguments
      span.class.recall(':)')
      expect(span.$node.outerHTML).to.eql('<span class="zuul"></span>')
      
      // add class on top
      span.unshift('class', cool)
      expect(span.$node.outerHTML).to.eql('<span class="cool zuul"></span>')

      // push class to the end
      span.push('class', zest)
      expect(span.$node.outerHTML).to.eql('<span class="cool zuul zest"></span>')

      // uncall zuul class by its meta
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

      // uncall all classes set with `:)` 
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

      // uncall zuul class by its meta
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
    it ('should compare positions of nodes', function() {
      var parent = new G.Node('parent', null,
        new G.Node('child', null),
        new G.Node('child', null, 
          new G.Node('child', null, 
            new G.Node('child', null, 
              new G.Node('grandchild'),
              new G.Node('grandchild')),
            new G.Node('grandchild')),
          new G.Node('grandchild')),
        new G.Node('child', null,
          new G.Node('child', null, 
            new G.Node('grandchild'),
            new G.Node('grandchild'))
        )
      );
      var i = 0;
      var els = [];
      for (var n = parent; n; n = n.$following) {
        n.$index = i++;
        els.push(n)
      }
      for (var a, j = 0; a = els[j++];) {
        for (var b, k = 0; b = els[k++];) {
          var result = a.$index == b.$index ? 0 : a.$index > b.$index ? -1 : 1;
          expect(a.comparePosition(b)).to.eql(result)
        }
      }
    })
    it ('should inherit values object from parent form', function() {
      var form = new G.Node('form', {method: 'post', action: '/whatever.html'},
        new G.Node('label', null, 'What is your name?'),
        new G.Node('div', null, 
          new G.Node('input', {name: 'your_name', value: 'Boris'}),
          new G.Node('input', {type: 'submit'})
        )
      );
      var input = form.$last.$first;
      var submit = form.$last.$last;

      expect(form.values).to.not.eql(undefined)
      expect(input.values).to.eql(form.values)
      expect(String(form.values.your_name)).to.eql('Boris')

      input.set('value', 'Vasya')

      expect(String(form.values.your_name)).to.eql('Vasya')

      expect(G.stringify(ValueGroup(form.values.your_name))).to.eql(G.stringify(['Vasya']))

      input.set('name', 'MY_NAME')
      
      expect(String(form.values.MY_NAME)).to.eql('Vasya')
      expect(form.values.your_name).to.eql(undefined)

      input.set('value', 'Johny')
      expect(String(form.values.MY_NAME)).to.eql('Johny')
      expect(form.values.your_name).to.eql(undefined)

      input.uncall();
      expect(form.values.MY_NAME).to.eql(undefined)
      expect(form.values.your_name).to.eql(undefined)

      input.set('value', 'Jackie')
      expect(form.values.MY_NAME).to.eql(undefined)
      expect(form.values.your_name).to.eql(undefined)

      input.call();
      expect(String(form.values.MY_NAME)).to.eql('Jackie')
      expect(form.values.your_name).to.eql(undefined)

      input.set('name', 'her_name')
      expect(String(form.values.her_name)).to.eql('Jackie')
      expect(form.values.her_name.$meta).to.eql([input])
      expect(form.values.MY_NAME).to.eql(undefined)
      expect(form.values.your_name).to.eql(undefined)

      submit.set('name', 'submission_button');
      expect(G.stringify(form.values)).to.eql(G.stringify({her_name: 'Jackie'}))

      var value = submit.set('value', 'the_button');

      expect(G.stringify(form.values)).to.eql(G.stringify({her_name: 'Jackie', submission_button: 'the_button'}))

      var value = submit.set('value', 'the_button');


      var input3 = new G.Node('input', {name: 'comment', value: 'Boo!'})

      submit.$parent.appendChild(input3)
      expect(G.stringify(form.values)).to.eql(G.stringify({her_name: 'Jackie', submission_button: 'the_button', comment: 'Boo!'}))


      expect(input3.$watchers.value).to.not.eql(undefined)
      expect(input3.$watchers.values).to.not.eql(undefined)
      
      input3.name.uncall()

      expect(input3.$watchers.value).to.eql(undefined)
      expect(input3.$watchers.values).to.eql(undefined)
    })
    
    it ('should register compound fieldnames in forms', function() {
      var input = G.Node('input', {name: 'person[name]', value: 'Oy boi'});
      var form = new G.Node('form');
      form.appendChild(input)

      expect(String(form.values['person[name]'])).to.eql('Oy boi')
      expect(String(form.values.person.name)).to.eql('Oy boi')

      input.set('value', 'Ya bwoy')
      expect(String(form.values['person[name]'])).to.eql('Ya bwoy')
      expect(String(form.values.person.name)).to.eql('Ya bwoy')

      var name = input.uncall()
      expect(form.values['person[name]']).to.eql(undefined)
      expect(form.values.person).to.eql(undefined)

      name.call()
      expect(String(form.values['person[name]'])).to.eql('Ya bwoy')
      expect(String(form.values.person.name)).to.eql('Ya bwoy')

      var value = input.value.uncall();
      expect(String(form.values['person[name]'])).to.eql('Oy boi')
      expect(String(form.values.person.name)).to.eql('Oy boi')

      input.value.uncall();
      expect(form.values['person[name]']).to.eql(undefined)
      expect(form.values.person).to.eql(undefined)

      value.call();
      expect(String(form.values['person[name]'])).to.eql('Ya bwoy')
      expect(String(form.values.person.name)).to.eql('Ya bwoy')

      input.set('name', 'person[nickname]')
      expect(form.values['person[name]']).to.eql(undefined)
      expect(form.values.person.name).to.eql(undefined)
      expect(String(form.values['person[nickname]'])).to.eql('Ya bwoy')
      expect(String(form.values.person.nickname)).to.eql('Ya bwoy')

      input.set('value', 'The Peacemaker')
      expect(form.values['person[name]']).to.eql(undefined)
      expect(form.values.person.name).to.eql(undefined)
      expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
      expect(String(form.values.person.nickname)).to.eql('The Peacemaker')

      var age = new G.Node('input', {name: 'person[age]'})
      form.appendChild(age);
      expect(form.values['person[age]']).to.eql(undefined)
      expect(form.values.person.age).to.eql(undefined)

      age.set('value', 27)
      expect(Number(form.values['person[age]'])).to.eql(27)
      expect(Number(form.values.person.age)).to.eql(27)
      expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
      expect(String(form.values.person.nickname)).to.eql('The Peacemaker')


      input.uncall();
      expect(Number(form.values['person[age]'])).to.eql(27)
      expect(Number(form.values.person.age)).to.eql(27)
      expect(form.values['person[nickname]']).to.eql(undefined)
      expect(form.values.person.nickname).to.eql(undefined)

      age.uncall()
      expect(form.values.person).to.eql(undefined)

      input.call();
      expect(form.values['person[age]']).to.eql(undefined)
      expect(form.values.person.age).to.eql(undefined)
      expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
      expect(String(form.values.person.nickname)).to.eql('The Peacemaker')

      age.call()
      expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
      expect(String(form.values.person.nickname)).to.eql('The Peacemaker')
      expect(Number(form.values['person[age]'])).to.eql(27)
      expect(Number(form.values.person.age)).to.eql(27)

      form.values.person.set('age', 28)
      expect(Number(form.values.person.age)).to.eql(28)
      expect(Number(age.value)).to.eql(27)

      var age27 = age.value.uncall()
      expect(Number(age.value)).to.eql(28)
      expect(Number(form.values.person.age)).to.eql(28)
      expect(Number(form.values['person[age]'])).to.eql(28)

      age27.call()
      expect(Number(form.values.person.age)).to.eql(28)
      expect(Number(age.value)).to.eql(27)
      expect(Number(form.values['person[age]'])).to.eql(27)

      form.values.person.age.uncall()
      expect(Number(form.values.person.age)).to.eql(27)
      expect(Number(age.value)).to.eql(27)
      expect(Number(form.values['person[age]'])).to.eql(27)
    })
    
    it ('should register arraylike fieldnames in forms', function() {
      var input1 = G.Node('input', {name: 'person[interests][]', value: 'Books'});
      var form = new G.Node('form');
      form.appendChild(input1)
      expect(String(form.values.person.interests)).to.eql('Books')

      var input2 = G.Node('input', {name: 'person[interests][]', value: 'Vintage Diskettes'});
      form.appendChild(input2)
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Books', 'Vintage Diskettes']))

      input2.set('value', 'Modern Laser Disks')
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Books', 'Modern Laser Disks']))

      input1.set('value', 'Magazines')
      expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))

      G.swap(input2, input1);
      expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Modern Laser Disks', 'Magazines']))
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Modern Laser Disks', 'Magazines']))

      G.swap(input2, input1);
      expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))

      var input3 = G.Node('input', {name: 'person[interests][]', value: 'Ubuquitous Morality'});
      form.prependChild(input3)
      expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Ubuquitous Morality', 'Magazines', 'Modern Laser Disks']))
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Ubuquitous Morality', 'Magazines', 'Modern Laser Disks']))

      form.appendChild(input3)
      expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks', 'Ubuquitous Morality']))
      expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks', 'Ubuquitous Morality']))


    })

    it ('should clone elements when adding new microdata values', function() {
      var form = new G.Node('article', {itemscope: true},
        new G.Node('label', null, 'What is your name?'),
        new G.Node('div', null, 
          new G.Node('a', {itemprop: 'url', href: 'boris.html'}),
          new G.Node('span', {}, 'Hello')
        )
      );

      form.microdata.push('url', 'gunslinger.html');
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(String(form.$last.$first.$next.href)).to.eql('gunslinger.html')

      form.$last.$last.set('itemprop', 'greeting')
      expect(String(form.microdata.greeting)).to.eql('Hello')

      form.microdata.unshift('greeting', 'Bonjour')
      expect(String(form.microdata.greeting)).to.eql('Hello')
      expect(String(form.microdata.greeting.$previous)).to.eql('Bonjour')
      expect(String(form.$last.$last.getTextContent())).to.eql('Hello')
      expect(String(form.$last.$last.$previous.getTextContent())).to.eql('Bonjour')
      
      form.microdata.unset('greeting', 'Bonjour')
      expect(String(form.microdata.greeting)).to.eql('Hello')
      expect(form.microdata.greeting.$previous).to.eql(undefined)
      expect(String(form.$last.$last.getTextContent())).to.eql('Hello')
      expect(String(form.$last.$last.$previous.href)).to.eql('gunslinger.html')
    })

    it ('should change microdata values', function() {
      var form = new G.Node('article', {itemscope: true},
        new G.Node('label', null, 'What is your name?'),
        new G.Node('div', null, 
          new G.Node('a', {itemprop: 'url', href: 'boris.html'}),
          new G.Node('span', {}, 'Hello')
        )
      );

      form.microdata.set('url', 'horror.html', 'zug')
      expect(String(form.$last.$first.href)).to.eql('horror.html')

      form.microdata.url.uncall()
      expect(String(form.$last.$first.href)).to.eql('boris.html')

      var boris = form.microdata.url.uncall();
      expect(String(form.$last.$first.tag)).to.eql('span')

      boris.call()
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(G.stringify(ValueStack(boris))).to.eql(G.stringify(['boris.html', 'horror.html']))

      form.microdata.preset('url', 'zorro.html', 'xoxo')
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(G.stringify(ValueStack(boris))).to.eql(G.stringify(['zorro.html', 'boris.html', 'horror.html']))

      form.$last.$last.set('itemprop', 'url')
      expect(G.stringify(ValueStack(boris))).to.eql(G.stringify(['zorro.html', 'boris.html', 'horror.html']))
      expect(G.stringify(ValueStack(form.microdata.url))).to.eql(G.stringify(['Hello']))
      expect(G.stringify(ValueGroup(form.microdata.url))).to.eql(G.stringify(['boris.html', 'Hello']))
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(String(form.$last.$last.getTextContent())).to.eql('Hello')
      
      var gomes = form.microdata.overlay('url', 'Gomes', 'hulk')
      expect(G.stringify(ValueStack(gomes))).to.eql(G.stringify(['Hello', 'Gomes']))
      expect(G.stringify(ValueGroup(form.microdata.url))).to.eql(G.stringify(['boris.html', 'Gomes']))
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

      gomes.uncall()
      expect(G.stringify(ValueGroup(form.microdata.url))).to.eql(G.stringify(['boris.html', 'Hello']))
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(G.stringify(ValueStack(form.$last.$last.$first.text))).to.eql(G.stringify(['Hello']))
      expect(String(form.$last.$last.getTextContent())).to.eql('Hello')

      gomes.call()
      expect(G.stringify(ValueGroup(form.microdata.url))).to.eql(G.stringify(['boris.html', 'Gomes']))
      expect(String(form.$last.$first.href)).to.eql('boris.html')
      expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')


      var holmes = form.microdata.overlay(boris, 'Holmes', 'hulk')
      expect(G.stringify(ValueStack(holmes))).to.eql(G.stringify(['zorro.html', 'boris.html', 'Holmes', 'horror.html']))
      expect(G.stringify(ValueGroup(form.microdata.url))).to.eql(G.stringify(['Holmes', 'Gomes']))
      expect(G.stringify(ValueStack(form.$last.$first.href))).to.eql(G.stringify(['boris.html', 'Holmes']))
      expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

      holmes.uncall()
      expect(G.stringify(ValueStack(form.microdata.url))).to.eql(G.stringify(['Hello', 'Gomes']))
      expect(G.stringify(ValueStack(form.microdata.url.$previous))).to.eql(G.stringify(['zorro.html', 'boris.html', 'Holmes', 'horror.html']))
      expect(G.stringify(ValueGroup(form.microdata.url))).to.eql(G.stringify(['boris.html', 'Gomes']))
      expect(G.stringify(ValueStack(form.$last.$first.href))).to.eql(G.stringify(['boris.html']))
      expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

    })

    it ('should change form values', function() {
      var form = new G.Node('form',
        new G.Node('label', null, 'What is your name?'),
        new G.Node('div', null, 
          new G.Node('input', {name: 'url', value: 'boris.html'}),
          new G.Node('span',  {name: 'url', value: 'eldar.html'})
        )
      );
      expect(String(form.$last.$first.value)).to.eql('boris.html')
      expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
      expect(String(form.$last.$last.value)).to.eql('eldar.html')
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['eldar.html']))

      var horror = form.values.overlay('url', 'horror.html', 'secret world')
      expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['eldar.html', 'horror.html']))
      expect(G.stringify(ValueStack(form.$last.$first.value))).to.eql(G.stringify(['boris.html']))
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'horror.html']))


      form.values.url.uncall()

      expect(String(form.$last.$first.value)).to.eql('boris.html')
      expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
      expect(String(form.$last.$last.value)).to.eql('eldar.html')
      expect(G.stringify(ValueGroup(form.values.url))).to.eql(G.stringify(['boris.html', 'eldar.html']))
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['eldar.html', 'horror.html']))
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html']))

      form.values.preset('url', 'zorro.html', 'xoxo')
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'eldar.html', 'horror.html']))
      expect(String(form.$last.$first.value)).to.eql('boris.html')
      expect(String(form.$last.$last.value)).to.eql('eldar.html')
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html']))

      horror.call()
      expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'eldar.html', 'horror.html']))
      expect(String(form.$last.$first.value)).to.eql('boris.html')
      expect(G.stringify(ValueStack(form.$last.$first.value))).to.eql(G.stringify(['boris.html']))
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'horror.html']))

      form.$last.$last.set('value', 'Hello world')
      expect(String(form.values.url)).to.eql('horror.html')
      expect(String(form.$last.$last.value)).to.eql('Hello world')
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'horror.html', 'Hello world']))
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'Hello world', 'horror.html']))
      expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))

      horror.uncall()
      expect(String(form.values.url)).to.eql('Hello world')
      expect(String(form.$last.$last.value)).to.eql('Hello world')
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'Hello world']))
      expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'Hello world', 'horror.html']))
      expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))

      form.$last.$last.value.uncall()
      expect(String(form.values.url)).to.eql('eldar.html')
      expect(String(form.$last.$last.value)).to.eql('eldar.html')
      expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'Hello world']))
      expect(G.stringify(ValueStack(form.$last.$first.value))).to.eql(G.stringify(['boris.html']))
      
    })
    it ('should inherit microdata object from parent scope', function() {
      var form = new G.Node('article', {itemscope: true},
        new G.Node('label', null, 'What is your name?'),
        new G.Node('div', null, 
          new G.Node('a', {itemprop: 'your_name', href: 'boris.html'}),
          new G.Node('span', {}, 'Hello')
        )
      );
      var input = form.$last.$first;
      var submit = form.$last.$last;

      expect(form.microdata).to.not.eql(undefined)
      expect(input.microdata).to.eql(form.microdata)
      expect(String(form.microdata.your_name)).to.eql('boris.html')

      input.set('href', 'vasya.html')
      expect(String(form.microdata.your_name)).to.eql('vasya.html')

      input.set('itemprop', 'MY_NAME')
      expect(String(form.microdata.MY_NAME)).to.eql('vasya.html')
      expect(form.microdata.your_name).to.eql(undefined)

      input.set('href', 'johny.html')
      expect(String(form.microdata.MY_NAME)).to.eql('johny.html')
      expect(form.microdata.your_name).to.eql(undefined)

      input.uncall();
      expect(form.microdata.MY_NAME).to.eql(undefined)
      expect(form.microdata.your_name).to.eql(undefined)

      input.set('href', 'jackie.html')
      expect(form.microdata.MY_NAME).to.eql(undefined)
      expect(form.microdata.your_name).to.eql(undefined)

      input.call();
      expect(String(form.microdata.MY_NAME)).to.eql('jackie.html')
      expect(form.microdata.your_name).to.eql(undefined)

      input.set('itemprop', 'her_name')
      expect(String(form.microdata.her_name)).to.eql('jackie.html')
      expect(form.microdata.her_name.$meta).to.eql([input])
      expect(form.microdata.MY_NAME).to.eql(undefined)
      expect(form.microdata.your_name).to.eql(undefined)

      // make submit provide microdata 
      submit.set('itemprop', 'submission_button');
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello'}))

      // use attribute instead of text content
      var value = submit.set('content', 'the_button');
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'the_button'}))

      // fall back to text content
      var value = submit.content.uncall();
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello'}))

      // add new input
      var input3 = new G.Node('meta', {itemprop: 'comment'}, 'Boo!')
      submit.$parent.appendChild(input3)
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello', comment: 'Boo!'}))
      expect(input3.$watchers.itemprop).to.not.eql(undefined)
      expect(input3.$watchers.microdata).to.not.eql(undefined)
      
      input3.itemprop.uncall()
      expect(input3.$watchers.itemprop).to.eql(undefined)
      expect(input3.$watchers.microdata).to.eql(undefined)
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello'}))

      submit.$first.set('text', 'Goodbye')

      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Goodbye'}))

      var textnode = submit.$first.uncall()
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html'}))

      textnode.call()
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Goodbye'}))

      submit.set('href', 'zozo.html')

      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'zozo.html'}))

      submit.$first.uncall()
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'zozo.html'}))

      submit.href.uncall()
      expect(G.stringify(form.microdata)).to.eql(G.stringify({her_name: 'jackie.html'}))
    })

    it ('should chain microdata scopes', function() {
      var form = new G.Node('article', {itemscope: true},
        new G.Node('label', {itemprop: 'header'}, 'What is your name?'),

        new G.Node('div', {itemscope: true, itemprop: 'person'}, 
          new G.Node('a', {itemprop: 'your_name', href: 'boris.html'}),
          new G.Node('span', {}, 'Hello')
        ),
        new G.Node('div', {itemscope: true, itemprop: 'person'}, 
          new G.Node('a', {itemprop: 'your_name', href: 'vasya.html'}),
          new G.Node('span', {}, 'Bye')
        )
      );
      var header = form.$first;
      var first = form.$last.$previous;
      var second = form.$last;

      expect(form.microdata).to.not.eql(second.microdata)
      expect(form.microdata.person).to.eql(second.microdata)
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')
      expect(String(form.microdata.person.your_name)).to.eql('vasya.html')
      expect(String(form.microdata.header)).to.eql('What is your name?')

      second.$first.set('href', 'jackie.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')
      expect(String(form.microdata.person.your_name)).to.eql('jackie.html')

      second.uncall();
      expect(String(form.microdata.person.your_name)).to.eql('boris.html')
      expect(form.microdata.person.$previous).to.eql(undefined)
      expect(form.microdata.person.$next).to.eql(undefined)

      second.call()
      expect(String(form.microdata.person.your_name)).to.eql('jackie.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')

      second.$first.set('href', 'joey.html')
      expect(String(form.microdata.person.your_name)).to.eql('joey.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')

      var bye = second.$last.set('itemprop', 'your_name')
      expect(String(form.microdata.person.your_name)).to.eql('Bye')
      expect(String(form.microdata.person.your_name.$previous)).to.eql('joey.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')

      second.$last.unset('itemprop', 'your_name')
      expect(String(form.microdata.person.your_name)).to.eql('joey.html')
      expect(form.microdata.person.your_name.$next).to.eql(undefined)
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')

      bye.call()
      expect(String(form.microdata.person.your_name)).to.eql('Bye')
      expect(String(form.microdata.person.your_name.$previous)).to.eql('joey.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')

      first.uncall()
      expect(String(form.microdata.person.your_name)).to.eql('Bye')
      expect(String(form.microdata.person.your_name.$previous)).to.eql('joey.html')
      expect(form.microdata.person.$previous).to.eql(undefined)

      second.$parent.appendChild(first)
      expect(String(form.microdata.person.your_name)).to.eql('boris.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('Bye')
      expect(String(form.microdata.person.$previous.your_name.$previous)).to.eql('joey.html')
      expect(second.$next).to.eql(first)
      expect(first.$previous).to.eql(second);

      G.swap(first, second);
      expect(second.$previous).to.eql(first);
      expect(first.$next).to.eql(second);
      expect(String(form.microdata.person.your_name)).to.eql('Bye')
      expect(String(form.microdata.person.your_name.$previous)).to.eql('joey.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('boris.html')

      G.swap(first, second);
      expect(String(form.microdata.person.your_name)).to.eql('boris.html')
      expect(String(form.microdata.person.$previous.your_name)).to.eql('Bye')
      expect(String(form.microdata.person.$previous.your_name.$previous)).to.eql('joey.html')
      expect(second.$next).to.eql(first)
      expect(first.$previous).to.eql(second);

      var extra = new G.Node('label', {itemprop: 'header'}, 'Extra header!');
      form.prependChild(extra)

      expect(String(form.microdata.header)).to.eql('What is your name?')
      expect(String(form.microdata.header.$previous)).to.eql('Extra header!')

      form.appendChild(extra)
      expect(String(form.microdata.header)).to.eql('Extra header!')
      expect(String(form.microdata.header.$previous)).to.eql('What is your name?')

      form.appendChild(header)
      expect(String(form.microdata.header)).to.eql('What is your name?')
      expect(String(form.microdata.header.$previous)).to.eql('Extra header!')

      form.removeChild(extra)
      expect(String(form.microdata.header)).to.eql('What is your name?')
      expect(form.microdata.header.$previous).to.eql(undefined)

      var wrapper = G.Node('footer', null, extra);

      form.appendChild(wrapper)
      expect(String(form.microdata.header)).to.eql('Extra header!')
      expect(String(form.microdata.header.$previous)).to.eql('What is your name?')

      G.swap(wrapper, header)
      expect(String(form.microdata.header)).to.eql('What is your name?')
      expect(String(form.microdata.header.$previous)).to.eql('Extra header!')
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
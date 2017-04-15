describe('G.Node migration', function() {

  it ('should migrate text node content', function() {
    var node = G.Node('article', null, 'Hello world');

    expect(String(node.$first.text)).to.eql('Hello world')
    node.migrate(function() {
      return G.Node('article', null, 'Bye world');
    })
    expect(String(node.$first.text)).to.eql('Bye world')
  })

  it ('should migrate attribute change', function() {
    var node = G.Node('article', {class: 'test'});
    expect(String(node.class)).to.eql('test')

    node.migrate(function() {
      return G.Node('article', {class: 'nest'});
    })
    
    expect(String(node.class)).to.eql('nest')
  })

  it ('should migrate removal of an attribute', function() {
    var node = G.Node('article', {class: 'test'});
    expect(String(node.class)).to.eql('test')

    node.migrate(function() {
      return G.Node('article', {});
    });
    expect(node.class).to.eql(undefined)
  })

  it ('should replace node when tags mismatch', function() {
    var node = G.Node('article', null, G.Node('h1'));
    expect(String(node.$first.tag)).to.eql('h1')
    var h1 = node.$first;
    node.migrate(function() {
      return G.Node('article', null, G.Node('h2'));
    })
    expect(String(node.$first.tag)).to.eql('h2')
    expect(node.$first).to.not.eql(h1)
  })

  it ('should replace node when node types mismatch', function() {
    var node = G.Node('article', null, G.Node('h1'));
    expect(String(node.$first.tag)).to.eql('h1')
    var h1 = node.$first;
    node.migrate(function() {
      return G.Node('article', null, 'hola');
    })
    expect(String(node.$first.text)).to.eql('hola')
    expect(node.$first).to.not.eql(h1)
  })

  it ('should migrate child node removal', function() {
    var node = G.Node('article', null, G.Node('h1'));
    expect(String(node.$first.tag)).to.eql('h1')
    
    node.migrate(function() {
      return G.Node('article');
    })
    expect(node.$first).to.eql(undefined)
  })

  it ('should migrate child node insertion', function() {
    var node = G.Node('article');
    expect(node.$first).to.eql(undefined)

    node.migrate(function() {
      return G.Node('article', null, G.Node('h1'));
    })
    expect(String(node.$first.tag)).to.eql('h1')
  })

  it ('should migrate blessed stable elements', function() {
    var node = G.Node('article', null, G.Node('h1', {key: '1st'}));

    var first = node.$first;
    node.migrate(function() {
      return G.Node('article', null, G.Node('h2'), G.Node('h1', {key: '1st'}));
    })
    expect(node.$last === first).to.eql(true);
    expect(node.$first === first).to.eql(false);
    expect(String(node.$last.tag)).to.eql('h1');
    expect(String(node.$first.tag)).to.eql('h2');
  })

  it ('should migrate multiple regions between stable elements', function() {
    var node = G.Node('article', null, G.Node('h1', {key: '1st'}), G.Node('h2', {key: '2nd'}));
    var first = node.$first;
    var second = node.$last;

    node.migrate(function() {
      return G.Node('article', null,  'Oh', G.Node('h1', {key: '1st', title: 'boogie'}), 'Hey', G.Node('h2', {key: '2nd'}));
    })
    expect(String(node.$first.text)).to.eql('Oh');
    expect(node.$first.$next === first).to.eql(true);
    expect(String(first.title)).to.eql('boogie');
    expect(String(node.$first.$next.$next.text)).to.eql('Hey');
    expect(node.$first.$next.$next.$next).to.eql(second);
  })

  it ('should reorder stable ements', function() {
    var node = G.Node('article', null, G.Node('h1', {key: '1st'}), G.Node('h2', {key: '2nd'}));
    var first = node.$first;
    var second = node.$last;

    node.migrate(function() {
      return G.Node('article', null,  G.Node('h2', {key: '2nd'}), G.Node('h1', {key: '1st'}));
    })
    expect(node.$first === second).to.eql(true);
    expect(node.$last === first).to.eql(true);
  })

  it ('should reorder and mutate tree stable ements', function() {
    var node = G.Node('article', null, G.Node('h1', {key: '1st'}), G.Node('h2', {key: '2nd'}), G.Node('h3', {key: '3d'}));
    var first = node.$first;
    var second = first.$next;
    var third = node.$last;

    node.migrate(function() {
      return G.Node('article', null, 'Hello', G.Node('h3', {key: '3d'}), 'Boing', G.Node('h2', {key: '2nd'}));
    })
    expect(String(node.$first.text)).to.eql('Hello');
    expect(node.$first.$next === third).to.eql(true);
    expect(String(node.$first.$next.$next.text)).to.eql('Boing');
    expect(node.$last === second).to.eql(true);
  })

  it ('should migrate deep changes', function() {
    var article = G.Node('article', {class: 'test'}, 
      G.Node('h1', null, 'Hey guys'),
      G.Node('button', {class: 'big'}, 'Press me'));

    var h1 = article.$first;
    var button = article.$last;
    var title = h1.$first;
    var label = button.$first;

    expect(h1.class).to.eql(undefined)
    expect(String(article.class)).to.eql('test')
    expect(String(button.class)).to.eql('big')

    expect(String(title.text)).to.eql('Hey guys')
    expect(String(label.text)).to.eql('Press me')

    article.migrate(function() {
      return G.Node('article', {class: 'not-test'}, 
        G.Node('h1', {class: 'tight'}, 'Hey gals'),
        G.Node('button', null, 'Push me'));
    })

    expect(String(h1.class)).to.eql('tight')
    expect(String(article.class)).to.eql('not-test')
    expect(button.class).to.eql(undefined)

    expect(String(title.text)).to.eql('Hey gals')
    expect(String(label.text)).to.eql('Push me')
  })


  it ('should migrate deep changes keeping other effects in place', function() {
    var article = G.Node('article', {class: 'test'}, 
      G.Node('h1', null, 'Hey guys'),
      G.Node('button', {class: 'big'}, 'Press me'));

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

    article.migrate(function() {
      return G.Node('article', {class: 'not-test'}, 
        G.Node('h1', {class: 'tight'}, 'Hey gals'),
        G.Node('button', null, 'Push me'));
    })

    expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['custom']))
    expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['deal']))
    expect(G.stringify(ValueGroup(h1.class))).to.eql(G.stringify(['header', 'tight']))

    article.migrate(function() {
      return G.Node('article', {}, 
        G.Node('h1', null, 'Hey gals'),
        G.Node('button', {class: 'best'}, 'Push me'));
    })

    expect(G.stringify(ValueGroup(article.class))).to.eql(G.stringify(['custom']))
    expect(G.stringify(ValueGroup(button.class))).to.eql(G.stringify(['deal', 'best']))
    expect(G.stringify(ValueGroup(h1.class))).to.eql(G.stringify(['header']))
  })


  it ('should migrate tree against its dom representation', function() {
    var node = G.Node('article', null, G.Node('h1'), G.Node('h1'));
    var first = node.$first;
    var second = node.$last;
    var el = node.render()

    el.insertBefore(document.createTextNode('Hey ya!'), el.firstChild);
    first.$node.setAttribute('test', 200)
    expect(node.$first).to.eql(first);
    expect(node.test).to.eql(undefined);

    node.migrate(el);
    expect(String(node.$first.text)).to.eql('Hey ya!');
    expect(node.$first.$next === first).to.eql(true);
    expect(node.$first.$next.$next === second).to.eql(true);
    expect(String(first.test)).to.eql('200')

    var button = document.createElement('button');
    button.innerHTML = 'test';
    first.$node.appendChild(button);
    expect(first.$first).to.eql(undefined)

    node.migrate(el);
    expect(String(first.$first.tag)).to.eql('button')
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

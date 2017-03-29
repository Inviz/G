describe("G.Node in callback", function() {
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

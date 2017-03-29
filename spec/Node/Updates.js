describe('G.Node updating', function() {

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


describe('G.Node', function() {
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
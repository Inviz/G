

describe 'G.version', ->

  it 'should generate and apply deferred commands', ->
    context = {}
    john = G.insert(context, 'name', 0, 'John', 'meta', 'scope', true)
    ivan = G.insert(context, 'name', 0, 'Ivan', 'meta', 'scope', true)

    expect(context.name).to.eql(undefined)

    G.apply(john, ivan)

    expect(String(context.name)).to.eql('IvanJohn')


    ivohn = G.delete(context, 'name', 2, 3, 'meta', 'scope', true)

    expect(String(context.name)).to.eql('IvanJohn')

    G.apply(ivohn)
    expect(String(context.name)).to.eql('Ivohn')

  #it 'should concat commands', ->
  #  context = {}
  #  hello = G.insert(context, 'name', 0, 'John', 'meta', 'scope', true)
  #  world = G.insert(context, 'name', 0, 'Ivan', 'meta', 'scope', true)



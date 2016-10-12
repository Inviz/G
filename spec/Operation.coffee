

describe 'G', ->

  it 'should assign value with meta data', ->
    context = {context: true}
    op = G(context, 'key', 'value', 'meta', 'scope')

    string = Object('value')
    string.$context = context
    string.$key   = 'key'
    string.$meta  = ['meta', 'scope']

    expect(op).to.eql(string)
    expect(context.key).to.eql(string)
    expect(`context.key == 'value'`).to.eql(true)
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'value'})


  it 'should update value', ->
    context = {context: true}
    op = G(context, 'key', 'value', 'meta', 'scope')
    op2 = G(context, 'key', 'value2', 'meta2', 'scope2')

    expect(context.key).to.eql(op2)
    expect(op2.$preceeding).to.eql(op)
    expect(op.$succeeding).to.eql(op2)
    expect(context.key.valueOf()).to.eql('value2')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'value2'})

describe 'Proxy setting', ->
    it 'should wrap object around via ES6 proxy', ->
        context = {context: true}
        proxy = new Proxy(context,
            set: G.proxy
        )
        console.log(123);
        proxy.a = 'Test'
        console.log(123);
        console.log(proxy.a, 123)
        expect(proxy.a.valueOf()).to.eql('Test')
        expect(proxy.a.$context).to.eql(proxy)
        proxy.a = 'Test2'
        expect(proxy.a.valueOf()).to.eql('Test2')
        expect(proxy.a.$context).to.eql(proxy)
        expect(proxy.a.$preceeding).to.eql(undefined)
        expect(proxy.a.$succeeding).to.eql(undefined)



describe 'G.watch', ->
  it 'should transform present values', ->
    context = {key: 'test'}

    callback = (value) ->
      return value + 123
    
    G.watch context, 'key', callback, true

    expect(context.key.valueOf()).to.eql('test123')

    G.unwatch context, 'key', callback, true

    expect(context.key.valueOf()).to.eql('test')

    
  it 'should retransform value on redo', ->
    context = {}
    G(context, 'key', 'test')
    expect(context.key.valueOf()).to.eql('test')
    G(context, 'key', 'pest', 2)
    expect(context.key.valueOf()).to.eql('pest')

    callback = (value) ->
      return value + 123

    G.watch context, 'key', callback, true
    expect(context.key.valueOf()).to.eql('pest123')

    before = context.key
    

    G.recall context.key

    expect(context.key.valueOf()).to.eql('test123')

    G.unwatch context, 'key', callback, true

    expect(context.key.valueOf()).to.eql('test')

    G.call before
    expect(context.key.valueOf()).to.eql('pest')

  it 'should transform preassigned values', ->
    context = {}
    G(context, 'key', 'test')
    expect(context.key.valueOf()).to.eql('test')

    callback = (value) ->
      return value + 123

    G.watch context, 'key', callback, true

    expect(context.key.valueOf()).to.eql('test123')

    G.unwatch context, 'key', callback, true

    expect(context.key.valueOf()).to.eql('test')



  it 'should observe future value', ->
    context = {context: true}
    G.watch context, 'key', (value) ->
      return value + 123
    , true
    op = G(context, 'key', 'value', 'meta1', 'scope')
    expect(context.key).to.eql(op)
    expect(context.key.valueOf()).to.eql('value123')
    expect(context.key.$before.valueOf()).to.eql('value')
    expect(context.key.$before.$after.valueOf()).to.eql('value123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'value123'})

    op2 = G(context, 'key', 'zalue', 'meta2', 'scope')
    expect(context.key).to.eql(op2)
    expect(context.key.valueOf()).to.eql('zalue123')
    expect(context.key.$before.valueOf()).to.eql('zalue')
    expect(context.key.$before.$after.valueOf()).to.eql('zalue123')
    expect(context.key.$preceeding.valueOf()).to.eql('value123')
    expect(context.key.$preceeding.$succeeding.valueOf()).to.eql('zalue123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'zalue123'})

    G.recall context.key
    expect(context.key).to.eql(op)
    expect(context.key.valueOf()).to.eql('value123')
    expect(context.key.$before.valueOf()).to.eql('value')
    expect(context.key.$before.$after.valueOf()).to.eql('value123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'value123'})

    G.recall context.key
    expect(context.key).to.eql(undefined)

    # Todo: Cleanup cycling links
    G.call op2
    expect(context.key).to.eql(op2)
    expect(context.key.valueOf()).to.eql('zalue123')
    expect(context.key.$before.valueOf()).to.eql('zalue')
    expect(context.key.$before.$after.valueOf()).to.eql('zalue123')
    expect(context.key.$preceeding.valueOf()).to.eql('value123')
    expect(context.key.$preceeding.$succeeding.valueOf()).to.eql('zalue123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'zalue123'})

    G.call op
    expect(context.key).to.eql(op)
    expect(context.key.valueOf()).to.eql('value123')
    expect(context.key.$before.valueOf()).to.eql('value')
    expect(context.key.$before.$after.valueOf()).to.eql('value123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: true, key: 'value123'})

  it 'should track side effects in callbacks', ->
    context = {'context'}
    subject = {'subject'}

    # Callback causes two side effects
    G.watch context, 'key', (value) ->
      G(subject, 'mutated', value + 123)
      G(context, 'asis', value)
      return

    op = G(context, 'key', 'value', 'meta1', 'scope')
    expect(context.key).to.eql(op)
    expect(subject.mutated.valueOf()).to.eql('value123')
    expect(context.asis.valueOf()).to.eql('value')
    
    # side effects are aware of their sequence
    expect(subject.mutated.$before).to.eql(op)
    expect(subject.mutated.$after).to.eql(context.asis)
    expect(context.asis.$before).to.eql(subject.mutated)
    expect(context.asis.$after).to.eql(undefined)

    expect(JSON.stringify(subject)).to.eql(JSON.stringify {'subject', mutated: 'value123'})
    expect(JSON.stringify(context)).to.eql(JSON.stringify {'context', key: 'value', asis: 'value'})

    op2 = G(context, 'key', 'zalue', 'meta2', 'scope')
    expect(context.key).to.eql(op2)
    expect(subject.mutated.valueOf()).to.eql('zalue123')
    expect(subject.mutated.$before.valueOf()).to.eql('zalue')
    expect(subject.mutated.$before.$after.valueOf()).to.eql('zalue123')
    expect(subject.mutated.$preceeding.valueOf()).to.eql('value123')
    expect(subject.mutated.$preceeding.$succeeding.valueOf()).to.eql('zalue123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {'context', key: 'zalue', asis: 'zalue'})

    G.recall context.key
    expect(context.key).to.eql(op)
    expect(subject.mutated.valueOf()).to.eql('value123')
    expect(subject.mutated.$before).to.eql(context.key)
    expect(subject.mutated.$after).to.eql(context.asis)
    expect(subject.mutated.$before.valueOf()).to.eql('value')
    expect(subject.mutated.$after.valueOf()).to.eql('value')

    expect(JSON.stringify(context)).to.eql(JSON.stringify {'context', key: 'value', asis: 'value'})

    G.recall context.key
    expect(context.mutated).to.eql(undefined)
    expect(context.asis).to.eql(undefined)
    expect(context.key).to.eql(undefined)

    # Todo: Cleanup cycling links
    G.call op2
    expect(context.key).to.eql(op2)
    expect(subject.mutated.valueOf()).to.eql('zalue123')
    expect(subject.mutated.$before.valueOf()).to.eql('zalue')
    expect(subject.mutated.$before.$after.valueOf()).to.eql('zalue123')
    expect(subject.mutated.$before.$after.$after).to.eql(context.asis)
    expect(subject.mutated.$before.$after).to.eql(subject.mutated)
    expect(subject.mutated.$before.$before).to.eql(undefined)
    expect(subject.mutated.$preceeding.valueOf()).to.eql('value123')
    expect(subject.mutated.$preceeding.$preceeding).to.eql(undefined)
    expect(subject.mutated.$preceeding.$succeeding.valueOf()).to.eql('zalue123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: 'context', key: 'zalue', asis: 'zalue'})
    expect(JSON.stringify(subject)).to.eql(JSON.stringify {subject: 'subject', mutated: 'zalue123'})

    G.call op
    expect(context.key).to.eql(op)
    expect(subject.mutated.valueOf()).to.eql('value123')
    expect(subject.mutated.$before.valueOf()).to.eql('value')
    expect(subject.mutated.$before.$after.valueOf()).to.eql('value123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: 'context', key: 'value', asis: 'value'})
    expect(JSON.stringify(subject)).to.eql(JSON.stringify {subject: 'subject', mutated: 'value123'})


  it 'should handle transformations and side effects together', ->
    context = {'context'}
    subject = {'subject'}

    # Callback causes two side effects
    G.watch context, 'key', (value) ->
      G(subject, 'mutated', value + 123)
      G(context, 'asis', value)
      return

    G.watch context, 'key', (value) ->
      return value + 666
    , true

    op = G(context, 'key', 'value', 'meta1', 'scope')
    expect(context.key).to.eql(op)
    expect(subject.mutated.valueOf()).to.eql('value666123')
    expect(context.asis.valueOf()).to.eql('value666')
    
    # side effects are aware of their sequence
    expect(subject.mutated.$before).to.eql(op)
    expect(subject.mutated.$after).to.eql(context.asis)
    expect(context.asis.$before).to.eql(subject.mutated)
    expect(context.asis.$after).to.eql(undefined)

    expect(JSON.stringify(subject)).to.eql(JSON.stringify {'subject', mutated: 'value666123'})
    expect(JSON.stringify(context)).to.eql(JSON.stringify {'context', key: 'value666', asis: 'value666'})

    op2 = G(context, 'key', 'zalue', 'meta2', 'scope')
    expect(context.key).to.eql(op2)
    expect(subject.mutated.valueOf()).to.eql('zalue666123')
    expect(subject.mutated.$before.valueOf()).to.eql('zalue666')
    expect(subject.mutated.$before.$after.valueOf()).to.eql('zalue666123')
    expect(subject.mutated.$preceeding.valueOf()).to.eql('value666123')
    expect(subject.mutated.$preceeding.$succeeding.valueOf()).to.eql('zalue666123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {'context', key: 'zalue666', asis: 'zalue666'})

    G.recall context.key
    expect(context.key).to.eql(op)
    expect(subject.mutated.valueOf()).to.eql('value666123')
    expect(subject.mutated.$before).to.eql(context.key)
    expect(subject.mutated.$after).to.eql(context.asis)
    expect(subject.mutated.$before.valueOf()).to.eql('value666')
    expect(subject.mutated.$after.valueOf()).to.eql('value666')

    expect(JSON.stringify(context)).to.eql(JSON.stringify {'context', key: 'value666', asis: 'value666'})

    G.recall context.key
    expect(context.mutated).to.eql(undefined)
    expect(context.asis).to.eql(undefined)
    expect(context.key).to.eql(undefined)

    # Todo: Cleanup cycling links
    G.call op2
    expect(context.key).to.eql(op2)
    expect(subject.mutated.valueOf()).to.eql('zalue666123')
    expect(subject.mutated.$before.valueOf()).to.eql('zalue666')
    expect(subject.mutated.$before.$after.valueOf()).to.eql('zalue666123')
    expect(subject.mutated.$before.$after.$after).to.eql(context.asis)
    expect(subject.mutated.$before.$after).to.eql(subject.mutated)
    expect(subject.mutated.$before.$before.valueOf()).to.eql('zalue')
    expect(subject.mutated.$before.$before.$before).to.eql(undefined)
    expect(subject.mutated.$preceeding.valueOf()).to.eql('value666123')
    expect(subject.mutated.$preceeding.$preceeding).to.eql(undefined)
    expect(subject.mutated.$preceeding.$succeeding.valueOf()).to.eql('zalue666123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: 'context', key: 'zalue666', asis: 'zalue666'})
    expect(JSON.stringify(subject)).to.eql(JSON.stringify {subject: 'subject', mutated: 'zalue666123'})

    G.call op
    expect(context.key).to.eql(op)
    expect(subject.mutated.valueOf()).to.eql('value666123')
    expect(subject.mutated.$before.valueOf()).to.eql('value666')
    expect(subject.mutated.$before.$after.valueOf()).to.eql('value666123')
    expect(JSON.stringify(context)).to.eql(JSON.stringify {context: 'context', key: 'value666', asis: 'value666'})
    expect(JSON.stringify(subject)).to.eql(JSON.stringify {subject: 'subject', mutated: 'value666123'})

  it 'should update values by meta', ->
    context = {}
    G.set context, 'key', 123

    expect(context.key.valueOf()).to.eql(123)

    G.set context, 'key', 1234

    key1234 = context.key
    expect(context.key.valueOf()).to.eql(1234)
    expect(context.key.$succeeding).to.eql(undefined)
    expect(context.key.$preceeding).to.eql(undefined)

    G.set context, 'key', 555, 'lol omg this is weird', 'you say!'
    expect(context.key.valueOf()).to.eql(555)
    expect(context.key.$succeeding).to.eql(undefined)
    expect(context.key.$preceeding).to.eql(key1234)


    G.set context, 'key', 12345
    expect(context.key.valueOf()).to.eql(555)
    expect(context.key.$succeeding).to.eql(undefined)
    expect(context.key.$preceeding).not.to.eql(key1234)
    expect(context.key.$preceeding.valueOf()).eql(12345)


    G.set context, 'key', 5555, 'lol omg this is weird', 'you say!'
    expect(context.key.valueOf()).to.eql(5555)
    expect(context.key.$succeeding).to.eql(undefined)
    expect(context.key.$preceeding).not.to.eql(key1234)
    expect(context.key.$preceeding.valueOf()).eql(12345)

    G.set context, 'key', 55555, 'lol omg this is weird'
    expect(context.key.valueOf()).to.eql(55555)
    expect(context.key.$preceeding.valueOf()).eql(5555)
    expect(context.key.$preceeding.$preceeding.valueOf()).eql(12345)


    G.set context, 'key', 123456
    expect(context.key.valueOf()).to.eql(55555)
    expect(context.key.$preceeding.valueOf()).eql(5555)
    expect(context.key.$preceeding.$preceeding.valueOf()).eql(123456)


    # Remove operation from history
    before = context.key.$preceeding
    G.recall before, true
    expect(context.key.valueOf()).to.eql(55555)
    expect(context.key.$preceeding.valueOf()).eql(123456)

    # Re-apply operation on top of the stack
    G.call before, 'set'
    expect(context.key.valueOf()).to.eql(5555)
    expect(context.key.$succeeding).eql(undefined)
    expect(context.key.$preceeding.valueOf()).eql(55555)
    expect(context.key.$preceeding.$succeeding).eql(context.key)
    expect(context.key.$preceeding.$preceeding.$succeeding).eql(context.key.$preceeding)
    expect(context.key.$preceeding.$preceeding.$preceeding).eql(undefined)


  it 'should handle transformations and side effects together', ->
    context = {'context', key: 'lol'}
    subject = {'subject'}


    # Callback causes two side effects
    G.watch context, 'key', (value) ->
      G(subject, 'mutated', value + 123)
      G(context, 'asis', value)
      return

    expect(context.asis.valueOf()).to.eql('lol')
    expect(subject.mutated.valueOf()).to.eql('lol123')

    callback = (value) ->
      return value + 666
    G.watch context, 'key', callback, true

    expect(context.asis.valueOf()).to.eql('lol666')
    expect(subject.mutated.valueOf()).to.eql('lol666123')

    G.unwatch context, 'key', callback, true

    expect(context.asis.valueOf()).to.eql('lol')
    expect(subject.mutated.valueOf()).to.eql('lol123')

    G.recall context.key


    expect(context.asis).to.eql(undefined)
    expect(subject.mutated).to.eql(undefined)


describe 'List', ->

  it '#push', ->
    it 'should add items on top of the stack', ->
      context = {}
      
      G.push(context, 'key', 'value1', 'meta1', 'scope1')
      G.push(context, 'key', 'value2', 'meta2', 'scope2')
      expect(context.key.valueOf()).to.eql('value2')
      expect(context.key.$previous.valueOf()).to.eql('value1')
      expect(context.key.$previous.$next.valueOf()).to.eql('value2')

  it '#unshift', ->
    it 'should add items on bottom of the stack', ->
      context = {}
      
      G.unshift(context, 'key', 'value1', 'meta1', 'scope1')
      G.unshift(context, 'key', 'value2', 'meta2', 'scope2')
      expect(context.key.valueOf()).to.eql('value1')
      expect(context.key.$previous.valueOf()).to.eql('value2')
      expect(context.key.$previous.$next.valueOf()).to.eql('value1')


  it '#recall', ->
    it 'should remove value, keep links', ->
      context = {}
      
      G.push(context, 'key', 'value1', 'meta1', 'scope1')
      head = G.push(context, 'key', 'value2', 'meta2', 'scope2')
        
      G.recall head
      expect(context.key).to.eql(undefined)

      expect(head.valueOf()).to.eql('value2')
      expect(head.$previous.valueOf()).to.eql('value1')
      expect(head.$previous.$next.valueOf()).to.eql('value2')

  it '#call', ->
    it 'should bring back value, keep links', ->
      context = {}
      
      G.push(context, 'key', 'value1', 'meta1', 'scope1')
      head = G.push(context, 'key', 'value2', 'meta2', 'scope2')
        
      G.recall head
      G.call head
      expect(context.key).to.eql(head)

      expect(head.valueOf()).to.eql('value2')
      expect(head.$previous.valueOf()).to.eql('value1')
      expect(head.$previous.$next.valueOf()).to.eql('value2')

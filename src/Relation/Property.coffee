Property = 
  # Public API wrapper:
  #   G.set(anyObject, 'key', 'value') 
  'function': (method) ->
    return (context, key, value) ->
      if value?     
        if context
          return G.call(G.create.apply(G, arguments), method)
        else
          return operation
      else   
        return G.recall(G.find.apply(G, arguments))

  # Prototype method:
  #   var g = new G; 
  #   g.set('key', 'value')
  'method': (method) ->
    return (key, value) ->
      if value?
        switch arguments.length
          when 2
            return G.call(G.create(this, key, value), method)
          when 3
            return G.call(G.create(this, key, value, arguments[2]), method)
          when 4
            return G.call(G.create(this, key, value, arguments[2], arguments[3]), method)
          when 5
            return G.call(G.create(this, key, value, arguments[2], arguments[3], arguments[4]), method)
      else   
        switch arguments.length
          when 2
            return G.recall(G.find(this, key, value))
          when 3
            return G.recall(G.find(this, key, value, arguments[2]))
          when 4
            return G.recall(G.find(this, key, value, arguments[2], arguments[3]))
          when 5
            return G.recall(G.find(this, key, value, arguments[2], arguments[3], arguments[4]))

  # Bypass stack of values and write over
  assign: (value, old) ->
    return value

  # Reassignment - Sets operation as head of the stack
  set: (value, old) ->

    value.$preceeding = old
    old.$succeeding = value

    return value

  # Preassignment - Puts value at stack bottom, will not fire callbacks
  preset: (value, old) ->
    first = old
    while first.$preceeding
      first = first.$preceeding
    first.$preceeding = value
    value.$succeeding = first
    return old

module.exports = Property
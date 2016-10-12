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
        return G.call(G.create.apply(this, arguments), method)
      else   
        return G.recall(G.find.apply(this, arguments))

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
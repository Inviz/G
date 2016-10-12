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
    return G.format(value, old)

  # Reassignment - Sets operation as head of the stack
  set: (value, old) ->
    # Apply value transformations
    value = G.format(value, old)

    if old?
      if old.$key
        # Update existing value 
        if other = G.match(value, old)
          return G.update(value, old, other)
        # Push value on top of the stack
        else
          value.$preceeding = old
          old.$succeeding = value
      # Previous value was primitive, keep it
      else
        value.$default = old 

    return value

  # Preassignment - Puts value at stack bottom, will not fire callbacks
  preset: (value, old) ->
    # Apply value transformations
    value = G.format(value, old)

    if old?
      if old.$key
        # Update existing value 
        if other = G.match(value, old)
          return G.update(value, old, other)
        # Shift value to the bottom of the stack
        else
          first = old
          while first.$preceeding
            first = first.$preceeding
          first.$preceeding = value
          value.$succeeding = first
      # Previous value was primitive, keep it
      else
        value.$default = old 

    return old

module.exports = Property
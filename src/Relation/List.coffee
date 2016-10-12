find = (value, property, index) ->

List = 
  'function': (method) ->
    return (context, key, value, meta, scope) ->
      return G.call(List, context, key, value, meta, scope, method)

  # Add value on top of the stack
  push: (value, old) ->
    value.$next = old.$next if old.$next
    old.$next = value
    value.$previous = old
    return value

  # Add value to the bottom of the stack
  unshift: (value, old) ->
    first = old
    while first.$previous
      first = first.$previous
    first.$previous = value
    value.$next = first
    return old

  # Replace element in a list
  swap: (value, old) ->
    value.$previous = old.$previous
    value.$next = old.$next
    old.$next = old.$previous = undefined
    return value

  # Remove element from its list
  remove: (value) ->
    value.$previous?.$next = value.$next
    value.$next?.$previous = value.$previous
    return value.$previous || value.$next

module.exports = List
Stack = 
  # Replace one operation in the stack with another
  rebase: (old, value) ->

    if value
      if value.$succeeding = old.$succeeding
        value.$succeeding.$preceeding = value
      if value.$preceeding = old.$preceeding
        value.$preceeding.$succeeding = value
    else
      old.$succeeding?.$preceeding = old.$preceeding
      old.$preceeding?.$succeeding = old.$succeeding


      old.$succeeding = old.$preceeding = undefined

    return value

  # Attempt to perform soft update, one that only changes references
  update: (value, old, other) ->
    # Op is in stack, so it's redo: not changing history
    if other == value
      return value
    # New value matches meta of old value: replace in place
    else if other == old
      G.rebase(old, value)
      return value
    # Replace unused value with matching meta in the stack 
    else if other
      G.rebase(other, value)
      return old

  # Find operation in the stack that matches meta of a given operation 
  match: (value, old) ->
    other = old
    while other
      if other == value || G.compare(other.$meta, value.$meta)
        return other
      other = other.$preceeding
    return

  # Compare two arrays of arguments
  compare: (meta1, meta2) ->
    if meta1 == meta2
      return true
    if (!meta1 && meta2) || (meta1 && !meta2)
      return false
    if meta1.length != meta2.length
      return false
    i = 0
    while i < meta1.length
      if meta1[i] != meta2[i]
        return false
      i++
    return true

  find: (context, key) ->
    return context[key]

module.exports = Stack
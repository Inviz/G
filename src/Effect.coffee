Observer = 
  # Maintain depth-first double linked list of current operations
  # It is used to compute difference in state and quickly 
  # switch branches of state without recomputation

  record: (value, old, method, previous, transform) ->
    if transform
      value.$transform = transform

      # I. Formatting values:        keep reference to original value
      value.$before = previous
      if previous.$after && !previous.$after.$transform
        value.$after = previous.$after
      value.$before.$after = value

    else 
      if G.callee
        value.$callee = G.callee

      if method

        # II. Updating effect graph:   switch operations in place
        if old
          # Will not update foreign pointer until the end of affect() call
          # So reverse of the linked list is desynced for a while
          if old.$after != value
            value.$after = old.$after

        # III. Tracking side effects:  build dependency graph    
        if G.called
          value.$before = G.called
          value.$before.$after = value

        G.called = value

    if value.$after == value || (value.$before && value.$before.$after == value.$before)
      throw 'zomg circular'

    
    return value

  # Process pure value transformations
  format: (value, old) ->
    if formatters = G.formatters.get(value.$context)
      group = formatters[value.$key]
    
    # Rewind operations caused by transformations
    given = value
    while value.$transform
      value = value.$before

    # If stack of transformations matches
    if G.formatterz.get(value) == group

      # Rewind to the end
      while value.$after && value.$after.$transform
        value = value.$after

    # If watcher configuration doesnt match
    else

      # Apply transformations
      if group && group.length
        G.formatterz.set(value, group)
        for watcher in group
          value = G.callback(value, watcher, old)

      else if value.$after.$transform
        G.formatterz.delete(value)
        # Splice out trasformations
        after = value.$after
        while after && after.$transform
          after = after.$after

        value.$after = after
        if after
          after.$before = value
      G.rebase(given, value)

    return value

  # Process side effects
  affect: (value, old) ->    
    if watchers = G.watchers.get(value.$context)
      unless group = watchers[value.$key]
        if G.watcherz.get(value)
          G.watcherz.delete(value)
        G.called = null unless G.callee
        return
    else
      G.called = null unless G.callee
      return

    # Set GLOBAL pointers
    callee = G.callee
    called = G.called
    G.called = G.callee = value

    
    
    if current = G.watcherz.get(value)
      after = value
      while after = after.$after
        if after.$callee == value
          # Re-apply effects without triggering callbacks
          if current == group
            G.call(after)
            reapplied = true
          else
            G.recall(after)

    unless reapplied
      # If watcher configuration doesnt match
      G.watcherz.set(value, group)

      # Rewind operations caused by transformations
      while value.$after && value.$after.$transform
        value = value.$after

      # Invoke side effects
      if group
        for watcher in group
          value = G.callback(value, watcher, old)

    # Revert global pointer to previous source
    G.callee = callee
    #G.called.$after?.$before = G.called
    G.called = callee && called

    return value

  # Remove side effects
  deaffect: (value) ->
    after = value
    while after = after.$after
      if after.$callee == value
        G.recall(after) 

    return



  callback: (value, watcher, old) ->
    transform = 
      if typeof watcher == 'function'
        watcher
      else
        watcher.$transform

    transformed = transform(value, old)

    unless transformed?
      return value

    unless transformed.$context
      transformed = G.fork(transformed, value)

    return G.record(transformed, old, null, value, transform)


module.exports = Observer
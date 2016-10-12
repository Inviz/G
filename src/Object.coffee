Object = 
    
  watch: (context, key, watcher, pure) ->
    if pure
      source = G.formatters
    else
      source = G.watchers

    unless watchers = source.get(context)
      source.set(context, watchers = {})

    # Create new array of watchers
    if watchers[key]
      watchers[key] = watchers[key].concat(watcher)
    else
      watchers[key] = [watcher]

    if value = context[key]
      while value.$transform
        value = value.$before

      # Value was not unboxed yet:   Reassign it through the pipeline
      if !value.$context
        G.set(context, key, value)

      # New value transformer:       Re-apply value
      else if pure
        G.call(value, 'set')
      # New value observer:          Update side effects
      else
        G.affect(value)

  unwatch: (context, key, watcher, pure) ->
    if pure
      source = G.formatters
    else
      source = G.watchers

    # Create a new array of watchers that excludes given one
    if watchers = source.get(context)
      if group = watchers[key]
        watchers[key] = group.filter (other) -> 
          return other != watcher
      
    if value = context[key]
      # New value transformer:       Re-apply value
      if pure
        G.call(value, 'set')
      # New value observer:          Update side effects
      else
        G.affect(value)

  merge: (context, object, meta, scope) ->
    for key, value of object
      op = G(context, key, value, meta, scope)

    return op


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


module.exports = Object
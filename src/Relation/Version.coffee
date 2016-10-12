# Placeholder for actual op transform

Version =
  version: (type, index, payload, string, context, key, meta, scope, lazy) ->
    if lazy
      operation = G.create(context, key, string, meta, scope)
    else
      operation = G(context, key, string, meta, scope)
    operation.$type = type
    operation.$index = index
    operation.$payload = payload
    return operation

  apply: () ->
    for operation in arguments
      G[dispatch(operation)](
        operation.$context, operation.$key, 
        operation.$index, operation.$payload, 
        operation.$meta, operation.$scope, false)

  insert: (context, key, index, value, meta, scope, lazy) ->
    if old = context[key]
      string = old.substring(0, index) + value + old.substring(index)
    else
      string = value
    return G.version('insert', index, value, string, context, key, meta, scope, lazy)

  delete: (context, key, index, length, meta, scope, lazy) ->
    string = context[key].substring(0, index) + context[key].substring(index + length)
    return G.version('delete', index, length, string, context, key, meta, scope, lazy)

  #differ: require('diff_match_patch')

  diff: (operation, value) ->
    diff = engine.diff_main(operation, value)
    engine.diff_cleanupEfficiency(diff)
    G.fromDiff(operation, diff)

dispatch = (operation) ->
  if typeof operation.$payload == 'number'
    return 'delete'
  else
    return 'insert'
    
module.exports = Version

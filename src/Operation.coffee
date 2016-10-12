# Cause   - before/after
# History - preceeding/succeeding
# Group   - previous/next

# user.posts.each

# user.set


# operation - transaction


# Create operation - one property changed value
# new G(target) - returns wrapper instance
# G(target, key, value) - sets single value

G = (context, key, value) ->
  if !value? && key?
    return G.recall(G.find.apply(G, arguments), true)

  operation = G.create.apply(this, arguments)

  if context
    return G.call(operation, 'set')
  else
    return G.record(operation, null, 'set')

# Apply operation to its context
# If method name is not provided, 
# linked list of effects will not be altered
G.call = (value, method) ->
  old = value.$context[value.$key]

  # Transform value
  value = G.format(value, old)

  # If there was another value by the same key and method is given
  if method && old?
    # Previous value was primitive, remember it
    if !old.$key
      value.$default = old
    else
      # Update existing value with matching meta
      if other = G.match(value, old)
        value = G.update(value, old, other)

      # Invoke method to put value at specific place in the stack
      else
        G.methods[method](value, old)


  if value != old && !value.failed
    # Place operation into dependency graph
    G.record(value, old, method)

    # Actually change value
    value.$context[value.$key] = value
    
    # Apply side effects and invoke observers
    G.affect(value, old)

  return value

# Undo operation. Reverts value and its effects to previous versions.
# If hard argument is set, removes operation from history
G.recall = (value, hard) ->
  # Only current value can be recalled
  old = value.$context[value.$key]
  while value.$after && value.$after.$transform
    value = value.$after

  if old == value
    # Revert to previous version
    if replacement = value.$preceeding
      return G.call(replacement)
    # Unset value
    else
      # Remove side effects
      G.deaffect(value)

      # Remove value from context
      delete value.$context[value.$key]

  else
    # Remove value from history
    if hard
      G.rebase(value, null)
  
  return

# Create enriched operation object (from primitive)
G.create = (context, key, value) ->

  # Get primitive value, falls back to "this"
  primitive = (value ? this).valueOf()
  
  # Convert it to object
  operation = Object(primitive)

  operation.$key     = key     if key?
  operation.$context = context if context?

  # Pick up stack  
  if G.callee
    meta = G.callee.$meta

  # Merge meta arguments
  if arguments.length > 3
    if meta
      meta = meta.slice()
    else
      meta = new Array(arguments.length - 3)

    i = 2
    while ++i < arguments.length
      if arguments[i]?
        meta[i - 3] = arguments[i]
    
  operation.$meta    = meta    if meta?
  
  return operation

# Clone operation from primitive and another operation
G.fork = G::fork = (primitive, value = this) ->
  op = G.create(value.$context, value.$key, primitive)
  if value.$meta
    op.$meta = value.$meta
  return op

# For each context, references object with Arrays of observers by key name
G.watchers = new WeakMap
G.formatters = new WeakMap

# References current operation
G.callee = G.called = null

for Module in [require('./Object'), require('./Stack'), require('./Effect')]
  for property, value of Module
    G[property] = value


G.relate = require('./Wrapper/Relation')
G.proxy  = require('./Wrapper/Proxy')

G.methods = {}
G.Methods = [
  require('./Relation/List')
  require('./Relation/Property')
  require('./Relation/Version')
]
G.Methods.forEach G.relate, G


global?.G = G
module.exports = G
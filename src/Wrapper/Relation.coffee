# Convert relation definition into set of public methods
# Uses special `wrapper`, `call` and `recall` values

module.exports = (relation) ->
  for property, value of relation
    continue if property == 'method' || property == 'function'
    if wrapper = relation.function
      this.methods[property] = value
      this[property] = wrapper(property) 
      if method = relation.method
        this.prototype[property] = method(property)
    else
      this[property] = value

  return relation
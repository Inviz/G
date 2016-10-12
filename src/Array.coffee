module.exports = 
  iterate: (array, callback) ->
    results = null
    G.forEach array, (value, index, result) ->
      if transformed = callback.call(value, index, result)
        results = G.push(results, transformed)
    return results

  find: (array, callback) ->
    return G.iterate array, callback, (value, index, result) ->
      return value if result
    , true

  filter: (array, callback) ->
    return G.iterate array, callback, (value, index, result) ->
      return value if result

  reject: (array, callback) ->
    return G.iterate array, callback, (value, index, result) ->
      return value unless result

  map: (array, callback) ->
    return G.iterate array, callback, (value, index, result) ->
      return result

  collect: (array, callback) ->
    return G.iterate array, callback, (value, index, result) ->
      return result if result


  splice: (array, start, removing) ->
    inserting = arguments.length - 3


    for i in [0 ... removing] by 1
      if i < inserting
        G.swap(array, i + start, arguments[i + 3])
      else
        G.eject(array, i + start)


    if (diff = inserting - removing) > 0
      for i in [0 ... diff] by 1
        G.inject(array, i + start + removing, arguments[i + 3 + removing])

    return array



  getByIndex: ->
    

  setByIndex: ->


###
array = site.users.filter('active').sort('created_at')

site.users.push(user)

site.users.set()
###
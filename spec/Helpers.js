
  StateGraph = function(operation, before, after) {
    var lastAfter, lastBefore, list;
    list = [];
    before = after = operation;
    lastBefore = lastAfter = operation;
    while (before = before.$before) {
      if (before.$after !== lastBefore) {
        throw 'List is broken';
      }
      list.unshift(before);
      lastBefore = before;
    }
    list.push(operation);
    while (after = after.$after) {
      if (after.$before !== lastAfter) {
        throw 'List is broken';
      }
      list.push(after);
      lastAfter = after;
    }
    return list;
  };

  ValueGroup = function(operation, before, after) {
    var lastAfter, lastBefore, list;
    list = [];
    previous = next = operation;
    lastBefore = lastAfter = operation;
    while (previous = previous.$leading) {
      if (previous.$following !== lastBefore)
        break;
      list.unshift(previous);
      lastBefore = previous;
    }
    list.push(operation);
    while (next = next.$following) {
      if (next.$leading !== lastAfter)
        break;
      list.push(next);
      lastAfter = next;
    }
    list.forEach(function(node) {
      if (node.$parent) {
        if (node.$parent.$following && node.$parent.$following.$parent == node.$parent) {
          if (node.$parent.$first != node.$parent.$following)
            throw '$first doesnt point properly'
          for (var next = node.$parent; next = next.$following;) {
            if (next.$parent == node.$parent)
              var last = next;
          }
          if (last && node.$parent.$last != last)
            throw '$last doesnt point properly'
        }
      }
    })
    return list;
  };

  ValueStack = function(operation, before, after) {
    var lastAfter, lastBefore, list;
    list = [];
    before = after = operation;
    lastBefore = lastAfter = operation;
    while (before = before.$preceeding) {
      if (before.$succeeding !== lastBefore) {
        throw 'List of values in the stack is not valid';
      }
      list.unshift(before);
      lastBefore = before;
    }
    list.push(operation);
    while (after = after.$succeeding) {
      if (after.$preceeding !== lastAfter) {
        throw 'List of values in the stack is not valid';
      }
      list.push(after);
      lastAfter = after;
    }
    return list;
  };

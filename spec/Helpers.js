
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

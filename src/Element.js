G.List = function() {

}
G.List.prototype = new G

// Remove node from tree
G.List.recall = function(operation) {
  G.List.unlink(operation)
  if (operation instanceof G.Element)
    if (operation.$node)
      G.Element.detach(operation)
    else
      G.List.Children(operation, G.Element.detach)
  return operation
};

// Reapply node where it belongs in the tree
G.List.extend = G.List.call
G.List.call = function(op) {
  for (var to = op; to.$last;)
    to = to.$last;
  G.List.link(op.$leading, op)                //    Patch graph and detach the tree at top
  G.List.link(to, to.$following)
  return op;
};

// Iterate children
G.List.Children = function(operation, callback, argument) {
  for (var last = operation; last.$last;)
    last = last.$last
  
  for (var after = operation; after.$following;) {
    if (after.$following.$leading !== after)
      break;
    after = after.$following
    if (after.$parent === operation)
      callback(after, argument);
    if (after == last)
      break;
  }
  return last;
}

// Connect pointers of two sibling nodes together
G.List.link = function(left, right) {
  if ((left.$following = right))                          // fix $following/$leading refs
    left.$following.$leading = left;
  
  if (left.$parent) {
    if (left.$parent == right.$parent ) {            // Fix $first/$last refs in parent
      if (left.$parent.$last == left)
        left.$parent.$last = right;
      if (left.$parent.$first == right)
        left.$parent.$first = left;
    }
  }
};

// Remove span of nodes from the graph
// Without second argument it removes op's children
G.List.unlink = function(operation, to) {
  if (to == null)                                     // find last deepest child
    for (var to = operation; to.$last;)
      to = to.$last; 

  if (operation.$parent) {                            // fix $first/$last refs in parent
    if (operation.$parent.$first == operation)
      operation.$parent.$first = to && to.$following;
    if (operation.$parent.$last == operation)
      operation.$parent.$last = operation.$leading;
  }

  if (to && to.$following && to == to.$following.$leading)     // fix $following/$leading refs
    to.$following.$leading = operation.$leading          // in place of detachment
  if (operation.$leading)
    if (operation == operation.$leading.$following)
      operation.$leading.$following = to && to.$following;
  return to;
}


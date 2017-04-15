/*
Renders a tree like this (but better formatted)
　　　　　▢　　　　
　　　╭─◯──╮　
　　╭△╮　╭─△　
　╭△╭△╮△╭△╮
　△△△△△　△△△
*/

G.$debug = function(operation, msg) {
  if (!(this instanceof G.$debug)) {
    var d = new G.$debug(operation);
    return debug.innerHTML += '<strong>' + (msg || 'A tree') + ':</strong>' + d.toString() + '\n';
  }

  this.root = operation;
  while (this.root.$before)
    this.root = this.root.$before;

  this.operation = operation;
};

G.$debug.prototype.build = function(effect, caller) {
  if (!effect) effect = this.root;
  var children, self = this;;
  var siblings = []

  for (var next = effect; next; next = next.$after) {
    if (next.$caller == caller) {
      siblings.push([next].concat(this.build(next, next)))
    }
  }
  for (var i = 0; i < siblings.length; i++) {
    
  }
  return siblings;
}
G.$debug.prototype.concat = function(target, source, shift, separator, width) {
  for (var i = 0; i < source.length; i++)
    if (!target[i + shift])
      target[i + shift] = new Array(width + 1).join(' ') + separator + source[i]
    else
      target[i + shift] += separator + source[i]
  return target[shift].replace(/<[^>]+>/g, '').length + separator.length;
}

G.$debug.prototype.toArray = function(tree) {
  if (tree[0].$caller && tree[0].$context)
    if (tree[0].$caller.$context == tree[0].$context)
      if (tree[0].$meta)
        var string = '▢'
      else
        var string = '△'
    else
      var string = '◯'
  else
    var string = '▢'
  var children = tree.length - 1;
  var bits = []
  var width = 0;

  var lines = ['<span\nk="' + tree[0].$key + '"\nv="' + tree[0].toString() + '">' + string + '</span>']

  if (children) {
    for (var i = 0; i < children; i++) {
      var sublines = this.toArray(tree[i + 1]);
      var width = this.concat(lines, sublines, 1, '', width);
    }

    console.error(width)
    var pos = Math.floor(width / 2);
    var first = lines[1].replace(/<[^>]+>/g, '')

    var started, ended;
    var before = '';
    var after = ''
    for (var l = 0; l < pos; l++) {
      switch (first.charAt(l)) {
        case ' ': case '╮': case '╭': case '─':
          if (started)
            before += '─'
          else
            before += ' '
          break;
        default:
          if (!started) {
            started = true;
            before += '╭';
          } else {
            before += '┬'
          }
      }
    }
    for (var l = width - 1; l > pos; l--) {
      switch (first.charAt(l)) {
        case ' ': case '╮': case '╭': case '─':
          if (ended)
            after = '─' + after;
          else
            after = ' ' + after;

          break;
        default:
          if (!ended) {
            ended = true;
            after = '╮' + after;
          } else {
            after = '┬' + after
          }
      }
    }
    lines[0] = before + lines[0] + after
  }
  for (var i = 0; i < lines.length; i++){
    var w = lines[i].replace(/<[^>]+>/g, '').length
    if (w < width) {
      lines[i] += (new Array(width - w + 1)).join(' ')
    }
  }
  return lines
}

G.$debug.prototype.toString = function(tree, deep) {
  if (!tree) var tree = this.build();
  var lines = [], width = 0;
  tree.forEach(function(subtree) {
    width = this.concat(lines, this.toArray(subtree), 0, '　', width)
  }, this)
  console.log(lines.join('\n').replace(/ /g, '　'))
  return lines.join('\n').replace(/ /g, '　')
}


G.$debug.prototype.toCleanString = function(tree, deep) {
  return this.toString().replace(/<[^>]+>/g, '')
}

G.debugging = location.search.indexOf('debug') > -1
// transformer
object.define('test', function(value) {
  return value.toLowerCase();
})
// computed property
object.define('fullName', function() {
  return this.firstName + ' ' + this.lastName;
})

// static property: side effect
object.watch('test', function(object) {
  object.test = 123; // object.set('test', 123)
})
object.watch('test', function(value) {
  this.something = value; // this.set('something', 123)
})


// watch+return: Map function
object.watch('array', function(value) {
  return value.title;
})


// watch+return+condition: Filter function
var filtered = object.watch('array', function(value) {
  if (value.title)
    return value;
})


// watch+return: creates reference to future value
var future = object.watch('object', function(value) {
  if (value.title)
    return value;
})


// observe+object: merge objects
target.observe(source)

// observe+return: creates new object
var filtered = object.observe(function(key, value) {
    if (key != 'test')
      return value;
})

// observe: global side effects
object.observe(function(key, value) {
    if (key == 'test')
      something.set('reality', value);
})


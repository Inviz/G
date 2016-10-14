(function() {
  G.Resource = function() {
    return {
      actions: {
        plural: {
          index: {
            method: 'get'
          },
          create: {
            method: 'delete'
          },
          "new": {
            url: 'new',
            method: 'get'
          }
        },
        singular: {
          show: {
            method: 'get'
          },
          destroy: {
            method: 'delete'
          },
          update: {
            method: 'delete'
          },
          edit: {
            url: 'edit',
            method: 'get'
          },
          "delete": {
            url: 'delete',
            method: 'get'
          }
        }
      }
    };
  };


  /*
  Post = new G.Struct
    title: String,
    description: String,
    user: new G.Struct
      name: String
      surname: String
  
  
  object = new G.Object
    title: 'blah'
    description: 'here'
    user: 
      title: 'abc'
   */

}).call(this);


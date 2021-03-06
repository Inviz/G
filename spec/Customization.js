describe('Subclassing', function() {
  it ('should be able to subclass Node and Scope', function() {


    var App = {}; 

    // Base class for model based on microdata
    App.Model = function() {
      return G.Scope.apply(this, arguments);
    }
    G.Scope.extend(App.Model);


    // Custom microdata handler
    App.Article = function() {
      return App.Model.apply(this, arguments);
    }
    App.Model.extend(App.Article);

    App.Comment = function() {
      return App.Model.apply(this, arguments);
    }
    App.Model.extend(App.Comment);

    // Subclass DOM node base class to use `App.Model` class for microdata
    App.Node = function() {
      return G.Node.apply(this, arguments);
    }
    G.Node.extend(App.Node);
    App.Node.prototype.constructors = {
      microdata: App.Model
    }



    App.Node.Body = function () {
      this.scope = new App.Model;
      this.setArguments.apply(this, arguments);
    };
    App.Node.Body.prototype = new App.Node;

    // Register tags
    App.Node.mapping.body = App.Node.Body;


    // Register model classes by keys, so they would 
    // be instantiated instead of generic Scope
    App.Node.prototype.itemprops = 
    App.Model.prototype.constructors = {
      articles: App.Article,
      comments: App.Comment
    }

    // Register model classes by itemtype, 
    // so html element may specify its type
    App.Node.prototype.itemtypes = {
      article: App.Article
    }

    var body = document.createElement('body');
    body.innerHTML = '<section><ul><li itemscope itemtype="article" itemprop="the_articles" itemid="1">\
        <h1 itemprop="title">Hello</h1>\
        <div itemscope itemprop="comments" itemid="1">\
          <p itemprop="body">Lol</p>\
        </div>\
      </li>\
      <li itemscope itemtype="article" itemprop="the_articles" itemid="2">\
        <h1 itemprop="title">Goodbye</h1>\
      </li></ul></section>'
    var doc = App.Node(body);

    expect(doc.scope instanceof App.Model).to.eql(true)
    expect(doc instanceof App.Node.Body).to.eql(true)
    expect(doc.$first instanceof App.Node.Body).to.eql(false)
    expect(doc.$first instanceof App.Node).to.eql(true)
    expect(doc.$first.$first.$first.scope instanceof App.Article).to.eql(true)
    expect(doc.$first.$first.$first.scope.comments instanceof App.Comment).to.eql(true)
    expect(JSON.stringify(doc.scope.the_articles.clean())).to.eql(JSON.stringify({title: 'Goodbye'}))
    expect(JSON.stringify(doc.scope.the_articles.$previous.clean())).to.eql(JSON.stringify({title: 'Hello',"comments":{"body":"Lol"}}))

    doc.$first.$first.$first.set('itemtype', 'serenade');
    expect(doc.$first.$first.$first.scope instanceof App.Article).to.eql(false)
    expect(doc.$first.$first.$last.scope instanceof App.Article).to.eql(true)
    expect(doc.scope.the_articles instanceof App.Article).to.eql(true)
    expect(doc.scope.the_articles.$previous instanceof App.Article).to.eql(false)
    expect(JSON.stringify(doc.scope.the_articles.clean())).to.eql(JSON.stringify({title: 'Goodbye'}))
    expect(JSON.stringify(doc.scope.the_articles.$previous.clean())).to.eql(JSON.stringify({title: 'Hello',"comments":{"body":"Lol"}}))

  })

})
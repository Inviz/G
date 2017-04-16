describe('G.Node data', function() {
  it ('should compare positions of nodes', function() {
    var parent = new G.Node('parent', null,
      new G.Node('child', null),
      new G.Node('child', null, 
        new G.Node('child', null, 
          new G.Node('child', null, 
            new G.Node('grandchild'),
            new G.Node('grandchild')),
          new G.Node('grandchild')),
        new G.Node('grandchild')),
      new G.Node('child', null,
        new G.Node('child', null, 
          new G.Node('grandchild'),
          new G.Node('grandchild'))
      )
    );
    var i = 0;
    var els = [];
    for (var n = parent; n; n = n.$following) {
      n.$index = i++;
      els.push(n)
    }
    for (var a, j = 0; a = els[j++];) {
      for (var b, k = 0; b = els[k++];) {
        var result = a.$index == b.$index ? 0 : a.$index > b.$index ? -1 : 1;
        expect(a.comparePosition(b)).to.eql(result)
      }
    }
  })
  it ('should inherit values object from parent form', function() {
    var form = new G.Node('form', {method: 'post', action: '/whatever.html'},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('input', {name: 'your_name', value: 'Boris'}),
        new G.Node('input', {name: 'over_18', type: 'checkbox'}),
        new G.Node('input')
      )
    );
    var input = form.$last.$first;
    var submit = form.$last.$last;

    expect(form.values).to.not.eql(undefined)
    expect(input.values).to.eql(form.values)
    expect(String(form.values.your_name)).to.eql('Boris')

    input.set('value', 'Vasya')

    expect(String(form.values.your_name)).to.eql('Vasya')

    expect(G.stringify(ValueGroup(form.values.your_name))).to.eql(G.stringify(['Vasya']))

    input.set('name', 'MY_NAME')
    
    expect(String(form.values.MY_NAME)).to.eql('Vasya')
    expect(form.values.your_name).to.eql(undefined)

    input.set('value', 'Johny')
    expect(String(form.values.MY_NAME)).to.eql('Johny')
    expect(form.values.your_name).to.eql(undefined)

    input.uncall();
    expect(form.values.MY_NAME).to.eql(undefined)
    expect(form.values.your_name).to.eql(undefined)

    input.set('value', 'Jackie')
    expect(form.values.MY_NAME).to.eql(undefined)
    expect(form.values.your_name).to.eql(undefined)

    input.call();
    expect(String(form.values.MY_NAME)).to.eql('Jackie')
    expect(form.values.your_name).to.eql(undefined)

    input.set('name', 'her_name')
    expect(String(form.values.her_name)).to.eql('Jackie')
    expect(form.values.her_name.$meta).to.eql([input])
    expect(form.values.MY_NAME).to.eql(undefined)
    expect(form.values.your_name).to.eql(undefined)

    submit.set('name', 'submission_button');
    expect(G.stringify(form.values)).to.eql(G.stringify({her_name: 'Jackie'}))

    var value = submit.set('value', 'the_button');

    expect(G.stringify(form.values)).to.eql(G.stringify({her_name: 'Jackie', submission_button: 'the_button'}))

    var value = submit.set('value', 'the_button');


    var input3 = new G.Node('input', {name: 'comment', value: 'Boo!'})

    submit.$parent.appendChild(input3)
    expect(G.stringify(form.values)).to.eql(G.stringify({her_name: 'Jackie', submission_button: 'the_button', comment: 'Boo!'}))


    expect(input3.$watchers.name).to.not.eql(undefined)
    
    input3.name.uncall()

    expect(input3.$watchers.name).to.eql(undefined)
  })

  it ('should handle inputs of different types', function() {
    var form = new G.Node('form', {method: 'post', action: '/whatever.html'},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('input', {name: 'your_name', value: 'Boris', type: 'hidden'}),
        new G.Node('input', {name: 'over_18', type: 'checkbox', value: 'yeah'}),
        new G.Node('input', {name: 'alignment', type: 'radio', value: 'good'}),
        new G.Node('input', {name: 'alignment', type: 'radio', value: 'evil'}),
        new G.Node('input', {name: 'submission', value: 'yaba-doo', type: 'submit'})
      )
    );
    var input = form.$last.$first;
    var checkbox = input.$next;
    var good = checkbox.$next;
    var evil = good.$next;
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))

    checkbox.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', over_18: 'yeah'}))
    checkbox.set('checked', false)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))
    checkbox.set('checked', null)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))

    evil.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', alignment: 'evil'}))

    good.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', alignment: 'good'}))

    evil.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', alignment: 'evil'}))

    evil.checked.uncall();
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))

    checkbox.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', over_18: 'yeah'}))

    var value = checkbox.value.uncall()
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', over_18: 'on'}))

    value.call()
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', over_18: 'yeah'}))

    var name = checkbox.name.uncall()
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))

    value.uncall()
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))

    name.call()
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris', over_18: 'on'}))

    checkbox.set('disabled', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({your_name: 'Boris'}))
  })

  it ('should handle prefixed inputs of different types', function() {
    var form = new G.Node('form', {method: 'post', action: '/whatever.html'},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('input', {name: 'person[your_name]', value: 'Boris', type: 'hidden'}),
        new G.Node('input', {name: 'person[over_18]', type: 'checkbox', value: 'yeah'}),
        new G.Node('input', {name: 'person[alignment]', type: 'radio', value: 'good'}),
        new G.Node('input', {name: 'person[alignment]', type: 'radio', value: 'evil'}),
        new G.Node('input', {name: 'person[submission]', value: 'yaba-doo', type: 'submit'})
      )
    );
    var input = form.$last.$first;
    var checkbox = input.$next;
    var good = checkbox.$next;
    var evil = good.$next;
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))

    checkbox.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', over_18: 'yeah'},
      'person[over_18]': 'yeah'
    }))

    checkbox.set('checked', false)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))

    checkbox.set('checked', null)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))

    evil.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', alignment: 'evil'},
      'person[alignment]': 'evil'
    }))

    good.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', alignment: 'good'},
      'person[alignment]': 'good'
    }))

    evil.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', alignment: 'evil'},
      'person[alignment]': 'evil'
    }))

    evil.checked.uncall();
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))

    checkbox.set('checked', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', over_18: 'yeah'},
      'person[over_18]': 'yeah'
    }))

    var value = checkbox.value.uncall()
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', over_18: 'on'},
      'person[over_18]': 'on'
    }))

    value.call()
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', over_18: 'yeah'},
      'person[over_18]': 'yeah'
    }))

    var name = checkbox.name.uncall()
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))

    value.uncall()
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))

    name.call()
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris', over_18: 'on'},
      'person[over_18]': 'on'
    }))

    checkbox.set('disabled', true)
    expect(G.stringify(form.values)).to.eql(G.stringify({
      'person[your_name]': 'Boris',
      person: {your_name: 'Boris'}
    }))
  })
  
  it ('should register compound fieldnames in forms', function() {
    var input = G.Node('input', {name: 'person[name]', value: 'Oy boi'});
    var form = new G.Node('form');
    form.appendChild(input)

    expect(String(form.values['person[name]'])).to.eql('Oy boi')
    expect(String(form.values.person.name)).to.eql('Oy boi')

    input.set('value', 'Ya bwoy')
    expect(String(form.values['person[name]'])).to.eql('Ya bwoy')
    expect(String(form.values.person.name)).to.eql('Ya bwoy')

    var name = input.uncall()
    expect(form.values['person[name]']).to.eql(undefined)
    expect(form.values.person).to.eql(undefined)

    name.call()
    expect(String(form.values['person[name]'])).to.eql('Ya bwoy')
    expect(String(form.values.person.name)).to.eql('Ya bwoy')

    var value = input.value.uncall();
    expect(String(form.values['person[name]'])).to.eql('Oy boi')
    expect(String(form.values.person.name)).to.eql('Oy boi')

    input.value.uncall();
    expect(form.values['person[name]']).to.eql(undefined)
    expect(form.values.person).to.eql(undefined)

    value.call();
    expect(String(form.values['person[name]'])).to.eql('Ya bwoy')
    expect(String(form.values.person.name)).to.eql('Ya bwoy')

    input.set('name', 'person[nickname]')
    expect(form.values['person[name]']).to.eql(undefined)
    expect(form.values.person.name).to.eql(undefined)
    expect(String(form.values['person[nickname]'])).to.eql('Ya bwoy')
    expect(String(form.values.person.nickname)).to.eql('Ya bwoy')

    input.set('value', 'The Peacemaker')
    expect(form.values['person[name]']).to.eql(undefined)
    expect(form.values.person.name).to.eql(undefined)
    expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
    expect(String(form.values.person.nickname)).to.eql('The Peacemaker')

    var age = new G.Node('input', {name: 'person[age]'})
    form.appendChild(age);
    expect(form.values['person[age]']).to.eql(undefined)
    expect(form.values.person.age).to.eql(undefined)

    age.set('value', 27)
    expect(Number(form.values['person[age]'])).to.eql(27)
    expect(Number(form.values.person.age)).to.eql(27)
    expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
    expect(String(form.values.person.nickname)).to.eql('The Peacemaker')


    input.uncall();
    expect(Number(form.values['person[age]'])).to.eql(27)
    expect(Number(form.values.person.age)).to.eql(27)
    expect(form.values['person[nickname]']).to.eql(undefined)
    expect(form.values.person.nickname).to.eql(undefined)

    age.uncall()
    expect(form.values.person).to.eql(undefined)

    input.call();
    expect(form.values['person[age]']).to.eql(undefined)
    expect(form.values.person.age).to.eql(undefined)
    expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
    expect(String(form.values.person.nickname)).to.eql('The Peacemaker')

    age.call()
    expect(String(form.values['person[nickname]'])).to.eql('The Peacemaker')
    expect(String(form.values.person.nickname)).to.eql('The Peacemaker')
    expect(Number(form.values['person[age]'])).to.eql(27)
    expect(Number(form.values.person.age)).to.eql(27)

    form.values.person.set('age', 28)
    expect(Number(form.values.person.age)).to.eql(28)
    expect(Number(age.value)).to.eql(27)

    var age27 = age.value.uncall()
    expect(Number(age.value)).to.eql(28)
    expect(Number(form.values.person.age)).to.eql(28)
    expect(Number(form.values['person[age]'])).to.eql(28)

    age27.call()
    expect(Number(form.values.person.age)).to.eql(28)
    expect(Number(age.value)).to.eql(27)
    expect(Number(form.values['person[age]'])).to.eql(27)

    form.values.person.age.uncall()
    expect(Number(form.values.person.age)).to.eql(27)
    expect(Number(age.value)).to.eql(27)
    expect(Number(form.values['person[age]'])).to.eql(27)
  })
  
  it ('should register arraylike fieldnames in forms', function() {
    var input1 = G.Node('input', {name: 'person[interests][]', value: 'Books'});
    var form = new G.Node('form');
    form.appendChild(input1)
    expect(String(form.values.person.interests)).to.eql('Books')

    var input2 = G.Node('input', {name: 'person[interests][]', value: 'Vintage Diskettes'});
    form.appendChild(input2)
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Books', 'Vintage Diskettes']))

    input2.set('value', 'Modern Laser Disks')
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Books', 'Modern Laser Disks']))

    input1.set('value', 'Magazines')
    expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))

    G.swap(input2, input1);
    expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Modern Laser Disks', 'Magazines']))
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Modern Laser Disks', 'Magazines']))

    G.swap(input2, input1);
    expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks']))

    var input3 = G.Node('input', {name: 'person[interests][]', value: 'Ubuquitous Morality'});
    form.prependChild(input3)
    expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Ubuquitous Morality', 'Magazines', 'Modern Laser Disks']))
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Ubuquitous Morality', 'Magazines', 'Modern Laser Disks']))

    form.appendChild(input3)
    expect(G.stringify(ValueGroup(form.values['person[interests][]']))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks', 'Ubuquitous Morality']))
    expect(G.stringify(ValueGroup(form.values.person.interests))).to.eql(G.stringify(['Magazines', 'Modern Laser Disks', 'Ubuquitous Morality']))


  })

  it ('should clone elements when adding new microdata values', function() {
    var form = new G.Node('article', {itemscope: true},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('a', {itemprop: 'url', href: 'boris.html'}),
        new G.Node('span', {}, 'Hello')
      )
    );

    form.scope.push('url', 'gunslinger.html');
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(String(form.$last.$first.$next.href)).to.eql('gunslinger.html')

    form.$last.$last.set('itemprop', 'greeting')
    expect(String(form.scope.greeting)).to.eql('Hello')

    form.scope.unshift('greeting', 'Bonjour')
    expect(String(form.scope.greeting)).to.eql('Hello')
    expect(String(form.scope.greeting.$previous)).to.eql('Bonjour')
    expect(String(form.$last.$last.getTextContent())).to.eql('Hello')
    expect(String(form.$last.$last.$previous.getTextContent())).to.eql('Bonjour')
    
    form.scope.unset('greeting', 'Bonjour')
    expect(String(form.scope.greeting)).to.eql('Hello')
    expect(form.scope.greeting.$previous).to.eql(undefined)
    expect(String(form.$last.$last.getTextContent())).to.eql('Hello')
    expect(String(form.$last.$last.$previous.href)).to.eql('gunslinger.html')
  })

  it ('should change microdata scopes', function() {
    var form = new G.Node('article', {itemscope: true},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('a', {itemprop: 'url', href: 'boris.html'}),
        new G.Node('span', {}, 'Hello')
      )
    );

    expect(G.stringify(form.scope)).to.eql(G.stringify({url: 'boris.html'}))

    form.$last.merge({
      itemscope: true,
      itemprop: 'person'
    })
    expect(form.$last.$first.$scope).to.eql(form.$last.scope);
    expect(form.$last.$first.scope).to.eql(form.$last.scope);
    expect(G.stringify(form.scope)).to.eql(G.stringify({person: {url: 'boris.html'}}))

    var microdata = form.$last.scope;
    var itemprop = form.$last.itemprop.uncall()

    expect(G.stringify(form.scope)).to.eql(G.stringify({url: 'boris.html'}))

    itemprop.call()
    expect(form.$last.scope).to.eql(microdata)
    expect(G.stringify(form.scope)).to.eql(G.stringify({person: {url: 'boris.html'}}))


    var itemscope = form.$last.itemscope.uncall()
    expect(G.stringify(form.scope)).to.eql(G.stringify({person: 'Hello', url: 'boris.html'}))

    debugger
    itemscope.call()
    expect(G.stringify(form.scope)).to.eql(G.stringify({person: {url: 'boris.html'}}))
  });
  it ('should change microdata values', function() {
    var form = new G.Node('article', {itemscope: true},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('a', {itemprop: 'url', href: 'boris.html'}),
        new G.Node('span', {}, 'Hello')
      )
    );
    expect(String(form.scope.url)).to.eql('boris.html')

    form.scope.set('url', 'horror.html', 'zug')
    expect(String(form.$last.$first.href)).to.eql('horror.html')

    form.scope.url.uncall()
    expect(String(form.$last.$first.href)).to.eql('boris.html')

    var boris = form.scope.url.uncall();
    expect(String(form.$last.$first.tag)).to.eql('span')

    boris.call()
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(G.stringify(ValueStack(boris))).to.eql(G.stringify(['boris.html', 'horror.html']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html']))

    form.scope.preset('url', 'zorro.html', 'xoxo')
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(G.stringify(ValueStack(boris))).to.eql(G.stringify(['zorro.html', 'boris.html', 'horror.html']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html']))

    form.$last.$last.set('itemprop', 'url')
    expect(G.stringify(ValueStack(boris))).to.eql(G.stringify(['zorro.html', 'boris.html', 'horror.html']))
    expect(G.stringify(ValueStack(form.scope.url))).to.eql(G.stringify(['Hello']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html', 'Hello']))
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(String(form.$last.$last.getTextContent())).to.eql('Hello')
    
    var gomes = form.scope.overlay('url', 'Gomes', 'hulk')
    expect(G.stringify(ValueStack(gomes))).to.eql(G.stringify(['Hello', 'Gomes']))
    expect(G.stringify(ValueStack(form.scope.url))).to.eql(G.stringify(['Hello', 'Gomes']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html', 'Gomes']))
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

    gomes.uncall()
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html', 'Hello']))
    expect(G.stringify(ValueStack(form.scope.url))).to.eql(G.stringify(['Hello', 'Gomes']))
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(G.stringify(ValueStack(form.$last.$last.$first.text))).to.eql(G.stringify(['Hello']))
    expect(String(form.$last.$last.getTextContent())).to.eql('Hello')

    gomes.call()
    expect(G.stringify(ValueStack(form.scope.url))).to.eql(G.stringify(['Hello', 'Gomes']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html', 'Gomes']))
    expect(String(form.$last.$first.href)).to.eql('boris.html')
    expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

    var holmes = form.scope.overlay(boris, 'Holmes', 'hulk')
    expect(G.stringify(ValueStack(form.scope.url))).to.eql(G.stringify(['Hello', 'Gomes']))
    expect(G.stringify(ValueStack(holmes))).to.eql(G.stringify(['zorro.html', 'boris.html', 'Holmes', 'horror.html']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['Holmes', 'Gomes']))
    expect(G.stringify(ValueStack(form.$last.$first.href))).to.eql(G.stringify(['boris.html', 'Holmes']))
    expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

    holmes.uncall()
    expect(G.stringify(ValueStack(form.scope.url))).to.eql(G.stringify(['Hello', 'Gomes']))
    expect(G.stringify(ValueStack(form.scope.url.$previous))).to.eql(G.stringify(['zorro.html', 'boris.html', 'Holmes', 'horror.html']))
    expect(G.stringify(ValueGroup(form.scope.url))).to.eql(G.stringify(['boris.html', 'Gomes']))
    expect(G.stringify(ValueStack(form.$last.$first.href))).to.eql(G.stringify(['boris.html']))
    expect(String(form.$last.$last.getTextContent())).to.eql('Gomes')

  })


  it ('should clone microdata scopes', function() {
    var form = new G.Node('article', {itemscope: true},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', {itemprop: 'person', itemscope: true}, 
        new G.Node('h1', {itemprop: 'name'}, 'John Johnson'),
        new G.Node('a', {itemprop: 'url', href: 'john.html'})
      )
    );
    var john = form.$last;
    expect(G.stringify(form.scope.clean())).to.eql(G.stringify({person: {name: 'John Johnson', url: 'john.html'}}))
    
    form.scope.push('person', {name: 'Ivan Ivanov', url: 'ivan.html'})
    expect(G.stringify(form.scope.clean())).to.eql(G.stringify({person: [{name: 'John Johnson', url: 'john.html'}, {name: 'Ivan Ivanov', url: 'ivan.html'}]}))
    
    var ivan = form.$last;
    expect(john).to.not.eql(ivan)
    expect(ivan.$first.getTextContent()).to.eql('Ivan Ivanov')
    expect(String(ivan.$last.href)).to.eql('ivan.html')


    form.scope.unshift('person', {url: 'anonymous.html'})
    var anon = john.$previous;
    expect(anon).to.not.eql(john)
    expect(anon.$first.getTextContent()).to.eql('')
    expect(String(anon.$last.href)).to.eql('anonymous.html')
    expect(String(anon.scope.name)).to.eql('')
    
    anon.scope.set('name', 'Anonymous')
    expect(anon.$first.getTextContent()).to.eql('Anonymous')

    var name = anon.scope.name.uncall();
    expect(anon.$first.getTextContent()).to.eql('')
    expect(String(anon.scope.name)).to.eql('')

    name.call()
    expect(anon.$first.getTextContent()).to.eql('Anonymous')
    expect(String(anon.scope.name)).to.eql('Anonymous')

    name.uncall()
    expect(anon.$first.getTextContent()).to.eql('')
    expect(String(anon.scope.name)).to.eql('')

    var merged = anon.merge('scope', {
      name: 'Vasya',
      url: 'vasya.html'
    })
    expect(String(anon.scope.name)).to.eql('Vasya')
    expect(anon.$first.getTextContent()).to.eql('Vasya')

    merged.uncall()
    expect(anon.$first.getTextContent()).to.eql('')
    expect(String(anon.scope.name)).to.eql('')

  })

  it ('should parse numeric indecies', function() {

    var form = new G.Node('form', {},
      new G.Node('label', null, 'What is your name?'),

      new G.Node('input', {name: 'tags[0]', value: 'Alfa'}),
      new G.Node('input', {name: 'tags[1]', value: 'Bravo'})
    );

    expect(G.stringify(ValueGroup(form.values.tags))).to.eql(G.stringify(['Alfa', 'Bravo']))
    
    form.prependChild(new G.Node('input', {name: 'tags[2]', value: 'Charlie'}))
    expect(G.stringify(ValueGroup(form.values.tags))).to.eql(G.stringify(['Charlie', 'Alfa', 'Bravo']))
    
    form.appendChild(new G.Node('input', {name: 'tags[3]', value: 'Delta'}))
    expect(G.stringify(ValueGroup(form.values.tags))).to.eql(G.stringify(['Charlie', 'Alfa', 'Bravo', 'Delta']))

  })

  it ('should parse numeric indecies of objects', function() {

    var form = new G.Node('form', {},
      new G.Node('label', null, 'What is your name?'),

      new G.Node('input', {name: 'person[0][name]', value: 'Alfa'}),
      new G.Node('input', {name: 'person[1][name]', value: 'Bravo'})
    );

    expect(G.stringify(ValueGroup(form.values.person))).to.eql(G.stringify([{name: 'Alfa'}, {name: 'Bravo'}]))

    form.prependChild(new G.Node('input', {name: 'person[2][name]', value: 'Charlie'}))
    expect(G.stringify(ValueGroup(form.values.person))).to.eql(G.stringify([{name: 'Charlie'}, {name: 'Alfa'}, {name: 'Bravo'}]))
    
    form.appendChild(new G.Node('input', {name: 'person[3][name]', value: 'Delta'}))
    expect(G.stringify(ValueGroup(form.values.person))).to.eql(G.stringify([{name: 'Charlie'}, {name: 'Alfa'}, {name: 'Bravo'}, {name: 'Delta'}]))

  })


  it ('should clone fieldsets in proper order', function() {
    var form = new G.Node('form', {},
      new G.Node('label', null, 'What is your name?'),

      new G.Node('input', {name: 'person[name]', value: 'John Johnson'}),
      new G.Node('input', {name: 'person[url]', value: 'john.html'})
    );

    form.values.push('person', {name: 'Ivan Ivanov', url: 'ivan.html'});

    expect(String(form.$last.$previous.value)).to.eql('Ivan Ivanov')
    expect(String(form.$last.value)).to.eql('ivan.html')
  })

  it ('should clone fieldsets in reverse order', function() {
    var form = new G.Node('form', {},
      new G.Node('label', null, 'What is your name?'),

      new G.Node('input', {name: 'person[name]', value: 'John Johnson'}),
      new G.Node('input', {name: 'person[url]', value: 'john.html'})
    );

    form.values.push('person', {url: 'ivan.html', name: 'Ivan Ivanov'});

    expect(String(form.$last.$previous.value)).to.eql('Ivan Ivanov')
    expect(String(form.$last.value)).to.eql('ivan.html')

    form.values.unshift('person', {url: 'goga.html', name: 'Goga Georgiev'});

    expect(String(form.$first.$next.value)).to.eql('Goga Georgiev')
    expect(String(form.$first.$next.$next.value)).to.eql('goga.html')
  })

  xit ('should clone numeric nested fieldsets', function() {
    var form = new G.Node('form', {},
      new G.Node('label', null, 'What is your name?'),

      new G.Node('input', {name: 'person[0][name]', value: 'John Johnson'}),
      new G.Node('input', {name: 'person[0][url]', value: 'john.html'})
    );

    var ivan = form.values.push('person', {url: 'ivan.html', name: 'Ivan Ivanov'});

    expect(String(form.$last.$previous.value)).to.eql('Ivan Ivanov')
    expect(String(form.$last.value)).to.eql('ivan.html')

    var goga = form.values.unshift('person', {url: 'goga.html', name: 'Goga Georgiev'});

    expect(String(form.$first.$next.value)).to.eql('Goga Georgiev')
    expect(String(form.$first.$next.$next.value)).to.eql('goga.html')

    ivan.set('name', 'Ioann Ioannov')
    expect(String(form.$last.$previous.value)).to.eql('Ioann Ioannov')
    expect(String(form.$last.value)).to.eql('ivan.html')

    goga.set('name', 'George Georges')
    expect(String(form.$first.$next.value)).to.eql('George Georges')
    expect(String(form.$first.$next.$next.value)).to.eql('goga.html')

    form.$first.$next.$next.set('value', 'george.html')
    expect(String(goga.url)).to.eql('george.html')


  })

  it ('should change form values', function() {
    var form = new G.Node('form',
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('input', {name: 'url[]', value: 'boris.html'}),
        new G.Node('input',  {name: 'url[]', value: 'eldar.html'})
      )
    );
    expect(String(form.$last.$first.value)).to.eql('boris.html')
    expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
    expect(String(form.$last.$last.value)).to.eql('eldar.html')
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['eldar.html']))

    var horror = form.values.overlay('url', 'horror.html', 'secret world')
    expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['eldar.html', 'horror.html']))
    expect(G.stringify(ValueStack(form.$last.$first.value))).to.eql(G.stringify(['boris.html']))
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'horror.html']))


    form.values.url.uncall()

    expect(String(form.$last.$first.value)).to.eql('boris.html')
    expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
    expect(String(form.$last.$last.value)).to.eql('eldar.html')
    expect(G.stringify(ValueGroup(form.values.url))).to.eql(G.stringify(['boris.html', 'eldar.html']))
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['eldar.html', 'horror.html']))
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html']))

    form.values.preset('url', 'zorro.html', 'xoxo')
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'eldar.html', 'horror.html']))
    expect(String(form.$last.$first.value)).to.eql('boris.html')
    expect(String(form.$last.$last.value)).to.eql('eldar.html')
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html']))

    console.error(123)
    debugger
    horror.call()
    expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'eldar.html', 'horror.html']))
    expect(String(form.$last.$first.value)).to.eql('boris.html')
    expect(G.stringify(ValueStack(form.$last.$first.value))).to.eql(G.stringify(['boris.html']))
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'horror.html']))

    form.$last.$last.set('value', 'Hello world')
    expect(String(form.values.url)).to.eql('horror.html')
    expect(String(form.$last.$last.value)).to.eql('Hello world')
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'horror.html', 'Hello world']))
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'Hello world', 'horror.html']))
    expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))

    horror.uncall()
    expect(String(form.values.url)).to.eql('Hello world')
    expect(String(form.$last.$last.value)).to.eql('Hello world')
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'Hello world']))
    expect(G.stringify(ValueStack(form.values.url))).to.eql(G.stringify(['zorro.html', 'Hello world', 'horror.html']))
    expect(G.stringify(ValueStack(form.values.url.$previous))).to.eql(G.stringify(['boris.html']))

    form.$last.$last.value.uncall()
    expect(String(form.values.url)).to.eql('eldar.html')
    expect(String(form.$last.$last.value)).to.eql('eldar.html')
    expect(G.stringify(ValueStack(form.$last.$last.value))).to.eql(G.stringify(['eldar.html', 'Hello world']))
    expect(G.stringify(ValueStack(form.$last.$first.value))).to.eql(G.stringify(['boris.html']))
    
    form.values.push('url', 'Hello')
    expect(G.stringify(ValueGroup(form.values.url))).to.eql(G.stringify(['boris.html', 'eldar.html', 'Hello']))
    expect(G.stringify(ValueGroup(form.$first).map(function(node) {
      return [node.tag, node.name, node.value];
    }))).to.eql(G.stringify([
      ['form', null,null], 
      ['div', null,null],
      ['input', 'url[]','boris.html'],
      ['input', 'url[]','eldar.html'],
      ['input', 'url[]','Hello']
    ]))

    var hi = form.values.unshift('url', 'Hi')
    expect(G.stringify(ValueGroup(form.values.url))).to.eql(G.stringify(['Hi', 'boris.html', 'eldar.html', 'Hello']))
    expect(G.stringify(ValueGroup(form.$first).map(function(node) {
      return [node.tag, node.name, node.value];
    }))).to.eql(G.stringify([
      ['form', null,null], 
      ['div', null,null],
      ['input', 'url[]','Hi'],
      ['input', 'url[]','boris.html'],
      ['input', 'url[]','eldar.html'],
      ['input', 'url[]','Hello']
    ]))
  })
  it ('should inherit microdata object from parent scope', function() {
    var form = new G.Node('article', {itemscope: true},
      new G.Node('label', null, 'What is your name?'),
      new G.Node('div', null, 
        new G.Node('a', {itemprop: 'your_name', href: 'boris.html'}),
        new G.Node('span', {}, 'Hello')
      )
    );
    var input = form.$last.$first;
    var submit = form.$last.$last;

    expect(form.scope).to.not.eql(undefined)
    expect(input.scope).to.eql(form.scope)
    expect(String(form.scope.your_name)).to.eql('boris.html')

    input.set('href', 'vasya.html')
    expect(String(form.scope.your_name)).to.eql('vasya.html')

    input.set('itemprop', 'MY_NAME')
    expect(String(form.scope.MY_NAME)).to.eql('vasya.html')
    expect(form.scope.your_name).to.eql(undefined)

    input.set('href', 'johny.html')
    expect(String(form.scope.MY_NAME)).to.eql('johny.html')
    expect(form.scope.your_name).to.eql(undefined)

    input.uncall();
    expect(form.scope.MY_NAME).to.eql(undefined)
    expect(form.scope.your_name).to.eql(undefined)

    input.set('href', 'jackie.html')
    expect(form.scope.MY_NAME).to.eql(undefined)
    expect(form.scope.your_name).to.eql(undefined)

    input.call();
    expect(String(form.scope.MY_NAME)).to.eql('jackie.html')
    expect(form.scope.your_name).to.eql(undefined)

    input.set('itemprop', 'her_name')
    expect(String(form.scope.her_name)).to.eql('jackie.html')
    expect(form.scope.her_name.$meta).to.eql([input])
    expect(form.scope.MY_NAME).to.eql(undefined)
    expect(form.scope.your_name).to.eql(undefined)

    // make submit provide microdata 
    submit.set('itemprop', 'submission_button');
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello'}))

    // use attribute instead of text content
    var value = submit.set('content', 'the_button');
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'the_button'}))

    // fall back to text content
    var value = submit.content.uncall();
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello'}))

    // add new input
    var input3 = new G.Node('meta', {itemprop: 'comment'}, 'Boo!')
    submit.$parent.appendChild(input3)
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello', comment: 'Boo!'}))
    expect(input3.$watchers.itemprop).to.not.eql(undefined)
    
    input3.itemprop.uncall()
    expect(input3.$watchers.itemprop).to.eql(undefined)
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Hello'}))

    submit.$first.set('text', 'Goodbye')

    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Goodbye'}))

    var textnode = submit.$first.uncall()
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: ''}))

    textnode.call()
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'Goodbye'}))

    submit.set('href', 'zozo.html')

    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'zozo.html'}))

    submit.$first.uncall()
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: 'zozo.html'}))

    submit.href.uncall()
    expect(G.stringify(form.scope)).to.eql(G.stringify({her_name: 'jackie.html', submission_button: ''}))
  })

  it ('should chain microdata scopes', function() {
    var form = new G.Node('article', {itemscope: true},
      new G.Node('label', {itemprop: 'header'}, 'What is your name?'),

      new G.Node('div', {itemscope: true, itemprop: 'person'}, 
        new G.Node('a', {itemprop: 'your_name', href: 'boris.html'}),
        new G.Node('span', {}, 'Hello')
      ),
      new G.Node('div', {itemscope: true, itemprop: 'person'}, 
        new G.Node('a', {itemprop: 'your_name', href: 'vasya.html'}),
        new G.Node('span', {}, 'Bye')
      )
    );
    var header = form.$first;
    var first = form.$last.$previous;
    var second = form.$last;

    expect(form.scope).to.not.eql(second.scope)
    expect(form.scope.person).to.eql(second.scope)
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')
    expect(String(form.scope.person.your_name)).to.eql('vasya.html')
    expect(String(form.scope.header)).to.eql('What is your name?')

    second.$first.set('href', 'jackie.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')
    expect(String(form.scope.person.your_name)).to.eql('jackie.html')

    second.uncall();
    expect(String(form.scope.person.your_name)).to.eql('boris.html')
    expect(form.scope.person.$previous).to.eql(undefined)
    expect(form.scope.person.$next).to.eql(undefined)

    second.call()
    expect(String(form.scope.person.your_name)).to.eql('jackie.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')

    second.$first.set('href', 'joey.html')
    expect(String(form.scope.person.your_name)).to.eql('joey.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')

    var bye = second.$last.set('itemprop', 'your_name')
    expect(String(form.scope.person.your_name)).to.eql('Bye')
    expect(String(form.scope.person.your_name.$previous)).to.eql('joey.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')

    second.$last.unset('itemprop', 'your_name')
    expect(String(form.scope.person.your_name)).to.eql('joey.html')
    expect(form.scope.person.your_name.$next).to.eql(undefined)
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')

    bye.call()
    expect(String(form.scope.person.your_name)).to.eql('Bye')
    expect(String(form.scope.person.your_name.$previous)).to.eql('joey.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')

    first.uncall()
    expect(String(form.scope.person.your_name)).to.eql('Bye')
    expect(String(form.scope.person.your_name.$previous)).to.eql('joey.html')
    expect(form.scope.person.$previous).to.eql(undefined)

    second.$parent.appendChild(first)
    expect(String(form.scope.person.your_name)).to.eql('boris.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('Bye')
    expect(String(form.scope.person.$previous.your_name.$previous)).to.eql('joey.html')
    expect(second.$next).to.eql(first)
    expect(first.$previous).to.eql(second);

    G.swap(first, second);
    expect(second.$previous).to.eql(first);
    expect(first.$next).to.eql(second);
    expect(String(form.scope.person.your_name)).to.eql('Bye')
    expect(String(form.scope.person.your_name.$previous)).to.eql('joey.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('boris.html')

    G.swap(first, second);
    expect(String(form.scope.person.your_name)).to.eql('boris.html')
    expect(String(form.scope.person.$previous.your_name)).to.eql('Bye')
    expect(String(form.scope.person.$previous.your_name.$previous)).to.eql('joey.html')
    expect(second.$next).to.eql(first)
    expect(first.$previous).to.eql(second);

    var extra = new G.Node('label', {itemprop: 'header'}, 'Extra header!');
    form.prependChild(extra)

    expect(String(form.scope.header)).to.eql('What is your name?')
    expect(String(form.scope.header.$previous)).to.eql('Extra header!')

    form.appendChild(extra)
    expect(String(form.scope.header)).to.eql('Extra header!')
    expect(String(form.scope.header.$previous)).to.eql('What is your name?')

    form.appendChild(header)
    expect(String(form.scope.header)).to.eql('What is your name?')
    expect(String(form.scope.header.$previous)).to.eql('Extra header!')

    form.removeChild(extra)
    expect(String(form.scope.header)).to.eql('What is your name?')
    expect(form.scope.header.$previous).to.eql(undefined)

    var wrapper = G.Node('footer', null, extra);

    form.appendChild(wrapper)
    expect(String(form.scope.header)).to.eql('Extra header!')
    expect(String(form.scope.header.$previous)).to.eql('What is your name?')

    G.swap(wrapper, header)
    expect(String(form.scope.header)).to.eql('What is your name?')
    expect(String(form.scope.header.$previous)).to.eql('Extra header!')
  })
})

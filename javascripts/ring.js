var CR = Em.Application.create({
  MAX_TOKEN: (new BigNumber(2)).pow(127),
  calculateBalancedTokens: function(token_count) {
    var tokens = [];
    for (var i = 0; i < token_count; i++) {
      var full_token = this.MAX_TOKEN.multiply(i).divide(token_count);
      tokens.push(full_token.intPart().toString());
    }
    return tokens;
  }
});

CR.Node = Em.Object.extend({
  token: null,
  percentage: 0,
  delete: function() {
    this.set('token', null);
  },
  prettyPercentage: function() {
    return Math.round(100 * this.get('percentage'));
  }.property('percentage')
});

CR.Ring = Em.ArrayProxy.extend({
  addBalancedNodes: function(count) {
    var tokens = CR.calculateBalancedTokens(count);
    $.each(tokens, function(i, token) {
      var node = CR.Node.create({token: token});
      this.pushObject(node);
    }.bind(this));
  },
  deleteRing: function() {
    CR.get('ringController').removeObject(this);
  },
  addToken: function() {
    var i = this.get('firstObject').get('token');
    i++;
    while (this.some(function(item) { return item.get('token') == i;})) {
      i++;
    }
    this.pushObject(CR.Node.create({token: i}));
  },
  rebalance: function() {
    var new_tokens = CR.calculateBalancedTokens(this.get('length'));
    this.forEach(function (node) {
      node.set('token', new_tokens.shift());
    });
  },
  tokenChanged: function() {
    var null_items = this.filterProperty('token', null);
    this.removeObjects(null_items);

    if (this.get('length') === 0) {
      this.deleteRing();
      return;
    }

    var tokens = this.map(function(item) {
      return [item, item.get('token') * 1];
    });
    if (tokens.length > 1) {
      tokens.sort(function(a,b) {
        return b[1] < a[1];
      });
      var max_token = CR.MAX_TOKEN.intPart() * 1;
      for (var i = 0; i < tokens.length -1; i++) {
        var token_node = tokens[i][0];
        var token = tokens[i][1];
        var next = tokens[i+1][1];
        var percent = (next - token) / max_token;
        token_node.set('percentage', percent);
      }

      var token_node = tokens[tokens.length-1][0];
      var token = tokens[tokens.length-1][1];
      var distance = max_token - token;
      distance = distance + tokens[0][1];
      var percent = distance / max_token;
      token_node.set('percentage', percent);
    }
  }.observes('@each.token')
});

CR.set('ringController', Em.ArrayProxy.create({
  content: [],
  nodeCount: 3,
  newRing: function() {
    var ring = CR.Ring.create({content: []});
    ring.addBalancedNodes(this.get('nodeCount'));
    this.pushObject(ring);
  }
}));

CR.NodeView = Em.View.extend({
  raphael_object: null,
  color: 'green',
  moveNode: function() {
    var max_token = CR.MAX_TOKEN.intPart() * 1;
    var token = this.getPath('content.token');

    var tokenf = token * 1;
    var deg = tokenf * 360 / max_token;
    var rad = Raphael.rad(deg);

    var parent = this.nearestInstanceOf(CR.RingView);
    var radius = parent.get('radius');
    var ring_x = parent.get('ring_x');
    var ring_y = parent.get('ring_y');

    var x = ring_x + radius * Math.sin(rad);
    var y = ring_y + -1 * radius * Math.cos(rad);

    var old = this.get('raphael_object');
    if (old) {
      old.remove();
    }
    this.set('raphael_object', parent.get('paper').circle(x, y, 20).attr({
      fill: this.get('color'),
      stroke: "#000",
      "stroke-width": 2,
      "stroke-opacity": 0.5,
      "opacity": 0.7
    }));
  },
  nodeTokenChanged: function() {
    this.moveNode();
  }.observes('content.token'),
  didInsertElement: function() {
    this.moveNode();
  },
  mouseDown: function(evt) {
    console.log('select node');
  }
});


CR.RingView = Em.View.extend({
  ring: null,
  paper: null,
  ring_x: 250,
  ring_y: 250,
  radius: 200,
  didInsertElement: function() {
    var width = 500;
    var height = 500;
    this.set('paper', Raphael(this.$().attr('id'), width, height));

    var radius = this.get('radius');
    var ring_x = this.get('ring_x');
    var ring_y = this.get('ring_y');

    this.get('paper').circle(ring_x, ring_y, radius).attr({fill: "#223fa3", stroke: "#000", "stroke-width": 2, "stroke-opacity": 0.5});
  }
});

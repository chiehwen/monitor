// InspectTest.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Dependencies
  var Monitor = require('../lib/index'),
      Inspect = Monitor.Inspect,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * Unit tests for the <a href="Inspect.html">Inspect</a> probe.
  * @class Inspect
  */

  /**
  * Test group for baseline Inspect probe functionality
  *
  * @method Inspect
  */
  module.exports['Inspect'] = {

    /**
    * Tests that classes are in correct
    * @method Inspect-Classes
    */
    Classes: function(test) {
      test.ok(Inspect.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(Inspect.prototype instanceof Monitor.Probe, 'It is a probe');
      test.ok(Inspect.prototype instanceof Monitor.PollingProbe, 'It is a polling probe');
      test.done();
    },

    /**
    * Tests the keys command
    * @method Inspect-Keys
    */
    /*
    Keys: function(test) {
      var monitor = new Monitor({probeClass:'Inspect'});
      monitor.connect(function() {
        var topLevelKeys = monitor.command('keys', function(error, keys) {
          test.equal(error, null, 'Keys command successfully completed');
          test.done();
        });
      });
    }
    */
  };

}(this));

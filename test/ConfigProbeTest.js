// ConfigProbeTest.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Change the configuration directory for testing
  process.env.NODE_CONFIG_DIR = __dirname + '/config';

  // Dependencies
  var Monitor = require('../lib/index'),
      CONFIG = require('config'),
      ConfigProbe = Monitor.ConfigProbe,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * Unit tests for the <a href="Config.html">Config</a> probe.
  * @class ConfigTest
  */

  /**
  * Test group for baseline Config probe functionality
  *
  * @method Config
  */
  module.exports['Config'] = {

    /**
    * Tests that classes are in correct
    * @method Config-Classes
    */
    Classes: function(test) {
      test.ok(ConfigProbe.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(ConfigProbe.prototype instanceof Monitor.Probe, 'It is a probe');
      test.done();
    },

    /**
    * Tests the initial config values
    * @method Config-InitialValues
    */
    InitialValues: function(test) {
      var configMonitor = new Monitor({probeClass:'ConfigProbe'});
      configMonitor.connect(function() {
        var json = configMonitor.toJSON();
        test.ok(json.Customers != null, 'Customers configuration is present');
        test.ok(json.Customers.dbName != null, 'dbName parameter is present');
        test.equal(json.Customers.dbName, 'from_default_json', 'dbName parameter has the correct value');
        test.ok(json.AnotherModule != null, 'Second configuration is present');
        test.ok(json.AnotherModule.parm1 != null, 'parm1 parameter is present');
        test.equal(json.AnotherModule.parm1, 'value1', 'parm1 parameter has the correct value');
        test.done();
      });
    }
  };


}(this));

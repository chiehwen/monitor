// ConfigProbeTest.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Dependencies
  var Monitor = require('../lib/index'),
      CONFIG = require('config'),
      ConfigProbe = Monitor.ConfigProbe,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * Monitor Unit Tests
  *
  * This module contains unit test classes for each of the core classes, and
  * some unit tests for baseline probes.
  *
  * @module UnitTests
  */

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
      var configMonitor = new Monitor({probeClass:'Config'});
      configMonitor.connect(function() {
        var json = configMonitor.toJSON();
        test.ok(json.Monitor != null, 'Monitor configuration is present');
        test.equal(json.Monitor.appName, 'Monitor', 'The appName parameter has the correct value');
        test.equal(json.Monitor.serviceBasePort, 42000, 'The serviceBasePort parameter has the correct value');
        test.equal(json.Monitor.portsToScan, 20, 'The portsToScan parameter has the correct value');
        test.equal(json.Monitor.allowExternalConnections, false, 'The allowExternalConnections parameter has the correct value');
        test.done();
      });
    }
  };


}(this));

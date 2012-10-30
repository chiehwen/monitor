// MonitorTest.js (c) 2012 Loren West and other contributors
// Node-monitor may be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  /**
  * Unit tests for the <a href="Monitor.html">Monitor</a> class.
  * @class MonitorTest
  */

  // Dependencies
  var Monitor = require('../lib/index'),
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      testMonitorAttrs = {
        // Monitor attributes
        id: '24-2',
        name: 'Test monitor',
        probeClass: 'NoClass',
        initParams: {a:1},
        hostName: 'some-host.com',
        appName: 'test',
        appInstance: 2
      },
      testProbeAttrs = {
        // Non-monitor attributes
        probeId: Monitor.generateUniqueId(),
        probeAttr1: 'attr1 value',
        probeAttr2: 2,
        probeAttr3: {hello: 'world'}
      },
      testAllAttrs = _.extend({}, testMonitorAttrs, testProbeAttrs),
      testMonitor = new Monitor(testAllAttrs);

  /**
  * Tests for verifying modules are loaded and exposed properly
  *
  * @method ModuleLoad
  */
  module.exports.ModuleLoad = {

    setUp: function(callback) {callback();},
    tearDown: function(callback) {callback();},

    /**
    * Tests that externals dependencies are exposed
    * @method ModuleLoad-Externals
    */
    Externals: function(test) {
      test.notEqual(Monitor.Config, 'undefined', 'Config package is exported');
      test.notEqual(Monitor.Cron, 'undefined', 'Cron package is exported');
      test.notEqual(Monitor._, 'undefined', 'Underscore package is exported');
      test.notEqual(Monitor.Backbone, 'undefined', 'Backbone package is exported');
      test.done();
    },

    /**
    * Tests that Monitor is exposed and of the correct type
    * @method ModuleLoad-Monitor
    */
    Monitor: function(test) {
      test.ok(Monitor.prototype instanceof Backbone.Model, 'The Monitor data model is in place');
      test.ok(Monitor.List.prototype instanceof Backbone.Collection, 'The Monitor collection is in place');
      test.done();
    },

    /**
    * Tests that all Sub Modules are exposed and of the correct type
    * @method ModuleLoad-Submodules
    */
    Submodules: function(test) {
      test.ok(Monitor.Probe.prototype instanceof Backbone.Model, 'The Probe submodule is in place');
      test.ok(Monitor.Connection.prototype instanceof Backbone.Model, 'The Connection submodule is in place');
      test.ok(Monitor.Server.prototype instanceof Backbone.Model, 'The Server submodule is in place');
      test.ok(Monitor.Router.prototype instanceof Backbone.Model, 'The Router submodule is in place');
      test.done();
    }

  };

  /**
  * Tests for internal (protected) methods
  * @method Protected
  */
  module.exports['Protected'] = {

    /**
    * Test UUID generation
    * @method Protected-UUID
    */
    UUID: function(test) {
      // Generate a bunch and make sure they're unique
      var numToTest = 100, uuids = {};
      for (var i = 0; i < numToTest; i++) {
        var uuid = Monitor.generateUniqueId();
        test.ok(uuid, "A uuid was generated");
        test.ok(uuid.length === 36, "It has the correct V.4 length");
        test.ok(!uuids[uuid], "It is unique within the test UUIDs");
        uuids[uuid] = '';
      }
      test.done();
    },

    /**
    * Tests that the Router is available
    * @method Protected-Router
    */
    Router: function(test) {
      test.ok(Monitor.getRouter() instanceof Monitor.Router, "The default router is available");
      test.done();
    }

  };

  /**
  * ## Tests for the toJSON methods
  * @method JSON
  */
  module.exports['JSON'] = {

    /**
    * Tests that toJSON produces both monitor an probe attributes
    *
    * @method JSON-toJSON
    */
    toJSON: function(test) {
      var json = testMonitor.toJSON();
      test.deepEqual(json, testAllAttrs, 'toJSON produces the correct values');
      test.done();
    },

    /**
    * Test that toMonitorJSON produces only monitor attributes
    *
    * @method JSON-toMonitorJSON
    */
    toMonitorJSON: function(test) {
      var json = testMonitor.toMonitorJSON();
      test.deepEqual(json, testMonitorAttrs, 'toMonitorJSON produces the correct values');
      test.done();
    },

    /**
    * Test that toProbeJSON produces only monitor attributes
    *
    * @method JSON-toProbeJSON
    */
    toProbeJSON: function(test) {
      var json = testMonitor.toProbeJSON();

      // The probeId is moved into ID
      var testAttrs = _.clone(testProbeAttrs);
      testAttrs.id = testMonitor.get('probeId');
      test.deepEqual(json, testAttrs, 'toProbeJSON produces the correct values');
      test.done();
    }

  };

  /**
  * ## Tests for connecting and disconnecting with probes
  * @method Connection
  */
  module.exports['Connection'] = {

    /**
    * Test connecting with internal probes
    * @method Connection-Internal
    */
    Internal: function(test) {
      test.expect(6);  // Make sure both callbacks and events are fired
      var processMonitor = new Monitor({probeClass:'Process'});
      processMonitor.connect(function(error) {
        test.equal(error, null, 'No errors on connect');
        var probeId = processMonitor.get('probeId');
        test.ok(probeId, "The probeId is set");
        test.ok(probeId && probeId.length === 36, "The probeId is a uuid");
      });
      processMonitor.on('connect', function() {

        // Don't disconnect right away.  This allows the connect
        // event to be run before emitting change events.
        process.nextTick(function(){
          processMonitor.disconnect(function(error){
            test.equal(error, null, 'No errors on disconnect');
          });
        });
      });
      processMonitor.on('disconnect', function(reason) {
        test.equal(reason, 'manual_disconnect', 'The reason for disconnect is "manually disconnected"');
        test.ok(!processMonitor.get('probeId'), 'The probe is no longer attached to the monitor');
        test.done();
      });
    }

  };

}(this));

/*
jsunit test functions:

expect(amount) - Specify how many assertions are expected to run within a test. Very useful for ensuring that all your callbacks and assertions are run.
done() - Finish the current test function, and move on to the next. ALL tests should call this!

ok(value, [message]) - Tests if value is a true value.
equal(actual, expected, [message]) - Tests shallow, coercive equality with the equal comparison operator ( == ).
notEqual(actual, expected, [message]) - Tests shallow, coercive non-equality with the not equal comparison operator ( != ).
deepEqual(actual, expected, [message]) - Tests for deep equality.
notDeepEqual(actual, expected, [message]) - Tests for any deep inequality.
strictEqual(actual, expected, [message]) - Tests strict equality, as determined by the strict equality operator ( === )
notStrictEqual(actual, expected, [message]) - Tests strict non-equality, as determined by the strict not equal operator ( !== )
throws(block, [error], [message]) - Expects block to throw an error.
doesNotThrow(block, [error], [message]) - Expects block not to throw an error.
ifError(value) - Tests if value is not a false value, throws if it is a true value. Useful when testing the first argument, error in callbacks.

*/

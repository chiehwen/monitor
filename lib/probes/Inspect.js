// Inspect.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      PollingProbe = Monitor.PollingProbe;

  /**
  * Inspect and manipulate variables on the monitored server.
  *
  * This class monitors the variable specified by the key.
  *
  * The key is evaluated to determine the variable to monitor, so it may
  * be a complex key starting at global scope.  If the key isn't
  * specified, it monitors all variables in the global scope.
  *
  * If the key points to an object of type Backbone.Model, this probe
  * will update the value in real time, triggered on the *change* event.
  * Otherwise it will update the value as it notices changes, while polling
  * on the specified polling interval (default: 1 second).
  *
  * @class Inspect
  * @extends PollingProbe
  * @constructor
  * @param [initParams] - Initialization parameters
  *     @param [initParams.key=null] {String} A global variable name or expression
  *     @param [initParams.depth=6] {Integer} If the key points to an object, this
  *       is the depth to traverse the object for changes.
  *     @param [initParams.pollInterval] {Integer} (from <a href="PollingProbe.html">PollingProbe</a>) Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} (from <a href="PollingProbe.html">PollingProbe</a>) Crontab syle polling pattern. Default once per second: "* * * * * *"
  * @param model - Monitor data model elements
  *     @param model.value - The value of the element being inspected
  */
  var Inspect = Monitor.Inspect = PollingProbe.extend({

    // These are required for Probes
    probeClass: 'Inspect',

    initialize: function(params){
      var t = this;
      PollingProbe.prototype.initialize.apply(t, arguments);
    },
    release: function() {
      var t = this;
      PollingProbe.prototype.release.apply(t, arguments);
    },

    /**
    * Poll the probe for changes
    *
    * This method is called by the parent <a href="PollingProbe.html">PollingProbe</a> on the interval specified by the client <a href="Monitor.html">Monitor</a>.
    *
    * It polls for changes in the variable.
    *
    * @method poll
    */
    poll: function() {
      var t = this;
      // t.set(attrs);
    }
  });

}(this));

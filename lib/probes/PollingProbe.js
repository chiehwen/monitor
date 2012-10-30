// PollingProbe.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('../Monitor'), Probe = Monitor.Probe,
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone;

  /**
  * <h2>Standard probes included in the node monitor package</h2>
  *
  * <p>
  * The probes in this module offer baseline monitoring functionality, and
  * provide examples for building custom probes.
  * </p>
  *
  * @module Probes
  */

  /**
  * ## Base class for probes that require polling to detect and set model changes.
  *
  * The probe wakes up every polling interval and executes the poll() method
  * in the derived class.
  *
  * PollingProbes are instantiated with either a polling interval (in milliseconds)
  * or a cron pattern.  If the polling interval is set, that's what will be used.
  *
  * @class PollingProbe
  * @extends Probe
  * @param model.pollInterval {Integer} Polling interval in milliseconds. DEFAULT: null
  * @param model.cronPattern {String} Crontab syle polling pattern. DEFAULT: once per second "* * * * * *"<br>
  *   The format is: <i>[second] [minute] [hour] [day of month] [month] [day of week]</i>.<br>
  *   <a href="http://help.sap.com/saphelp_xmii120/helpdata/en/44/89a17188cc6fb5e10000000a155369/content.htm">
  *     More about cron formats
  *   </a>
  */
  var PollingProbe = Monitor.PollingProbe = Probe.extend({
    defaults: _.extend({}, Probe.prototype.defaults, {
      pollInterval: null,
      cronPattern: '* * * * * *'
    }),
    initialize: function(){
      var t = this, pollInterval = t.get('pollInterval'), poll = function(){t.poll();};
      Probe.prototype.initialize.apply(t, arguments);

      // Poll once, then set up the interval
      t.poll();
      if (pollInterval) {
        t.timer = setInterval(poll, pollInterval);
      } else {
        t.cronJob = new Cron.CronJob(t.get('cronPattern'), poll);
      }
    },
    release: function(){
      var t = this, timer = (t.cronJob ? t.cronJob.timer : t.timer);
      if (t.cronJob && !t.cronJob.initiated) {
        // If cron isn't initiated we've been asked to shut down within the
        // first second, and the timer hasn't been set (but will be soon).
        setTimeout(function(){clearInterval(t.cronJob.timer);}, 1000);
      } else {
        clearInterval(timer);
      }
      t.timer = t.cron = null;
      Probe.prototype.release.apply(t, arguments);
    }

  });

}(this));

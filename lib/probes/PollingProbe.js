// PollingProbe.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('../Monitor'), Probe = Monitor.Probe,
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone;

  /**
  * ## Base class for probes that require polling to detect and set model changes.
  *
  * The probe wakes up every polling interval and executes the poll() method
  * in the derived class.
  *
  * PollingProbes are instantiated with either a polling interval (in milliseconds)
  * or a cron pattern.  If the polling interval is set, that's what will be used.
  *
  * More about cron formats, with examples
  * <ul>
  *   <li><a href="http://crontab.org/">http://crontab.org/</a></li>
  *   <li><a href="http://en.wikipedia.org/wiki/Cron">http://en.wikipedia.org/wiki/Cron</a></li></li>
  *   <li><a href="http://www.adminschoice.com/crontab-quick-reference">http://www.adminschoice.com/crontab-quick-reference</a></li></li>
  * </ul>
  *
  * @class PollingProbe
  * @extends Probe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pollInterval] {Integer} Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} Crontab syle polling pattern. Default once per second: "* * * * * *"
  *
  *   The format is: <i>[second] [minute] [hour] [day of month] [month] [day of week]</i>.<br>
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

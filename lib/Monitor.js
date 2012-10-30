// Monitor.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Module loading
  var commonJS = (typeof exports !== 'undefined'),
      Backbone = commonJS ? require('backbone') : root.Backbone,
      _ = commonJS ? require('underscore')._ : root._,
      Cron = commonJS ? require('cron') : null;

  /**
  * Monitor a remote probe
  *
  * Monitor objects are the local interface to a remote <a href="Probe.html">Probe</a>.
  * The probe may be running in this process or on a remote server.
  *
  * In a disconnected state, the monitor object contains information about
  * the type, attributes, and location of the probe it will monitor.
  *
  * In a connected state, the monitor object contains the data attributes of
  * the probe it is monitoring, and emits change events as the probe changes
  * state.
  *
  * Many monitors may be attached to a single probe.  When the probe data model
  * changes, changes are broadcast to the connected monitors.
  *
  * Probes can be remotely controlled using the control() method.
  * The control() method acts an RPC in that it accepts input arguments and
  * returns results to the monitor initiating the request.
  *
  * Example:
  *
  *     // Connecting a monitor to a probe
  *     var processMonitor = new Monitor({
  *       probeClass: 'Process'
  *     });
  *     processMonitor.connect();
  *
  *     // Monitoring the probe
  *     processMonitor.on('change', function(){
  *       console.log('Changes:', processMonitor.getChangedAttributes());
  *     });
  *
  *     // Remote control
  *     processMonitor.control('ping', function(error, response) {
  *       console.log('Ping response: ', response);
  *     });
  *
  * Monitoring a probe on a remote server requires the ```hostName``` parameter
  * to be set.
  *
  *     // Connecting to a remote monitor
  *     var processMonitor = new Monitor({
  *       probeClass: 'Process',
  *       hostName: 'remote-server1'
  *     });
  *     processMonitor.connect();
  *
  * Additional parameters can be set to identify a specific server if many
  * servers are running on the specified ```hostName```.
  *
  * @class Monitor
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.id] {String} The monitor object id.
  *     @param [model.name] {String} Display name or title.
  *     @param model.probeClass {String} Class name of the probe this is (or will be) monitoring.
  *     @param [model.initParams] {Object} Initialization parameters passed to the probe during instantiation.
  *     @param [model.hostName] {String} Hostname the probe is (or will) run on.
  *       If not set, the Router will connect with the first host capable of running this probe.
  *     @param [model.appName] {String} Application name the probe is (or will) run within.
  *       If not set, the Router will disregard the appName of the process it is connecting with.
  *     @param [model.appInstance=0] {Integer} Index into the list of hostName/appName matches.
  *       If not set, the Router will connect to the first hostName/appName combination.
  *       This can be useful for connecting with a specific instance of a multi-process application.
  *     @param model.probeId {String} ID of the probe this is monitoring (once connected). READONLY
  *     @param model.PROBE_PARAMS... {(defined by the probe)} ... all other <strong>```model```</strong> parameters are READONLY parameters of the connected probe
  */
  /**
  * Receive real time notifications from the probe
  *
  * When the probe data model changes, all changed attributes are forwarded
  * to monitors, triggering this event.
  *
  * All probe attributes are available in the monitor, and the
  * getChangedAttributes() method returns the list of attributes changed
  * since the last change event.
  *
  *     myMonitor.on('change', function(){
  *       console.log('Changes:', myMonitor.getChangedAttributes());
  *     });
  *
  * @event change
  */
  var Monitor = Backbone.Model.extend({

    defaults: {
      id:  '',
      name: '',
      probeClass: '',
      initParams: {},
      hostName: '',
      appName: '',
      appInstance: 0
    },
    initialize: function(params, options) {},

    /**
    * Connect the monitor to the remote probe
    *
    * Upon connection, the monitor data model is a proxy of the current state
    * of the probe.
    *
    * @method connect
    * @param callback {Function(error)} Called when the probe is connected (or error)
    */
    /**
    * The monitor has successfully connected with the probe
    * @event connect
    */
    connect: function(callback) {
      var t = this;
      Monitor.getRouter().connectMonitor(t, function(error) {
        // Issue the specified callback before emitting the connect event
        if (!error) {t.trigger('connect');}
        if (callback) {callback(error);}
      });
    },

    /**
    * Get the connection to the remote probe
    *
    * This method returns the Connection object that represents the remote
    * server used for communicating with the connected probe.
    *
    * If the probe is running internally or the monitor isn't currently
    * connected, this will return null.
    *
    * @method getConnection
    * @return connection {Connection} The connection object
    */
    getConnection: function() {
      var t = this;
      return (t.probe && t.probe.connection ? t.probe.connection : null);
    },

    /**
    * Is the monitor currently connected?
    *
    * @method isConnected
    * @return {boolean} True if the monitor is currently connected
    */
    isConnected: function() {
      var t = this;
      return (t.probe != null);
    },

    /**
    * Disconnect from the remote probe
    *
    * This should be called when the monitor is no longer needed.
    * It releases resources associated with monitoring the probe.
    *
    * If this was the last object monitoring the probe, the probe will be
    * stopped, releasing resources associated with running the probe.
    *
    * @method disconnect
    * @param callback {Function(error)} Called when disconnected (or error)
    */
    /**
    * The monitor has disconnected from the probe
    * @event disconnect
    * @param reason {String} Reason specified for the disconnect
    * <ul>Known Reasons:
    *   <li>manual_disconnect - A manual call to disconnect() was made.</li>
    *   <li>connect_failed - Underlying transport connection problem.</li>
    *   <li>remote_disconnect - Underlying transport disconnected.</li>
    * </ul>
    */
    disconnect: function(callback) {
      var t = this, reason = 'manual_disconnect';
      Monitor.getRouter().disconnectMonitor(t, reason, function(error, reason) {
        if (callback) {callback(error);}
        if (!error) {t.trigger('disconnect', reason);}
      });
    },

    /**
    * Send a control message to the probe.
    *
    * Monitors can use this method to send a message and receive a response
    * from a connected probe.
    *
    * The probe must implement the specified control method.  All probes are
    * derived from the base <a href="Probe.html">Probe</a> class, which offers
    * a ping control.
    *
    * To send a ping message to a probe and log the results:
    *
    *     var myMonitor.control('ping', console.log);
    *
    * @method control
    * @param name {String} Name of the control message.
    * @param [params] {Object} Named input parameters specific to the control message.
    * @param [callback] {Function(error, response)} Function to call upon return.
    * <ul>
    *   <li>error (Any) - An object describing an error (null if no errors)</li>
    *   <li>response (Any) - Response parameters specific to the control message.</li>
    * </ul>
    */
    control: function(name, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = null;
      }
      callback = callback || function(){};
      var t = this, probe = t.probe;
      if (!probe) {return callback('Probe not connected');}
      if (probe && probe.connection) {
        probe.connection.emit('probe:control', {probeId: t.get('probeId'), name: name, params:params}, callback);
      } else {
        probe.onControl(name, params, callback);
      }
    },

    /**
    * Produce an object without monitor attributes
    *
    * A Monitor object contains a union of the connection attributes required for
    * a Monitor, and the additional attributes defined by the probe it's monitoring.
    *
    * This method produces an object containing only the probe portion of
    * those attributes.
    *
    * The id attribute of the returned JSON is set to the probeId from
    * the monitor.
    *
    * @method toProbeJSON
    * @param [options] {Object} Options to pass onto the model toJSON
    * @return {Object} The probe attributes
    */
    toProbeJSON: function(options) {
      var t = this,
          json = {id: t.get('probeId')};

      // Transfer all non-monitor attrs
      _.each(t.toJSON(options), function(value, key) {
        if (!(key in t.defaults)) {
          json[key] = value;
        }
      });
      return json;
    },

    /**
    * Produce an object with the monitor only attributes.
    *
    * A Monitor object contains a union of the connection attributes required for
    * a Monitor, and the additional attributes defined by the probe it's monitoring.
    *
    * This method produces an object containing only the monitor portion of
    * those attributes.
    *
    * @method toMonitorJSON
    * @param [options] {Object} Options to pass onto the model toJSON
    * @return {Object} The monitor attributes
    */
    toMonitorJSON: function(options) {
      var t = this,
          json = {};

      // Transfer all monitor attrs
      _.each(t.toJSON(options), function(value, key) {
        if (key in t.defaults) {
          json[key] = value;
        }
      });
      return json;
    }

  });

  /////////////////////////
  // Static helper methods
  /////////////////////////

  /**
  * Generate a unique UUID-v4 style string
  *
  * This is a cross-platform UUID implementation used to uniquely identify
  * model instances.  It is a random number based UUID, and as such can't be
  * guaranteed unique.
  *
  * @static
  * @protected
  * @method generateUniqueId
  * @return {String} A globally unique ID
  */
  Monitor.generateUniqueId = function() {
    // Generate a 4 digit random hex string
    function rhs4() {return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);}
    return (rhs4()+rhs4()+"-"+rhs4()+"-"+rhs4()+"-"+rhs4()+"-"+rhs4()+rhs4()+rhs4());
  };

  /**
  * Get the default router (an application singleton)
  *
  * This instantiates a Router on first call.
  *
  * @static
  * @protected
  * @method getRouter
  * @return {Router} The default router.
  */
  Monitor.getRouter = function() {

    // Instantiate a router if no default
    if (!Monitor.defaultRouter) {
      Monitor.defaultRouter = new Monitor.Router();

      // If there's a global socket.io server available,
      // then we're running on the browser.  Set the default
      // gateway to the global io socket.
      if (root.io) {
        Monitor.defaultRouter.setGateway({
          socket:root.io.connect()
        });
      }
    }

    // Return the router
    return Monitor.defaultRouter;
  };

  /**
  * Constructor for a list of Monitor objects
  *
  *     var myList = new Monitor.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Monitor data model objects.
  * @return {Backbone.Collection} Collection of Monitor data model objects
  */
  Monitor.List = Backbone.Collection.extend({model: Monitor});

  /**
  * Static Configurations
  *
  * These can be set onto the Monitor class after it's loaded.  Setting the
  * _appName_ isn't required, but is a good idea as it helps identify the
  * process to remote monitors.
  *
  * Example:
  *
  *     Monitor.Config.appName = 'OrderEntry';
  *
  * @static
  * @property Config
  * @type &lt;Object&gt;
  * <ul>
  *   <li><code>appName (String)</code> Application name used to help identify this process. DEFAULT: 'unknown'</li>
  *   <li><code>serviceBasePort (Integer)</code> Base port to use for listening on and finding remote connections. Default: 42000</li>
  *   <li><code>portsToScan (Integer)</code> Maximum number of ports to scan for on a particular server. Default: 20</li>
  * </ul>
  */
  var defaultConfig = {
    appName: 'unknown',
    serviceBasePort: 42000,
    portsToScan: 20
  };

  // Expose default configurations to the config package
  Monitor.Config = _.extend({}, defaultConfig);

  // Expose external dependencies
  Monitor._ = _;
  Monitor.Backbone = Backbone;
  Monitor.Cron = Cron;
  Monitor.commonJS = commonJS;

  // Export for both commonJS and the browser
  if (commonJS) {
    module.exports = Monitor;
  } else {
    root.Monitor = Monitor;
  }

}(this));

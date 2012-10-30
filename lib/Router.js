// Router.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone,
      Config = Monitor.Config, Probe = Monitor.Probe,
      Connection = Monitor.Connection, Server = Monitor.Server,
      SocketIO = root.io || require('socket.io'),

      // Set if server-side
      hostName = Monitor.commonJS ? require('os').hostname() : null;

  /**
  * Probe location and message routing
  *
  * The router is a class used internally to locate probes and connect
  * events so messages are correctly routed between probes and their monitors.
  *
  * It is a *singleton* class, designed to run one instance within
  * a monitor process, and accessed via the (protected) `getRouter()`
  * method of the <a href="Monitor.html">Monitor</a> object.
  *
  * It manages all outbound requests to probes, either internally or externally
  * via the <a href="Connection.html">Connection</a> to the remote process.
  *
  * @class Router
  * @extends Backbone.Model
  * @constructor
  */
  /**
  * A new connection has been established
  *
  * @event
  * connection:add
  * @param connection {Connection} The added connection
  */
  /**
  * A connection has been terminated
  *
  * @event
  * connection:remove
  * @param connection {Connection} The removed connection
  */
  var Router = Monitor.Router = Backbone.Model.extend({

    initialize: function() {
      var t = this;
      t.defaultGateway = null;
      t.firewall = false;
      t.connections = new Connection.List();
      t.runningProbesByKey = {}; // key=probeKey, data=probeImpl
      t.runningProbesById = {};  // key=probeId, data=probeImpl
    },

    /**
    * Firewall new connections from inbound probe requests
    *
    * When two monitor processes connect, they become peers.  By default each
    * process can request probe connections with the other.
    *
    * If you want to connect with a remote probe, but don't want those servers
    * to connect with probes in this process, call this method to firewall
    * those inbound probe requests.
    *
    * Setting this will change the firewall value for all *new* connections.
    * Any existing connections will still accept incoming probe requests.
    *
    * @static
    * @method setFirewall
    * @param firewall {Boolean} - Firewall new connections?
    */
    setFirewall: function(firewall) {
      var t = Monitor.getRouter(); // This is a static method
      t.firewall = firewall;
    },

    /**
    * Set the default gateway server
    *
    * The gateway server is used if a monitor cannot connect directly with the
    * server hosting the probe.
    *
    * When a monitor is requested to connect with a probe on a specific server,
    * a direct connection is attempted.  If that direct connection fails, usually
    * due to a firewall or browser restriction, the monitor will attempt the
    * connection to the probe through the gateway server.
    *
    * The server specified in this method must have been started as a gateway
    * like this:
    *
    *     // Start a monitor server and act as a gateway
    *     var server = new Monitor.Server({gateway:true});
    *
    * @method setGateway
    * @param options {Object} - Connection parameters
    *   @param options.hostName {String} - Name of the gateway host
    *   @param options.hostPort {Integer} - Port number to connect with
    *   @param options.url {String} - The URL used to connect (created, or used if supplied)
    *   @param options.socket {io.socket} - Pre-connected socket.io socket to the gateway server.
    * @return connection {Connection} - The connection with the gateway server
    */
    setGateway: function(options) {
      var t = this;
      options.gateway = false;     // New connection can't be an inbound gateway
      options.firewall = true;     // Gateways are for outbound requests only
      return t.defaultGateway = t.addConnection(options);
    },

    /**
    * Return a stable host name.
    *
    * @method getHostName
    * @protected
    * @return hostName {String} - The platform's host name, or an otherwise stable ID
    */
    getHostName: function() {
      var localStorage = root.localStorage;
      if (!hostName) {
        if (localStorage) {hostName = localStorage.hostName;}
        hostName = hostName || Monitor.generateUniqueId();
        if (localStorage) {localStorage.hostName = hostName;}
      }
      return hostName;
    },

    /**
    * Set the current host name.
    *
    * This sets the host name that this router publishes to new connections.
    * It's only useful if the os hostname isn't the name you want to publish.
    *
    * @protected
    * @method setHostName
    * @param hostName {String} - The host name to publish to new connections
    */
    setHostName: function(name) {
      hostName = name;
    },

    /**
    * Add a connection to a remote Monitor process
    *
    * @method addConnection
    * @protected
    * @param options {Object} - Connection parameters
    *   @param options.hostName {String} - Name of the host to connect with
    *   @param options.hostPort {Integer} - Port number to connect with
    *   @param options.url {String} - The URL used to connect (created, or used if supplied)
    *   @param options.socket {io.socket} - Pre-connected socket.io socket to a Monitor server.
    *   @param options.gateway {Boolean} - Allow this connection to use me as a gateway (default false)
    *   @param options.firewall {Boolean} Firewall inbound probe requests on this connection?
    * @return connection {Connection} - The added connection
    */
    addConnection: function(options) {
      var t = this;

      // Default the firewall value
      if (_.isUndefined(options.firewall)) {
        options = _.extend({}, options, {firewall: t.firewall});
      }

      // Add the connection once connected
      var connection = new Connection(options);
      connection.on('connect', function() {
        t.connections.add(connection);
        t.trigger('connection:add', connection);
      });
      return connection;
    },

    /**
    * Remove a connection from the router.
    *
    * This is called to remove the connection and associated routes from the router.
    *
    * @method removeConnection
    * @protected
    * @param connection {Connection} - The connection to remove
    */
    removeConnection: function(connection) {
      var t = this;
      connection.disconnect('connection_removed');
      t.connections.remove(connection);
      t.trigger('connection:remove', connection);
    },

    /**
    * Connect a Monitor object to a remote Probe
    *
    * This accepts an instance of a Monitor and figures out how to connect it
    * to a running Probe.
    *
    * Upon callback the probe data is set into the monitor (unless an error
    * occurred)
    *
    * @method connectMonitor
    * @protected
    * @param monitor {Monitor} - The monitor requesting to connect with the probe
    * @param callback {Function(error)} - (optional) Called when connected
    */
    connectMonitor: function(monitor, callback) {
      callback = callback || function(){};
      var t = this, monitorJSON = monitor.toJSON(), probeJSON = null,
          probeClass = monitorJSON.probeClass;

      // Class name must be set
      if (!probeClass) {return callback('probeClass must be set');}

      // Determine the connection (or internal), and listen for change events
      t.determineConnection(monitorJSON, true, function(err, connection) {
        if (err) {return callback(err);}

        // Function to run on connection (internal or external)
        var onConnect = function(error, probe) {
          if (error) {return callback(error);}
          probeJSON = probe.toJSON();
          probeJSON.probeId = probeJSON.id; delete probeJSON.id;
          monitor.probe = probe;

          // Perform the initial set silently.  This assures the initial
          // probe contents are available on the connect event,
          // but doesn't fire a change event before connect.
          monitor.set(probeJSON, {silent:true});
          monitor.probeChange = function(){
            monitor.set(probe.changedAttributes());
          };
          probe.on('change', monitor.probeChange);
          callback(null);
        };

        // Connect internally or externally
        if (connection) {
          t.connectExternal(monitorJSON, connection, onConnect);
        } else {
          t.connectInternal(monitorJSON, onConnect);
        }
      });
    },

    /**
    * Disconnect a monitor
    *
    * This accepts an instance of a connected monitor, and disconnects it from
    * the remote probe.
    *
    * The probe implementation will be released if this is the only monitor
    * object watching it.
    *
    * @method disconnectMonitor
    * @protected
    * @param monitor {Monitor} - The connected monitor
    * @param reason {String} - Reason for the disconnect
    * @param callback {Function(error)} - (optional) Called when connected
    */
    disconnectMonitor: function(monitor, reason, callback) {
      callback = callback || function(){};
      var t = this, probe = monitor.probe, probeId = monitor.get('probeId');

      // The monitor must be connected
      if (!probe) {return callback('Monitor must be connected');}

      // Called upon disconnect (internal or external)
      var onDisconnect = function(error) {
        if (error) {return callback(error);}
          probe.off('change', monitor.probeChange);
          monitor.probe = monitor.probeChange = null;
          monitor.set({probeId:null});
          return callback(null, reason);
      };

      // Disconnect from an internal or external probe
      if (probe.connection) {
        t.disconnectExternal(probe.connection, probeId, onDisconnect);
      } else {
        t.disconnectInternal(probeId, onDisconnect);
      }
    },

    /**
    * Build a probe key from the probe data
    *
    * @method buildProbeKey
    * @protected
    * @param probeJSON {Object} - An object containing:
    *     @param probeJSON.probeClass {String} - The probe class name (required)
    *     @param probeJSON.initParams {Object} - Probe initialization parameters (if any)
    * @return probeKey {String} - A string identifying the probe
    */
    buildProbeKey: function(probeJSON) {
      var probeKey = probeJSON.probeClass, initParams = probeJSON.initParams;
      if (initParams) {
        _.keys(initParams).sort().forEach(function(key){
          probeKey += ':' + key + '=' + initParams[key];
        });
      }
      return probeKey;
    },

    /**
    * Determine the connection to use for a probe
    *
    * This uses the connection parameters of the specified monitor to determine
    * (or create) the connection to use for the probe.
    *
    * If the probe can be instantiated internally, a null is returned as the
    * connection.
    *
    * This attempts to use an existing connection if available.  If not, a
    * connection attempt will be made with the host. If the host cannot be
    * reached directly, it returns a connection with the gateway.
    *
    * @method determineConnection
    * @protected
    * @param monitorJSON {Object} - The connection attributes of the monitor
    * @param makeNewConnections {Boolean} - Establish a new connection if one doesn't exist?
    * @param callback {Function(error, connection)} - Called when the connection is known
    * <ul>
    *   <li>error - Set if any errors</li>
    *   <li>connection - The connection object, or null to run in this process</li>
    * <ul>
    */
    determineConnection: function(monitorJSON, makeNewConnections, callback) {
      var t = this, connection = null, probeClass = monitorJSON.probeClass,
          hostName = monitorJSON.hostName, appName = monitorJSON.appName,
          appInstance = monitorJSON.appInstance,
          thisHostName = t.getHostName().toLowerCase(), thisAppName = Config.appName;

      // Connect with this process (internally)?
      hostName = hostName ? hostName.toLowerCase() : null;
      if ((!hostName || hostName === thisHostName) && (!appName || appName === thisAppName)) {

        // Connect internally if the probe is available (no returned connection),
        // otherwise return the default gateway
        return callback(null, (Probe.classes[probeClass] ? null : t.defaultGateway));
      }

      // Return if connection is known
      connection = t.findConnection(hostName, appName, appInstance);
      if (connection) {return callback(null, connection);}

      // See if we can establish new connections with the host
      if (hostName && makeNewConnections) {
        t.addHostConnections(hostName, function(err) {
          connection = t.findConnection(hostName, appName, appInstance);

          // Cant establish a direct connection.  Use gateway if available.
          if (!connection) {
            if (!t.defaultGateway) {
              err = err || 'No route to host: ' + hostName;
            } else {
              connection = t.defaultGateway;
            }
          }
          return callback(err, connection);
        });
        return;
      }

      return callback('No host specified for app: ' + appName,null);
    },

    /**
    * Find an existing connection to use
    *
    * This method looks into the existing known connections to find one
    * that matches the specified parameters.
    *
    * Firewalled connections are not returned.
    *
    * @method findConnection
    * @protected
    * @param hostName {String} - Host name to find a connection for (null = any host)
    * @param appName {String} - App name to find a connection with (null = any app)
    * @param appInstance {Integer} - Index into the list of hostName/appName matches (default: 0)
    * @return connection {Connection} - A Connection object if found, otherwise null
    */
    findConnection: function(hostName, appName, appInstance) {
      var t = this, thisInstance = 0;
      return t.connections.find(function(conn) {

        // Host or app matches if not specified or if specified and equal
        var matchesHost = !hostName || conn.isThisHost(hostName);
        var matchesApp = !appName || appName === conn.get('remoteAppName');
        var remoteFirewall = conn.get('remoteFirewall');

        // This is a match if host + app + instance matches, and it's not firewalled
        if (!remoteFirewall && matchesHost && matchesApp) {
          return (thisInstance++ === appInstance);
        }

        // No match
        return false;
      });
    },

    /**
    * Find all connections matching the selection criteria
    *
    * This method looks into the existing known connections to find all
    * that match the specified parameters.
    *
    * Firewalled connections are not returned.
    *
    * @method findConnections
    * @protected
    * @param hostName {String} - Host name to search for (null = any host)
    * @param appName {String} - App name to search for (null = any app)
    * @return connections {Array of Connection} - An array of Connection objects matching the criteria
    */
    findConnections: function(hostName, appName) {
      var t = this;
      return t.connections.filter(function(conn) {

        // Host or app matches if not specified or if specified and equal
        var matchesHost = !hostName || conn.isThisHost(hostName);
        var matchesApp = !appName || appName === conn.get('remoteAppName');
        var remoteFirewall = conn.get('remoteFirewall');

        // This is a match if host + app matches, and it's not firewalled
        return (!remoteFirewall && matchesHost && matchesApp);
      });
    },

    /**
    * Add connections for the specified host
    *
    * This performs a scan of monitor ports on the server, and adds connections
    * for newly discovered servers.
    *
    * @method addHostConnections
    * @protected
    * @param hostName {String} - The host to add connections with
    * @param callback {Function(error)} - Called when complete
    */
    addHostConnections: function(hostName, callback) {
      var t = this, connectedPorts = [], portStart = Config.serviceBasePort,
          portEnd = Config.serviceBasePort + Config.portsToScan - 1;

      // Build the list of ports already connected
      t.connections.each(function(connection){
        var host = connection.get('hostName').toLowerCase();
        var port = connection.get('hostPort');
        if (host === hostName && port >= portStart && port <= portEnd) {connectedPorts.push(port);}
      });

      // Scan non-connected ports
      var portsToScan = Config.portsToScan - connectedPorts.length;
      var callbackWhenDone = function() {
        var conn = this; // called in the context of the connection
        conn.off('connect disconnect error', callbackWhenDone);
        if (--portsToScan === 0) {callback();}
      };
      for (var i = portStart; i <= portEnd; i++) {
        if (connectedPorts.indexOf(i) < 0) {
          var connection = t.addConnection({hostName:hostName, hostPort:i});
          connection.on('connect disconnect error', callbackWhenDone, connection);
        }
      }
    },

    /**
    * Connect to an internal probe implementation
    *
    * This connects with a probe running in this process.  It will instantiate
    * the probe if it isn't currently running.
    *
    * @method connectInternal
    * @protected
    * @param monitorJSON {Object} - The monitor toJSON data.  Containing:
    *     @param monitorJSON.probeClass {String} - The probe class name to connect with (required)
    *     @param monitorJSON.initParams {Object} - Probe initialization parameters.
    * @param callback {Function(error, probeImpl)} - Called when connected
    */
    connectInternal: function(monitorJSON, callback) {

      // Build a key for this probe from the probeClass and initParams
      var t = this,
          probeKey = t.buildProbeKey(monitorJSON),
          probeClass = monitorJSON.probeClass,
          initParams = monitorJSON.initParams,
          probeImpl = null;

      var whenDone = function(error) {

        // Wait one tick before firing the callback.  This simulates a remote
        // connection, making the client callback order consistent, regardless
        // of a local or remote connection.
        setTimeout(function() {

          // Dont connect the probe on error
          if (error) {
            return callback(error);
          }

          // Probes are released based on reference count
          probeImpl.refCount++;
          callback(null, probeImpl);
        }, 0);
      };

      // Get the probe instance
      probeImpl = t.runningProbesByKey[probeKey];
      if (!probeImpl) {

        // Instantiate the probe
        var ProbeClass = Probe.classes[probeClass];
        if (!ProbeClass) {
          return whenDone({msg:'Probe not available: ' + probeClass});
        }
        var initOptions = {asyncInit: false, callback: whenDone};
        try {
          probeImpl = new ProbeClass(initParams, initOptions);
          probeImpl.set({id: Monitor.generateUniqueId()});
          probeImpl.refCount = 0;
          probeImpl.probeKey = probeKey;
          t.runningProbesByKey[probeKey] = probeImpl;
          t.runningProbesById[probeImpl.id] = probeImpl;
        } catch (e) {
          var error = {msg: 'Error instantiating probe ' + probeClass, error: JSON.stringify(e)};
          console.log(error);
          return whenDone(error);
        }

        // Return early if the probe constructor transferred responsibility
        // for calling the callback.
        if (initOptions.asyncInit) {
          return;
        }
      }

      // The probe impl is found, and instantiated if necessary
      whenDone();
    },

    /**
    * Disconnect with an internal probe implementation.
    *
    * @method disconnectInternal
    * @protected
    * @param probeId {String} - The probe implementation ID to disconnect
    * @param callback {Function(error, probeImpl)} - Called when disconnected
    */
    disconnectInternal: function(probeId, callback) {
      var t = this, probeImpl = t.runningProbesById[probeId];
      if (--probeImpl.refCount === 0) {
        // Release probe resources & internal references
        probeImpl.release();
        delete t.runningProbesByKey[probeImpl.probeKey];
        delete t.runningProbesById[probeId];
      }
      callback(null, probeImpl);
    },

    /**
    * Connect to an external probe implementation.
    *
    * This connects with a probe running in another process.  It will
    * coordinate the remote instantiation of the probe if it's not running.
    *
    * @method connectExternal
    * @protected
    * @param monitorJSON {Object} - An object containing:
    *     @param monitorJSON.probeClass {String} - The probe class name (required)
    *     @param monitorJSON.initParams {Object} - Probe initialization parameters (if any)
    * @param connection {Connection} - The connection to use
    * @param callback {Function(error, probeProxy)} - Called when connected
    */
    connectExternal: function(monitorJSON, connection, callback) {

      // Build a key for this probe from the probeClass and initParams
      var t = this, probeKey = t.buildProbeKey(monitorJSON);
      // Get the probe proxy
      var probeId = connection.remoteProbeIdsByKey[probeKey];
      var probeProxy = connection.remoteProbesById[probeId];

      if (!probeProxy) {
        // Connect with the remote probe
        var connectParams = {probeClass: monitorJSON.probeClass, initParams: monitorJSON.initParams};

        connection.emit('probe:connect', connectParams, function(error, probeJSON){
          if (error) {
            console.error('Cannot connect to remote probe on host ' + connection.get('hostName'), connectParams, error);
            return callback(error);
          }
          probeId = probeJSON.id;

          // See if the proxy was created while waiting for return
          probeProxy = connection.remoteProbesById[probeId];
          if (probeProxy) {
            probeProxy.refCount++;
            return callback(null, probeProxy);
          }

          // Create the probe proxy
          probeProxy = new Probe(probeJSON);
          probeProxy.refCount = 1;
          probeProxy.connection = connection;
          connection.remoteProbeIdsByKey[probeKey] = probeId;
          connection.remoteProbesById[probeId] = probeProxy;
          connection.addEvent('probe:change:' + probeId, function(attrs){probeProxy.set(attrs);});
          return callback(null, probeProxy);
        });
        return;
      }

      // Probes are released based on reference count
      probeProxy.refCount++;
      return callback(null, probeProxy);
    },

    /**
    * Disconnect with an external probe implementation.
    *
    * @method disconnectExternal
    * @protected
    * @param connection {Connection} - The connection to use
    * @param probeId {String} - Probe ID
    * @param callback {Function(error)} - Called when disconnected
    */
    disconnectExternal: function(connection, probeId, callback) {
      var t = this, proxy = connection.remoteProbesById[probeId];
      if (!proxy) {return callback('Probe not running');}
      if (--proxy.refCount === 0) {
        // Release probe resources
        proxy.release();
        proxy.connection = null;
        delete connection.remoteProbesById[probeId];
        delete connection.remoteProbeIdsByKey[proxy.probeKey];
        connection.removeEvent('probe:change:' + probeId);
        return connection.emit('probe:disconnect', {probeId:probeId}, function(error){
          if (error) {
            console.log("Probe disconnect error from host : " + connection.get('hostName'), error);
          }
          return callback(error);
        });
      }
      callback(null);
    }

  });

}(this));
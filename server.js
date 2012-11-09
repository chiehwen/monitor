// server.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Load dependencies
  var Monitor = require('./lib/index');

  // Define the monitor appName
  Monitor.Config.appName = 'MonitorServer';

  /**
  * Bootstrap for a standalone monitor server
  *
  * @static
  * @class server
  */

  // Boot the UI server.
  // This accepts http and websocket connections on the configured port.
  var server = new Monitor.Server();
  server.start(function(error) {
    if (error) {
      console.error("Problem starting the monitor server: ", error);
      return;
    }
    console.log("MonitorServer started on host: " + Monitor.getRouter().getHostName());
  });

  // Process uncaught exceptions.
  process.on('uncaughtException', function(err){

    // On laptop sleep/startup the DNS servers aren't immediately available,
    // resulting in a flood of these for socket.io until DNS services are back up.
    if (err.message === 'ECONNREFUSED, Could not contact DNS servers') {
      return;
    }

    // Don't allow the process to continue in an unknown state.
    console.error("Uncaught Exception: " + err.message);
    console.error(err.stack);
    server.stop(function(){
      process.exit(1);
    });

    // Don't wait around if the server is hung.
    setTimeout(function(){process.exit(1);}, 2000);
  });

}(this));

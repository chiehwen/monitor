0.4.5 / 2012-12-08
==================

  * Limit default Inspect probe to 1 if no key

0.4.4 / 2012-12-02
==================

  * Install Travis-CI continuous integration testing framework
  * Place PollingProbe and Inspect probe into monitor-all.js for client-side
  * Removed Monitor.log (was just a wrapper for Monitor.stringify)
  * Allow disabling polling of PollingProbe via setting interval to 0
  * Changed default depth for Inspector from 4 to 2 (perf. improvement)
  * Changed UI references from monitor-ui to node_monitor

0.4.3 / 2012-11-25
==================

  * Added the Inspect probe for inspecting variables
  * Added a depth limited Monitor.stringify
  * Added a Monitor.out convenience method (for debugging)
  * Updated to work with newer grunt (for dev)
  * Cleaned up some probe docs
  * Updated dependent libraries and validated tests
  * Removed version stamps from distribution files

0.4.2 / 2012-11-21
==================

  * Added a null check while disconnecting probes
  * Changed references of node-monitor to monitor-ui
  * Changed .js distribution file to a consistent filename
  * Cleaned up some lint warnings

0.4.1 / 2012-11-16
==================

  * Firing connect/change events in correct order upon connect
  * Upgraded REPL probe for Node.js 0.6.x and 0.8.x compatibility


0.4.0 / 2012-11-12
==================

  * Initial 4.0 release - complete rename / rewrite

Monitor
=======

Remote monitoring for Node.js applications

Introduction
------------

This package establishes the foundation for remotely monitoring and controlling
running node.js applications.

It introduces the concept of a [Probe](http://reference/to/Probe.html)
- a small software component capable of inspecting, exposing, and controlling
state within a running node.js server.

Probes are written as
[Backbone](http://documentcloud.github.com/backbone>Backbone.js) models, and
are instantiated on-demand when requested from remote monitors.

From the monitoring process, a [Monitor](http://reference/to/Monitor.html) class
is provided to connect with a remote probe.

This package is used for writing and embedding probes into your app server,
and for writing custom clients for inspecting and controlling these probes.
A separate package  -
[Node-Monitor](https://reference/to/node-monitor) - provides a user interface
for building real-time dashboards for your node.js applications.

Quick Start
-----------

**Install using npm**

    npm install monitor

**Start the monitor service (standalone) **

Normally you'll include the package into your own application server, but you can
run this as a standalone application as well.

    npm start monitor

**Observe a probe from a remote process**

In this example, we're using a REPL console to connect with and monitor the
built-in [Process](http://reference/to/Process.html) probe.

Once your process starts (above), start a REPL console from another terminal

    $ node

Create a monitor for the Process probe

    > var Monitor = require('monitor');
    > var processMonitor = new Monitor({server:'localhost', probeClass: 'Process'});

Connect with the probe, and view the properties

    > processMonitor.connect();
    > processMonitor.toJSON();

The monitor is a Backbone model, so you can watch for changes

    > var showFreeMemory = function(){console.log(processMonitor.get('freemem'))}
    > processMonitor.on('change', showFreeMemory);

See Also
--------

[node-monitor] - Companion webapp for viewing monitors

License
-------

Released under the Apache License 2.0

See `LICENSE` file.

Copyright (c) 2012 Loren West

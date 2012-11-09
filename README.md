Monitor
=======

Runtime monitoring for Node.js applications

Introduction
------------

Online documentation is available at <http://lorenwest.github.com/node-config/latest>

Quick Start
-----------

**Install using npm**

    npm install monitor

**Start the monitor service**

    npm start monitor

**Observe a monitor**

    $ node
    > var Monitor = require('monitor');
    > var process = new Monitor({server:'localhost', probeClass: 'Process'});
    > process.connect();
    > process.toJSON();

See Also
--------

[node-monitor] - Companion webapp for viewing monitors

License
-------

Released under the Apache License 2.0

See `LICENSE` file.

Copyright (c) 2012 Loren West


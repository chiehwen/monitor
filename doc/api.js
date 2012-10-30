YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "Config",
        "Connection",
        "ConnectionTest",
        "FileProbe",
        "FileProbeTest",
        "Monitor",
        "MonitorTest",
        "PollingProbe",
        "Probe",
        "ProbeTest",
        "Process",
        "Repl",
        "Router",
        "RouterTest",
        "Server",
        "ServerTest",
        "Storage"
    ],
    "modules": [
        "Monitor",
        "Probes",
        "UnitTests"
    ],
    "allModules": [
        {
            "displayName": "Monitor",
            "name": "Monitor",
            "description": "Core monitor classes\n\nClasses in this module represent baseline monitor functionality.  They can\nbe loaded and run within a browser or within a commonJS server such as Node.js."
        },
        {
            "displayName": "Probes",
            "name": "Probes",
            "description": "<h2>Standard probes included in the node monitor package</h2>\n\n<p>\nThe probes in this module offer baseline monitoring functionality, and\nprovide examples for building custom probes.\n</p>"
        },
        {
            "displayName": "UnitTests",
            "name": "UnitTests",
            "description": "Node-Monitor Unit Tests\n\nThis module contains unit test classes for each of the core classes in the\nNode-Monitor distribution."
        }
    ]
} };
});
// Repl.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Probe = Monitor.Probe,
      util = require('util'),
      events = require('events'),
      ChildProcess = require('child_process');

  // Statics
  var CONSOLE_PROMPT = '> ';

  /**
  * A probe based Read-Execute-Print-Loop console for node.js processes
  *
  * @class Repl
  * @extends Probe
  * @constructor
  */
  var Repl = Monitor.Repl = Probe.extend({

    className: 'Repl',
    description: 'A socket.io based Read-Execute-Print-Loop console for node.js processes.',
    defaults: {
      // This assures output events are sent, even if the
      // data is the same as the prior output.
      sequence: 0,
      output: ''
    },

    initialize: function(attributes, options){
      var t = this;
      Probe.prototype.initialize.apply(t, arguments);

      // Don't send change events before connected
      process.nextTick(function(){
        t.stream = new ReplStream(t);
        t.repl = require('repl').start(CONSOLE_PROMPT, t.stream);
        t.htmlConsole = new HtmlConsole(t);
        t.shellCmd = null;
        t.repl.context.console = t.htmlConsole;
      });
    },

    /**
    * Send output to the terminal
    *
    * This forces the change event even if the last output is the same
    * as this output.
    *
    * @protected
    * @method output
    * @param str {String} String to output to the repl console
    */
    _output: function(str) {
      var t = this;
      t.set({
        output: str,
        sequence: t.get('sequence') + 1
      });
    },

    /**
    * Release any resources consumed by this probe.
    *
    * Stop the REPL console.  Consoles live 1-1 with a UI counterpart, so stop
    * requests exit the underlying repl console.  If the probe is re-started it
    * will get a new repl stream and console.
    *
    * @method release
    */
    release: function(){
      var t = this;
      t.stream = null;
      t.repl = null;
    },

    /**
    * Process an autocomplete request from the client
    *
    * @method autocomplete
    * @param {Object} params Named parameters
    * @param {Function(error, returnParams)} callback Callback function
    */
    autocomplete_control: function(params, callback) {
      var t = this;
      if (typeof(params) !== 'string' || params.length < 1) {
        callback("Autocomplete paramter must be a nonzero string");
      }

      // Forward to the completion mechanism if it can be completed
      if (params.substr(-1).match(/([0-9])|([a-z])|([A-Z])|([_])/)) {
        t.repl.complete(params, callback);
      } else {
        // Return a no-op autocomplete
        callback(null, [[],'']);
      }
    },

    /**
    * Handle user input from the console line
    *
    * @method input
    * @param {Object} params Named parameters
    * @param {Function(error, returnParams)} callback Callback function
    */
    input_control: function(params, callback) {
      var t = this;
      if (params == '.break' && t.shellCmd) {
        t.shellCmd.kill();
      }
      t.stream.emit('data', params);
      return callback(null);
    },

    /**
    * Execute a shell command
    *
    * @method sh
    * @param {Object} params Named parameters
    * @param {Function(error, returnParams)} callback Callback function
    */
    sh_control: function(params, callback) {
      var t = this;
      return callback(null, t._runShellCmd(params));
    },

    /**
    * Run a shell command and emit the output to the browser.
    *
    * @private
    * @method _runShellCmd
    * @param {String} command - The shell command to invoke
    */
    _runShellCmd: function(command) {
      var t = this;
      t.shellCmd = ChildProcess.exec(command, function(err, stdout, stderr) {
        if (err) {
          var outstr = 'exit';
          if (err.code) outstr += ' (' + err.code + ')';
          if (err.signal) outstr += ' ' + err.signal;
          t._output(outstr);
          return null;
        }
        if (stdout.length) t._output(stdout);
        if (stderr.length) t._output(stderr);
        t.shellCmd = null;
        t._output(CONSOLE_PROMPT);
      });
      return null;
    },

  });

  // Define an internal stream class for the probe
  var ReplStream = function(probe){
    var t = this;
    t.probe = probe;
    events.EventEmitter.call(t);
    t.setEncoding && t.setEncoding('utf-8');
  };
  util.inherits(ReplStream, events.EventEmitter);
  ReplStream.prototype.readable = true;
  ReplStream.prototype.writable = true;
  ['pause','resume','destroySoon','pipe', 'end']
    .forEach(function(fnName){
      ReplStream.prototype[fnName] = function(){
        console.log("REPL Stream function unexpected: " + fnName);
      }
    });
  ['resume']
    .forEach(function(fnName){
      ReplStream.prototype[fnName] = function(){
        // Handled
      }
    });
  ReplStream.prototype.write = function(data) {
    var t = this;
    t.probe._output(data);
  };
  ReplStream.prototype.destroy = function(data) {
    var t = this;
  console.log("REPL stream destroy " + t.probe.get('id'));
    t.probe.stop();
  };

  // Define format if it's not in util.
  var formatRegExp = /%[sdj]/g;
  var format = util.format || function (f) {
    if (typeof f !== 'string') {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(util.inspect(arguments[i]));
      }
      return objects.join(' ');
    }
    var i = 1;
    var args = arguments;
    var str = String(f).replace(formatRegExp, function(x) {
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++]);
        default:
          return x;
      }
    });
    for (var len = args.length, x = args[i]; i < len; x = args[++i]) {
      if (x === null || typeof x !== 'object') {
        str += ' ' + x;
      } else {
        str += ' ' + util.inspect(x);
      }
    }
    return str;
  }

  // Re-define the console so it goes to the HTML window
  var HtmlConsole = function(probe){
    this.probe = probe;
  };
  HtmlConsole.prototype.log = function(msg) {
    this.probe._output(format.apply(this, arguments));
  }
  HtmlConsole.prototype.info = HtmlConsole.prototype.log;
  HtmlConsole.prototype.warn = HtmlConsole.prototype.log;
  HtmlConsole.prototype.error = HtmlConsole.prototype.log;
  HtmlConsole.prototype.dir = function(object) {
    this.probe._output(util.inspect(object));
  };
  var times = {};
  HtmlConsole.prototype.time = function(label) {
    times[label] = Date.now();
  };
  HtmlConsole.prototype.timeEnd = function(label) {
    var duration = Date.now() - times[label];
    this.log('%s: %dms', label, duration);
  };

}(this));

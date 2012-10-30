// Dependencies
var util = require('util'),
    events = require('events'),
    _ = require('underscore'),
    Monitor = require('../monitor'),
    Probe = require('../probe'),
    CONFIG = require('config');

// Statics
var UNDEFINED = 'undefined';

// Define and register the class
var classDefinition = {
  id: null,
  name: 'Config',
  description: 'Remote exposure and control of configuration parameters',
  defaultParameters: {
    parameter: null
  },
  parameterDescriptions: {
    parameter: "A specific top-level configuration parameter.  Null for all configuration parameters."
  }
};


/**
 * Remote exposure and control of configuration parameters.
 *
 * This probe can monitor the state of, and changes to local configuration
 * parameters.  The probe can be configured to monitor a specific top-level
 * configuration parameter, or all process configuration parameters.
 *
 * @class Config
 * @extends Probe
 * @constructor
 * @param {String} name - A name identifying the instance of this REPL console.
 * @param {Object} config - Configuration override object
 *   parameter {String} - The name of a top level configuration object to monitor.
 */
var Config = module.exports = function (name, config) {

  // Call super constructor
  config = _.extend({}, classDefinition.defaultParameters, config);
  Config.super_.call(this, classId, name, config);
};

// Node.js style class inheritence
util.inherits(Config, Probe);
var proto_ = Config.prototype;
var super_ = Config.super_.prototype;

// Register the probe class
var classId = Monitor.registerClass(Config, classDefinition);

/**
 * Start the probe
 *
 * @method start
 * @param {Function} callback(error) - (optional) Called when the monitor has started
 */
proto_.start = function(callback) {
  // Call the parent start
  var t = this;
  super_.start.call(t);

  // Default the parameter if undefined
  t.paramName = t.config.parameter;
  if (t.paramName && typeof CONFIG[t.paramName] == UNDEFINED) {
    CONFIG[t.paramName] = {};
  }

  // Watch the parameter
  t.paramValue = CONFIG.watch(CONFIG, t.paramName, function(){t.onChange.apply(t, arguments);});
  if (callback) callback(null);
}

/**
 * Stop the REPL console.  Consoles live 1-1 with a UI counterpart, so stop
 * requests exit the underlying repl console.  If the probe is re-started it
 * will get a new repl stream and console.
 *
 * @method stop
 * @param {Function} callback(error) - (optional) Called when the monitor has started
 */
proto_.stop = function(callback) {
  var t = this;
  t.stream = null;
  t.console = null;
  super_.stop.call(t);
  if (callback) callback(null);
}

/**
 * Handle a control event sent to this monitor.
 *
 * @method onControl
 * @param {ControlEvent} event - The ControlEvent object
 * @param {Function} callback(error, {Mixed}) - Called when complete
 */
proto_.onControl = function(controlEvent, callback) {

  // Send the keystroke into the REPL stream
  var t = this, name = controlEvent.name, data = controlEvent.data;

  // Process the control event
  switch (name) {
    case 'query':
      return callback(null, t.paramName ? CONFIG[t.paramName] : CONFIG);
    case 'set':
      return callback(null, t.set(data.property, data.value));
    default:
      throw new Error('Unknown control method: ' + name);
  }
}

/**
 * Set the value of a property
 *
 * @method set
 * @param {String} property - The property to set.  If null, the entire object is set.
 * @param {String} value - Value of the property (or object if property is null).
 */
proto_.set = function(property, value) {
  var t = this;

  // If the parameter doesn't exist, create and start watching it
  var config = (t.paramName ? CONFIG[t.paramName] : CONFIG);
  if (property && typeof config[property] == UNDEFINED) {
    config[property] = {};
    CONFIG.watch(config, property, function(){t.onChange.apply(t, arguments);});
  }

  // Change the property
  if (property)
    config[property] = value;
  else
    config = value;
}

/**
 * Handle a change event from the underlying CONFIG object
 *
 * @method onChange
 * @param {Object} object - The object that changed
 * @param {String} property - Name of the changed property
 * @param {String} priorValue - Value prior to the change
 * @param {String} newValue - Value after the change
 */
proto_.onChange = function(object, property, priorValue, newValue) {
  var t = this;
  t.emitMonitorEvent('change', {object:object, property:property,
    priorValue:priorValue, newValue: newValue});
}

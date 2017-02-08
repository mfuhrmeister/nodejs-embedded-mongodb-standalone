/** stops a mongodb with given db path **/

var
  logger = require('npmlog'),
  sprintf = require('sprintf-js').sprintf,
  args = process.argv.splice(process.execArgv.length + 2),
  
  nems = require('../lib/nems'),

  MODULE_NAME = require('../package.json').name,
  MESSAGE_START = 'Stopping mongodb!',
  MESSAGE_USAGE = 'Usage:\n\nnode ./bin/stop.js [dbpath]\n\n' +
    'dbpath - the mongo db path\n\n' +
    'If no dbpath is given, default path will be assumed.',
  MESSAGE_DEFAULTS = 'Using default configuration to stop mongodb.',
  MESSAGE_STOPPED = 'mongod stopped';


if (args.length > 1 || (args.length === 1 && ( args[0] === 'h' || args[0] === '-h' || args[0] === '--help'))) {
  logger.info(MODULE_NAME, MESSAGE_USAGE);
  return;
} else if (args.length === 0) {
  logger.info(MODULE_NAME, MESSAGE_DEFAULTS);
}

logger.info(MODULE_NAME, MESSAGE_START);

var
  DBPATH = args[0];

nems.stop(DBPATH)
  .then(function() {
    logger.info(MODULE_NAME, MESSAGE_STOPPED);
  })
  .catch(function (err) {
    logger.error(MODULE_NAME, err.message);
  });
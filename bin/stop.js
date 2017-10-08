/** stops a mongodb with given db path **/

var
  logger = require('npmlog'),
  args = process.argv.splice(process.execArgv.length + 2),
  
  nems = require('../lib/nems'),

  MODULE_NAME = require('../package.json').name,
  MESSAGE_START = 'Stopping mongodb!',
  MESSAGE_USAGE = 'Usage:\n\nnode ./bin/stop.js [binPath [dbpath]]\n\n' +
    'binPath - the mongo installation path\n\n' +
    'dbpath - db working directory, if different from installation path (optional)\n\n' +
    'If no binPath is given, default path will be assumed.',
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
  BINPATH = args[0],
  DBPATH = args[0];

nems.stop(BINPATH, DBPATH)
  .then(function() {
    logger.info(MODULE_NAME, MESSAGE_STOPPED);
  })
  .catch(function (err) {
    logger.error(MODULE_NAME, err.message);
  });
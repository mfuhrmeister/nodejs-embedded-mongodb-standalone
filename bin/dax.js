/** DAX - Download and extract mongodb with given version and extraction directory or defaults **/

var
  logger = require('npmlog'),
  args = process.argv.splice(process.execArgv.length + 2),
  
  nems = require('../lib/nems'),

  MODULE_NAME = require('../package.json').name,
  MESSAGE_START = 'Starting distribution of mongodb!',
  MESSAGE_USAGE = 'Usage:\n\nnode ./lib/nems.js [version [dir]]\n\nversion - the version of the mongodb\ndir - the directory to download and extract to',
  MESSAGE_DEFAULTS= 'Using default configuration for download and extraction.';

logger.info(MODULE_NAME, MESSAGE_START);

if (args.length > 2) {
  logger.warn(MODULE_NAME, MESSAGE_USAGE);
  return;
} else if (args.length === 0) {
  logger.info(MODULE_NAME, MESSAGE_DEFAULTS);
}

var
  VERSION = (args[0]) ? args[0] : '2.4.9',
  DOWNLOAD_DIR = args[1];

nems.distribute(VERSION, DOWNLOAD_DIR);
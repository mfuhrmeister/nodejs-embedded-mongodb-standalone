/** DAX - Download and extract mongodb with given version and extraction directory or defaults **/

// toogle debug output for mongodb-download
process.env.DEBUG = '*';

var
  logger = require('npmlog'),
  sprintf = require('sprintf-js').sprintf,
  args = process.argv.splice(process.execArgv.length + 2),
  
  nems = require('../lib/nems'),

  MODULE_NAME = require('../package.json').name,
  MESSAGE_START = 'Starting distribution of mongodb!',
  MESSAGE_USAGE = 'Usage:\n\nnode ./bin/dax.js [version [dir]]\n\n' +
    'version - the version of the mongodb\n' +
    'dir - the directory to download and extract to\n\n' +
    'If no download directory is given, mongodb will be downloaded and extracted to the temporary folder of your OS.\n' +
    'If no version is given also, a default version will be downloaded and extracted.',
  MESSAGE_DEFAULTS = 'Using default configuration for download and extraction.',
  MESSAGE_EXTRACTED = 'Extracted to %s .',
  MESSAGE_SUCCESS = 'Download and extraction completed.';


if (args.length > 2 || (args.length === 1 && ( args[0] === 'h' || args[0] === '-h' || args[0] === '--help'))) {
  logger.info(MODULE_NAME, MESSAGE_USAGE);
  return;
} else if (args.length === 0) {
  logger.info(MODULE_NAME, MESSAGE_DEFAULTS);
}

logger.info(MODULE_NAME, MESSAGE_START);

var
  VERSION = (args[0]) ? args[0] : '2.4.9',
  DOWNLOAD_DIR = args[1];

nems.distribute(VERSION, DOWNLOAD_DIR)
  .then(function(path) {
    logger.info(MODULE_NAME, sprintf(MESSAGE_EXTRACTED, path));
    logger.info(MODULE_NAME, MESSAGE_SUCCESS);
  })
  .catch(function (err) {
    logger.error(MODULE_NAME, err);
  });
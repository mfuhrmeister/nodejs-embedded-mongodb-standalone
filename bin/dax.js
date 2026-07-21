/** DAX - Download and extract mongodb with given version and extraction directory or defaults **/

// toogle debug output for mongodb-download
process.env.DEBUG = '*';

var
  os = require('os'),
  logger = require('npmlog'),
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
  MESSAGE_EXTRACTED = 'Extracted to',
  MESSAGE_SUCCESS = 'Download and extraction completed.';

function getDefaultVersion() {
  if (os.platform() === 'darwin' && os.arch() === 'arm64') {
    return '6.0.8';
  }

  return '2.4.9';
}

if (args.length > 2 || (args.length === 1 && ( args[0] === 'h' || args[0] === '-h' || args[0] === '--help'))) {
  logger.info(MODULE_NAME, MESSAGE_USAGE);
  return;
} else if (args.length === 0) {
  logger.info(MODULE_NAME, MESSAGE_DEFAULTS);
}

logger.info(MODULE_NAME, MESSAGE_START);

var
  VERSION = (args[0]) ? args[0] : getDefaultVersion(),
  DOWNLOAD_DIR = args[1];

async function main() {
  try {
    var path = await nems.distribute(VERSION, DOWNLOAD_DIR);
    logger.info(MODULE_NAME, `${MESSAGE_EXTRACTED} ${path} .`);
    logger.info(MODULE_NAME, MESSAGE_SUCCESS);
  } catch (err) {
    logger.error(MODULE_NAME, err);
  }
}

main();

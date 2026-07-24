/** DAX - Download and extract mongodb with given version and extraction directory or defaults **/

import { getCliErrorMessage, getDefaultVersion } from './cliCommon.js';
import logger from '../lib/logger.js';
import nems from '../lib/nems.js';

const
  args = process.argv.splice(process.execArgv.length + 2),
  MODULE_NAME = 'nems',
  MESSAGE_START = 'Starting distribution of mongodb!',
  MESSAGE_USAGE = 'Usage:\n\nnode ./bin/dax.js [version [dir]]\n\n' +
    'version - the version of the mongodb\n' +
    'dir - the directory to download and extract to\n\n' +
    'If no download directory is given, mongodb will be downloaded and extracted to the temporary folder of your OS.\n' +
    'If no version is given also, the default version 6.0.8 will be downloaded and extracted.\n' +
    'Set DEBUG=* before running to enable debug output.',
  MESSAGE_DEFAULTS = 'Using default configuration for download and extraction.',
  MESSAGE_EXTRACTED = 'Extracted to',
  MESSAGE_SUCCESS = 'Download and extraction completed.';

if (args.length > 2 || (args.length === 1 && ( args[0] === 'h' || args[0] === '-h' || args[0] === '--help'))) {
  logger.info(MODULE_NAME, MESSAGE_USAGE);
} else {
  if (args.length === 0) {
    logger.info(MODULE_NAME, MESSAGE_DEFAULTS);
  }

  logger.info(MODULE_NAME, MESSAGE_START);

  const
    VERSION = (args[0]) ? args[0] : getDefaultVersion(),
    DOWNLOAD_DIR = args[1];

  async function main() {
    try {
      const extractedPath = await nems.distribute(VERSION, DOWNLOAD_DIR);
      logger.info(MODULE_NAME, `${MESSAGE_EXTRACTED} ${extractedPath} .`);
      logger.info(MODULE_NAME, MESSAGE_SUCCESS);
    } catch (err) {
      logger.error(MODULE_NAME, getCliErrorMessage(err));
      process.exitCode = 1;
    }
  }

  main();
}

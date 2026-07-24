/** stops a mongodb with given db path **/

import { getCliErrorMessage } from './cliCommon.js';
import logger from '../lib/logger.js';
import nems from '../lib/nems.js';

const
  args = process.argv.splice(process.execArgv.length + 2),
  MODULE_NAME = 'nems',
  MESSAGE_START = 'Stopping mongodb!',
  MESSAGE_USAGE = 'Usage:\n\nnode ./bin/stop.js [binPath [dbpath]]\n\n' +
    'binPath - the mongo installation path\n\n' +
    'dbpath - db working directory, if different from installation path (optional)\n\n' +
    'If no binPath is given, default path will be assumed.',
  MESSAGE_DEFAULTS = 'Using default configuration to stop mongodb.',
  MESSAGE_STOPPED = 'mongod stopped';


if (args.length > 2 || (args.length === 1 && ( args[0] === 'h' || args[0] === '-h' || args[0] === '--help'))) {
  logger.info(MODULE_NAME, MESSAGE_USAGE);
} else {
  if (args.length === 0) {
    logger.info(MODULE_NAME, MESSAGE_DEFAULTS);
  }

  logger.info(MODULE_NAME, MESSAGE_START);

  const
    BINPATH = args[0],
    DBPATH = args[1];

  async function main() {
    try {
      await nems.stop(BINPATH, DBPATH);
      logger.info(MODULE_NAME, MESSAGE_STOPPED);
    } catch (err) {
      logger.error(MODULE_NAME, getCliErrorMessage(err));
      process.exitCode = 1;
    }
  }

  main();
}

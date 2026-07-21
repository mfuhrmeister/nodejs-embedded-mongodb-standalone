'use strict';

const
  childProcess = require('child_process'),
  fs = require('fs'),
  logger = require('../logger'),
  path = require('path'),

  MongoError = require('../error/errors').MongoError,
  MESSAGE_MONGO_WAITING = '[initandlisten] waiting for connections on port',
  MESSAGE_MONGO_WAITING_MODERN = '"msg":"Waiting for connections"',
  MESSAGE_MONGO_KILLING_PROCESS = 'killing process with pid',
  MESSAGE_MONGO_INIT_EXCEPTION = '[initandlisten] exception in initAndListen',
  MESSAGE_MONGO_BAD_PORT = 'bad --port number',
  MESSAGE_MONGO_ADDR_IN_USE = 'addr already in use',
  MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with dbpath',
  PID_FILE_NAME = 'mongod.pid',

  SUCCESS_MESSAGE_MONGO_SHUTDOWN = 'The mongodb instance has been shutdown!',

  ERROR_MESSAGE_MONGO_START_FAILED = 'could not start mongo process: ',
  ERROR_MESSAGE_MONGO_SHUTDOWN = 'could not create child process to stop mongo process',
  ERROR_MESSAGE_MONGO_INSTANCE_EXIST = 'Is a mongod instance already running?',
  ERROR_MESSAGE_MONGO_BAD_PORT = 'The port you used is not allowed. See mongodb docs.',
  ERROR_MESSAGE_MONGO_ADDR_IN_USE  = 'The port you used is already in use.',
  ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with the given dbpath.';

function escapePath(dbPath) {
  // wrap path as string due to https://github.com/nodejs/node/issues/6803
  return '"' + dbPath + '"';
}

function addDbPathParameter(execCommand, dbPath, binPath) {
  if (!!dbPath) {
    execCommand = execCommand.concat(' --dbpath ', escapePath(dbPath));
  } else if (!!binPath) {
    execCommand = execCommand.concat(' --dbpath ', escapePath(binPath));
  }
  return execCommand;
}

function getResolvedDbPath(dbPath, binPath) {
  return dbPath || binPath;
}

function getPidFilePath(dbPath, binPath) {
  const resolvedDbPath = getResolvedDbPath(dbPath, binPath);

  if (!resolvedDbPath) {
    return undefined;
  }

  return path.join(resolvedDbPath, PID_FILE_NAME);
}

function addPidFileParameter(execCommand, dbPath, binPath) {
  const pidFilePath = getPidFilePath(dbPath, binPath);

  if (!pidFilePath) {
    return execCommand;
  }

  return execCommand.concat(' --pidfilepath ', escapePath(pidFilePath));
}

function isWaitingForConnectionsMessage(data) {
  const message = data.toString();

  return message.indexOf(MESSAGE_MONGO_WAITING) >= 0 ||
    message.indexOf(MESSAGE_MONGO_WAITING_MODERN) >= 0;
}

function createMongoService(dependencies) {
  const resolvedDependencies = dependencies || {};
  const resolvedChildProcess = resolvedDependencies.childProcess || childProcess;
  const resolvedFs = resolvedDependencies.fs || fs;
  const resolvedProcess = resolvedDependencies.process || process;
  const resolvedPath = resolvedDependencies.path || path;
  const state = resolvedDependencies.state || {
    mongoProcess: undefined
  };

  function getPidFilePathForService(dbPath, binPath) {
    const resolvedDbPath = dbPath || binPath;

    if (!resolvedDbPath) {
      return undefined;
    }

    return resolvedPath.join(resolvedDbPath, PID_FILE_NAME);
  }

  function addPidFileParameterForService(execCommand, dbPath, binPath) {
    const pidFilePath = getPidFilePathForService(dbPath, binPath);

    if (!pidFilePath) {
      return execCommand;
    }

    return execCommand.concat(' --pidfilepath ', escapePath(pidFilePath));
  }

  function createMongoProcess(execCommand) {
    return new Promise(function (resolve, reject) {
      if (state.mongoProcess) {
        resolve(state.mongoProcess.pid);
        return;
      }

      state.mongoProcess = resolvedChildProcess.exec(execCommand);

      state.mongoProcess.stderr.on('data', function (err) {
        reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + err));
      });
      state.mongoProcess.stdout.on('data', function (data) {
        if (data.toString().indexOf(MESSAGE_MONGO_INIT_EXCEPTION) >= 0) {
          reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_INSTANCE_EXIST));
          return;
        }
        if (data.toString().indexOf(MESSAGE_MONGO_BAD_PORT) >= 0) {
          reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_BAD_PORT));
          return;
        }
        if (data.toString().indexOf(MESSAGE_MONGO_ADDR_IN_USE) >= 0) {
          reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_ADDR_IN_USE));
          return;
        }
        if (isWaitingForConnectionsMessage(data)) {
          resolve(state.mongoProcess.pid);
        }
      });
    });
  }

  async function shutdownMongoProcess(execCommand, pidFilePath) {
    if (pidFilePath) {
      try {
        const pid = Number((await resolvedFs.promises.readFile(pidFilePath, 'utf8')).trim());

        if (!isNaN(pid)) {
          resolvedProcess.kill(pid, 'SIGTERM');
          state.mongoProcess = undefined;
          return SUCCESS_MESSAGE_MONGO_SHUTDOWN;
        }
      } catch (err) {
        if (err && err.code === 'ESRCH') {
          throw new MongoError(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH);
        }

        if (!err || err.code !== 'ENOENT') {
          throw err;
        }
      }
    }

    return new Promise(function (resolve, reject) {
      const cp = resolvedChildProcess.exec(execCommand);
      if (!cp) {
        reject(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN));
        return;
      }

      cp.stderr.on('data', function (err) {
        if (err.toString().indexOf(MESSAGE_MONGO_UNKNOWN_DB_PATH) >= 0) {
          reject(new MongoError(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH));
        }
      });

      cp.stdout.on('data', function (data) {
        if (data.toString().indexOf(MESSAGE_MONGO_KILLING_PROCESS) >= 0) {
          state.mongoProcess = undefined;
          resolve(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
        }
      });
    });
  }

  function start(binPath, port, noprealloc, nojournal, dbPath) {
    let execCommand = 'mongod';

    if (!!binPath) {
      execCommand = escapePath(resolvedPath.join(binPath, execCommand));
    }
    if (!!port) {
      execCommand = [execCommand, '--port', port].join(' ');
    }
    if (!!noprealloc) {
      execCommand = execCommand.concat(' --noprealloc');
    }
    if (!!nojournal) {
      execCommand = execCommand.concat(' --nojournal');
    }

    execCommand = addDbPathParameter(execCommand, dbPath, binPath);
    execCommand = addPidFileParameterForService(execCommand, dbPath, binPath);

    return createMongoProcess(execCommand);
  }

  function stop(binPath, dbPath) {
    let execCommand = 'mongod';

    if (!!binPath) {
      execCommand = escapePath(resolvedPath.join(binPath, execCommand));
    }

    execCommand = addDbPathParameter(execCommand, dbPath, binPath);

    execCommand += ' --shutdown';

    return shutdownMongoProcess(execCommand, getPidFilePathForService(dbPath, binPath));
  }

  return {
    start: start,
    stop: stop
  };
}

module.exports = createMongoService();
module.exports.createMongoService = createMongoService;

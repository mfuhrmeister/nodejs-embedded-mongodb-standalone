'use strict';

var
  childProcess = require('child_process'),
  fs = require('fs'),
  logger = require('npmlog'),
  path = require('path'),

  MongoError = require('../error/errors').MongoError,

  mongoProcess,
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
  var resolvedDbPath = getResolvedDbPath(dbPath, binPath);

  if (!resolvedDbPath) {
    return undefined;
  }

  return path.join(resolvedDbPath, PID_FILE_NAME);
}

function addPidFileParameter(execCommand, dbPath, binPath) {
  var pidFilePath = getPidFilePath(dbPath, binPath);

  if (!pidFilePath) {
    return execCommand;
  }

  return execCommand.concat(' --pidfilepath ', escapePath(pidFilePath));
}

function isWaitingForConnectionsMessage(data) {
  var message = data.toString();

  return message.indexOf(MESSAGE_MONGO_WAITING) >= 0 ||
    message.indexOf(MESSAGE_MONGO_WAITING_MODERN) >= 0;
}

function createMongoProcess(execCommand) {
  return new Promise(function (resolve, reject) {
    if (mongoProcess) {
      resolve(mongoProcess.pid);
      return;
    }

    mongoProcess = childProcess.exec(execCommand);

    mongoProcess.stderr.on('data', function(err) {
      reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + err));
    });
    mongoProcess.stdout.on('data', function(data) {
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
        resolve(mongoProcess.pid);
      }
    });
  });
}

async function shutdownMongoProcess(execCommand, pidFilePath) {
  var pid;

  if (pidFilePath) {
    try {
      pid = Number((await fs.promises.readFile(pidFilePath, 'utf8')).trim());

      if (!isNaN(pid)) {
        process.kill(pid, 'SIGTERM');
        mongoProcess = undefined;
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
    var cp = childProcess.exec(execCommand);
    if(!cp) {
      reject(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN));
      return;
    }

    cp.stderr.on('data', function(err) {
      if (err.toString().indexOf(MESSAGE_MONGO_UNKNOWN_DB_PATH) >= 0) {
        reject(new MongoError(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH));
      }
    });

    cp.stdout.on('data', function(data) {
      if (data.toString().indexOf(MESSAGE_MONGO_KILLING_PROCESS) >= 0) {
        mongoProcess = undefined;
        resolve(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
      }
    });
  });
}

function start(binPath, port, noprealloc, nojournal, dbPath) {
  var execCommand = 'mongod';

  if (!!binPath) {
    execCommand = escapePath(path.join(binPath, execCommand));
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
  execCommand = addPidFileParameter(execCommand, dbPath, binPath);

  return createMongoProcess(execCommand);
}

function stop(binPath, dbPath) {
  var execCommand = 'mongod';

  if (!!binPath) {
    execCommand = escapePath(path.join(binPath, execCommand));
  }

  execCommand = addDbPathParameter(execCommand, dbPath, binPath);

  execCommand += ' --shutdown';

  return shutdownMongoProcess(execCommand, getPidFilePath(dbPath, binPath));
}

module.exports.start = start;
module.exports.stop = stop;

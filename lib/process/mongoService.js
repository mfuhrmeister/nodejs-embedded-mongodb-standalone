import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

import { MongoError } from '../error/errors.js';

const
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
  ERROR_MESSAGE_MONGO_START_TIMEOUT = 'could not start mongo process: startup timed out',
  ERROR_MESSAGE_MONGO_SHUTDOWN_TIMEOUT = 'could not stop mongo process: shutdown timed out',
  ERROR_MESSAGE_MONGO_INSTANCE_EXIST = 'Is a mongod instance already running?',
  ERROR_MESSAGE_MONGO_BAD_PORT = 'The port you used is not allowed. See mongodb docs.',
  ERROR_MESSAGE_MONGO_ADDR_IN_USE  = 'The port you used is already in use.',
  ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with the given dbpath.',
  DEFAULT_STARTUP_TIMEOUT_MS = 30000,
  DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

function getResolvedDbPath(dbPath, binPath) {
  return dbPath || binPath;
}

function getMongoExecutablePath(resolvedPath, binPath) {
  if (binPath) {
    return resolvedPath.join(binPath, 'mongod');
  }

  return 'mongod';
}

function addDbPathArgument(args, dbPath, binPath) {
  const resolvedDbPath = getResolvedDbPath(dbPath, binPath);

  if (resolvedDbPath) {
    args.push('--dbpath', resolvedDbPath);
  }

  return args;
}

function getPidFilePath(dbPath, binPath) {
  const resolvedDbPath = getResolvedDbPath(dbPath, binPath);

  if (!resolvedDbPath) {
    return undefined;
  }

  return path.join(resolvedDbPath, PID_FILE_NAME);
}

function addPidFileArgument(args, dbPath, binPath) {
  const pidFilePath = getPidFilePath(dbPath, binPath);

  if (!pidFilePath) {
    return args;
  }

  args.push('--pidfilepath', pidFilePath);
  return args;
}

function ensureDbPathExists(resolvedFs, dbPath, binPath) {
  const resolvedDbPath = getResolvedDbPath(dbPath, binPath);

  if (!resolvedDbPath) {
    return;
  }

  resolvedFs.mkdirSync(resolvedDbPath, { recursive: true });
}

function isWaitingForConnectionsMessage(data) {
  const message = data.toString();

  return message.indexOf(MESSAGE_MONGO_WAITING) >= 0 ||
    message.indexOf(MESSAGE_MONGO_WAITING_MODERN) >= 0;
}

function cleanupListener(target, eventName, listener) {
  if (target && listener && typeof target.removeListener === 'function') {
    target.removeListener(eventName, listener);
  }
}

async function tryShutdownUsingPidFile(resolvedFs, resolvedProcess, pidFilePath) {
  if (!pidFilePath) {
    return {
      shouldFallback: true
    };
  }

  try {
    const pid = Number((await resolvedFs.promises.readFile(pidFilePath, 'utf8')).trim());

    if (Number.isInteger(pid) && pid > 0) {
      resolvedProcess.kill(pid, 'SIGTERM');

      return {
        shouldFallback: false,
        successMessage: SUCCESS_MESSAGE_MONGO_SHUTDOWN
      };
    }

    return {
      shouldFallback: true
    };
  } catch (err) {
    if (err && err.code === 'ESRCH') {
      throw new MongoError(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH);
    }

    if (err && err.code === 'ENOENT') {
      return {
        shouldFallback: true
      };
    }

    throw err;
  }
}

function createMongoService(dependencies) {
  const resolvedDependencies = dependencies || {};
  const resolvedChildProcess = resolvedDependencies.childProcess || childProcess;
  const resolvedFs = resolvedDependencies.fs || fs;
  const resolvedProcess = resolvedDependencies.process || process;
  const resolvedPath = resolvedDependencies.path || path;
  const resolvedTimers = resolvedDependencies.timers || globalThis;
  const resolvedTimeouts = Object.assign({
    startupMs: DEFAULT_STARTUP_TIMEOUT_MS,
    shutdownMs: DEFAULT_SHUTDOWN_TIMEOUT_MS
  }, resolvedDependencies.timeouts || {});
  const state = resolvedDependencies.state || {
    mongoProcess: undefined
  };

  function createMongoProcess(command, args) {
    return new Promise(function (resolve, reject) {
      if (state.mongoProcess) {
        resolve(state.mongoProcess.pid);
        return;
      }

      state.mongoProcess = resolvedChildProcess.spawn(command, args);
      if (!state.mongoProcess) {
        reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + 'child process could not be created'));
        return;
      }

      let settled = false;
      let timeoutId;

      function finalize(error, result) {
        if (settled) {
          return;
        }
        settled = true;

        if (timeoutId) {
          resolvedTimers.clearTimeout(timeoutId);
        }

        cleanupListener(state.mongoProcess.stderr, 'data', onStdErrData);
        cleanupListener(state.mongoProcess.stdout, 'data', onStdOutData);
        cleanupListener(state.mongoProcess, 'error', onProcessError);
        cleanupListener(state.mongoProcess, 'close', onProcessClose);

        if (error) {
          state.mongoProcess = undefined;
          reject(error);
          return;
        }

        resolve(result);
      }

      function onStdErrData(err) {
        finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + err));
      }

      function onStdOutData(data) {
        if (data.toString().indexOf(MESSAGE_MONGO_INIT_EXCEPTION) >= 0) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_INSTANCE_EXIST));
          return;
        }
        if (data.toString().indexOf(MESSAGE_MONGO_BAD_PORT) >= 0) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_BAD_PORT));
          return;
        }
        if (data.toString().indexOf(MESSAGE_MONGO_ADDR_IN_USE) >= 0) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_ADDR_IN_USE));
          return;
        }
        if (isWaitingForConnectionsMessage(data)) {
          finalize(undefined, state.mongoProcess.pid);
        }
      }

      function onProcessError(err) {
        finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + err.message));
      }

      function onProcessClose() {
        finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + 'process exited before startup completed'));
      }

      state.mongoProcess.stderr.on('data', onStdErrData);
      state.mongoProcess.stdout.on('data', onStdOutData);
      state.mongoProcess.on('error', onProcessError);
      state.mongoProcess.on('close', onProcessClose);

      timeoutId = resolvedTimers.setTimeout(function () {
        if (typeof state.mongoProcess.kill === 'function') {
          state.mongoProcess.kill('SIGTERM');
        }
        finalize(new MongoError(ERROR_MESSAGE_MONGO_START_TIMEOUT));
      }, resolvedTimeouts.startupMs);
    });
  }

  async function shutdownMongoProcess(command, args, pidFilePath) {
    const pidFileResult = await tryShutdownUsingPidFile(resolvedFs, resolvedProcess, pidFilePath);
    if (!pidFileResult.shouldFallback) {
      state.mongoProcess = undefined;
      return pidFileResult.successMessage;
    }

    return new Promise(function (resolve, reject) {
      const cp = resolvedChildProcess.spawn(command, args);
      if (!cp) {
        reject(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN));
        return;
      }

      let settled = false;
      let timeoutId;

      function finalize(error, result) {
        if (settled) {
          return;
        }
        settled = true;

        if (timeoutId) {
          resolvedTimers.clearTimeout(timeoutId);
        }

        cleanupListener(cp.stderr, 'data', onStdErrData);
        cleanupListener(cp.stdout, 'data', onStdOutData);
        cleanupListener(cp, 'error', onProcessError);
        cleanupListener(cp, 'close', onProcessClose);

        if (error) {
          reject(error);
          return;
        }

        state.mongoProcess = undefined;
        resolve(result);
      }

      function onStdErrData(err) {
        if (err.toString().indexOf(MESSAGE_MONGO_UNKNOWN_DB_PATH) >= 0) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH));
        }
      }

      function onStdOutData(data) {
        if (data.toString().indexOf(MESSAGE_MONGO_KILLING_PROCESS) >= 0) {
          finalize(undefined, SUCCESS_MESSAGE_MONGO_SHUTDOWN);
        }
      }

      function onProcessError(err) {
        finalize(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN + ': ' + err.message));
      }

      function onProcessClose() {
        finalize(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN + ': process exited before shutdown completed'));
      }

      cp.stderr.on('data', onStdErrData);
      cp.stdout.on('data', onStdOutData);
      cp.on('error', onProcessError);
      cp.on('close', onProcessClose);

      timeoutId = resolvedTimers.setTimeout(function () {
        if (typeof cp.kill === 'function') {
          cp.kill('SIGTERM');
        }
        finalize(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN_TIMEOUT));
      }, resolvedTimeouts.shutdownMs);
    });
  }

  function start(binPath, port, noprealloc, nojournal, dbPath) {
    const command = getMongoExecutablePath(resolvedPath, binPath);
    const args = [];

    if (port) {
      args.push('--port', String(port));
    }
    if (noprealloc) {
      args.push('--noprealloc');
    }
    if (nojournal) {
      args.push('--nojournal');
    }

    addDbPathArgument(args, dbPath, binPath);
    addPidFileArgument(args, dbPath, binPath);

    ensureDbPathExists(resolvedFs, dbPath, binPath);
    return createMongoProcess(command, args);
  }

  function stop(binPath, dbPath) {
    const command = getMongoExecutablePath(resolvedPath, binPath);
    const args = addDbPathArgument([], dbPath, binPath);

    args.push('--shutdown');

    return shutdownMongoProcess(command, args, getPidFilePath(dbPath, binPath));
  }

  return {
    start: start,
    stop: stop
  };
}

const mongoService = createMongoService();

export { createMongoService };
export default mongoService;

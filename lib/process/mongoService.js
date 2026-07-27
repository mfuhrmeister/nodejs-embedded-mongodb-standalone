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
  MESSAGE_MONGO_UNRECOGNISED_OPTION = 'unrecognised option',
  MESSAGE_MONGO_UNRECOGNIZED_OPTION = 'unrecognized option',
  MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with dbpath',
  PID_FILE_NAME = 'mongod.pid',

  SUCCESS_MESSAGE_MONGO_SHUTDOWN = 'The mongodb instance has been shutdown!',

  ERROR_MESSAGE_MONGO_START_FAILED = 'could not start mongo process: ',
  ERROR_MESSAGE_MONGO_SHUTDOWN = 'could not create child process to stop mongo process',
  ERROR_MESSAGE_MONGO_START_TIMEOUT = 'could not start mongo process: startup timed out',
  ERROR_MESSAGE_MONGO_SHUTDOWN_TIMEOUT = 'could not stop mongo process: shutdown timed out',
  ERROR_MESSAGE_MONGO_SHUTDOWN_PID_REQUIRED = 'could not stop mongo process: no pid is available and non-Linux shutdown requires the pid file written at startup',
  ERROR_MESSAGE_MONGO_INSTANCE_EXIST = 'Is a mongod instance already running?',
  ERROR_MESSAGE_MONGO_BAD_PORT = 'The port you used is not allowed. See mongodb docs.',
  ERROR_MESSAGE_MONGO_ADDR_IN_USE  = 'The port you used is already in use.',
  ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with the given dbpath.',
  DEFAULT_STARTUP_TIMEOUT_MS = 30000,
  DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

function getMongoExecutablePath(resolvedPath, binPath, platform) {
  const executableName = platform === 'win32' ? 'mongod.exe' : 'mongod';

  if (binPath) {
    return resolvedPath.join(binPath, executableName);
  }

  return executableName;
}

function getMongoRuntimePaths(resolvedPath, dbPath, binPath) {
  const resolvedDbPath = dbPath || binPath;

  return {
    resolvedDbPath: resolvedDbPath,
    pidFilePath: resolvedDbPath ? resolvedPath.join(resolvedDbPath, PID_FILE_NAME) : undefined
  };
}

function addDbPathArgument(args, mongoRuntimePaths) {
  if (mongoRuntimePaths.resolvedDbPath) {
    args.push('--dbpath', mongoRuntimePaths.resolvedDbPath);
  }

  return args;
}

function addPidFileArgument(args, mongoRuntimePaths) {
  if (mongoRuntimePaths.pidFilePath) {
    args.push('--pidfilepath', mongoRuntimePaths.pidFilePath);
  }

  return args;
}

function ensureDbPathExists(resolvedFs, mongoRuntimePaths) {
  if (!mongoRuntimePaths.resolvedDbPath) {
    return;
  }

  resolvedFs.mkdirSync(mongoRuntimePaths.resolvedDbPath, { recursive: true });
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

function getUnsupportedLegacyOptions(message, args) {
  const normalizedMessage = String(message);
  const hasUnknownOptionMessage = normalizedMessage.indexOf(MESSAGE_MONGO_UNRECOGNISED_OPTION) >= 0 ||
    normalizedMessage.indexOf(MESSAGE_MONGO_UNRECOGNIZED_OPTION) >= 0;
  const unsupportedOptions = [];

  if (!hasUnknownOptionMessage) {
    return unsupportedOptions;
  }

  if (normalizedMessage.indexOf('--noprealloc') >= 0 && args.indexOf('--noprealloc') >= 0) {
    unsupportedOptions.push('--noprealloc');
  }
  if (normalizedMessage.indexOf('--nojournal') >= 0 && args.indexOf('--nojournal') >= 0) {
    unsupportedOptions.push('--nojournal');
  }

  return unsupportedOptions;
}

function terminateMongoPid(resolvedProcess, pid, platform) {
  if (platform === 'win32') {
    resolvedProcess.kill(pid);
    return;
  }

  resolvedProcess.kill(pid, 'SIGTERM');
}

function tryShutdownUsingPid(resolvedProcess, pid, platform) {
  if (Number.isInteger(pid) && pid > 0) {
    terminateMongoPid(resolvedProcess, pid, platform);

    return {
      shouldFallback: false,
      successMessage: SUCCESS_MESSAGE_MONGO_SHUTDOWN
    };
  }

  return {
    shouldFallback: true
  };
}

async function tryShutdownUsingPidFile(resolvedFs, resolvedProcess, pidFilePath, platform) {
  if (!pidFilePath) {
    return {
      shouldFallback: true
    };
  }

  try {
    const pid = Number((await resolvedFs.promises.readFile(pidFilePath, 'utf8')).trim());

    return tryShutdownUsingPid(resolvedProcess, pid, platform);
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

function tryShutdownUsingManagedProcess(resolvedProcess, mongoProcess, platform) {
  if (!mongoProcess || !mongoProcess.pid) {
    return {
      shouldFallback: true
    };
  }

  try {
    return tryShutdownUsingPid(resolvedProcess, mongoProcess.pid, platform);
  } catch (err) {
    if (err && err.code === 'ESRCH') {
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
  const resolvedPlatform = resolvedDependencies.platform || resolvedProcess.platform || process.platform;
  const resolvedTimeouts = Object.assign({
    startupMs: DEFAULT_STARTUP_TIMEOUT_MS,
    shutdownMs: DEFAULT_SHUTDOWN_TIMEOUT_MS
  }, resolvedDependencies.timeouts || {});
  const state = resolvedDependencies.state || {
    mongoProcess: undefined
  };

  function observeMongoProcess(mongoProcess, options) {
    return new Promise(function (resolve, reject) {
      if (!mongoProcess) {
        reject(options.createMissingProcessError());
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

        cleanupListener(mongoProcess.stderr, 'data', onStdErrData);
        cleanupListener(mongoProcess.stdout, 'data', onStdOutData);
        cleanupListener(mongoProcess, 'error', onProcessError);
        cleanupListener(mongoProcess, 'close', onProcessClose);

        if (typeof options.onFinalize === 'function') {
          options.onFinalize(error, result);
        }

        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }

      function invokeHandler(handler, value) {
        if (typeof handler !== 'function') {
          return;
        }

        try {
          handler(value, finalize);
        } catch (err) {
          finalize(err);
        }
      }

      function onStdErrData(data) {
        invokeHandler(options.onStdErrData, data);
      }

      function onStdOutData(data) {
        invokeHandler(options.onStdOutData, data);
      }

      function onProcessError(err) {
        invokeHandler(options.onProcessError, err);
      }

      function onProcessClose() {
        invokeHandler(options.onProcessClose);
      }

      mongoProcess.stderr.on('data', onStdErrData);
      mongoProcess.stdout.on('data', onStdOutData);
      mongoProcess.on('error', onProcessError);
      mongoProcess.on('close', onProcessClose);

      timeoutId = resolvedTimers.setTimeout(function () {
        if (typeof mongoProcess.kill === 'function') {
          mongoProcess.kill('SIGTERM');
        }

        finalize(options.createTimeoutError());
      }, options.timeoutMs);
    });
  }

  function createMongoProcess(command, args) {
    if (state.mongoProcess) {
      return Promise.resolve(state.mongoProcess.pid);
    }

    return new Promise(function (resolve, reject) {
      try {
        state.mongoProcess = resolvedChildProcess.spawn(command, args);
      } catch (err) {
        reject(err);
        return;
      }

      observeMongoProcess(state.mongoProcess, {
        timeoutMs: resolvedTimeouts.startupMs,
        createMissingProcessError: function () {
          return new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + 'child process could not be created');
        },
        createTimeoutError: function () {
          return new MongoError(ERROR_MESSAGE_MONGO_START_TIMEOUT);
        },
        onFinalize: function (error) {
          if (error) {
            state.mongoProcess = undefined;
          }
        },
        onStdErrData: function (err, finalize) {
          const message = err.toString();
          const unsupportedLegacyOptions = getUnsupportedLegacyOptions(message, args);

          if (unsupportedLegacyOptions.length > 0) {
            const error = new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + message);
            error.unsupportedLegacyOptions = unsupportedLegacyOptions;
            finalize(error);
            return;
          }

          finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + message));
        },
        onStdOutData: function (data, finalize) {
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
        },
        onProcessError: function (err, finalize) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + err.message));
        },
        onProcessClose: function (_event, finalize) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + 'process exited before startup completed'));
        }
      }).then(resolve, reject);
    });
  }

  async function shutdownMongoProcess(command, args, pidFilePath) {
    const pidFileResult = await tryShutdownUsingPidFile(resolvedFs, resolvedProcess, pidFilePath, resolvedPlatform);
    if (!pidFileResult.shouldFallback) {
      state.mongoProcess = undefined;
      return pidFileResult.successMessage;
    }

    if (resolvedPlatform !== 'linux') {
      const managedProcessResult = tryShutdownUsingManagedProcess(resolvedProcess, state.mongoProcess, resolvedPlatform);

      if (!managedProcessResult.shouldFallback) {
        state.mongoProcess = undefined;
        return managedProcessResult.successMessage;
      }

      throw new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN_PID_REQUIRED);
    }

    return new Promise(function (resolve, reject) {
      let cp;

      try {
        cp = resolvedChildProcess.spawn(command, args);
      } catch (err) {
        reject(err);
        return;
      }

      observeMongoProcess(cp, {
        timeoutMs: resolvedTimeouts.shutdownMs,
        createMissingProcessError: function () {
          return new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN);
        },
        createTimeoutError: function () {
          return new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN_TIMEOUT);
        },
        onFinalize: function (error) {
          if (!error) {
            state.mongoProcess = undefined;
          }
        },
        onStdErrData: function (err, finalize) {
          if (err.toString().indexOf(MESSAGE_MONGO_UNKNOWN_DB_PATH) >= 0) {
            finalize(new MongoError(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH));
          }
        },
        onStdOutData: function (data, finalize) {
          if (data.toString().indexOf(MESSAGE_MONGO_KILLING_PROCESS) >= 0) {
            finalize(undefined, SUCCESS_MESSAGE_MONGO_SHUTDOWN);
          }
        },
        onProcessError: function (err, finalize) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN + ': ' + err.message));
        },
        onProcessClose: function (_event, finalize) {
          finalize(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN + ': process exited before shutdown completed'));
        }
      }).then(resolve, reject);
    });
  }

  function start(binPath, port, noprealloc, nojournal, dbPath) {
    const command = getMongoExecutablePath(resolvedPath, binPath, resolvedPlatform);
    const mongoRuntimePaths = getMongoRuntimePaths(resolvedPath, dbPath, binPath);
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

    addDbPathArgument(args, mongoRuntimePaths);
    addPidFileArgument(args, mongoRuntimePaths);

    ensureDbPathExists(resolvedFs, mongoRuntimePaths);

    function startWithFallback(currentArgs) {
      return createMongoProcess(command, currentArgs).catch(function (err) {
        const unsupportedLegacyOptions = err && err.unsupportedLegacyOptions;

        if (!unsupportedLegacyOptions || unsupportedLegacyOptions.length === 0) {
          throw err;
        }

        const nextArgs = currentArgs.filter(function (arg) {
          return unsupportedLegacyOptions.indexOf(arg) === -1;
        });

        if (nextArgs.length === currentArgs.length) {
          throw err;
        }

        return startWithFallback(nextArgs);
      });
    }

    return startWithFallback(args);
  }

  function stop(binPath, dbPath) {
    const command = getMongoExecutablePath(resolvedPath, binPath, resolvedPlatform);
    const mongoRuntimePaths = getMongoRuntimePaths(resolvedPath, dbPath, binPath);
    const args = addDbPathArgument([], mongoRuntimePaths);

    args.push('--shutdown');

    return shutdownMongoProcess(command, args, mongoRuntimePaths.pidFilePath);
  }

  return {
    start: start,
    stop: stop
  };
}

const mongoService = createMongoService();

export { createMongoService };
export default mongoService;

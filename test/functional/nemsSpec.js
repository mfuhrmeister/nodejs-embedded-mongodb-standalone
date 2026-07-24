import net from 'net';
import os from 'os';
import path from 'path';

import nems from '../../lib/nems.js';
import testUtil from '../testUtil.js';

const
  SMOKE_TEST_ENABLED = process.env.NEMS_RUN_SMOKE === 'true',
  describeWhenEnabled = SMOKE_TEST_ENABLED ? describe : xdescribe,
  DEFAULT_SMOKE_VERSION = '6.0.8',
  SUCCESS_MESSAGE_MONGO_SHUTDOWN = 'The mongodb instance has been shutdown!';

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function deleteFolderWithRetry(targetPath) {
  let lastError;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      testUtil.deleteFolder(targetPath);
      return;
    } catch (err) {
      lastError = err;
      await wait(250);
    }
  }

  throw lastError;
}

function getFreePort() {
  return new Promise(function (resolve, reject) {
    const server = net.createServer();

    server.on('error', reject);
    server.listen(0, '127.0.0.1', function () {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : undefined;

      server.close(function (err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(port);
      });
    });
  });
}

function getSmokeVersion() {
  if (process.env.NEMS_SMOKE_VERSION) {
    return process.env.NEMS_SMOKE_VERSION;
  }

  if (process.platform === 'linux') {
    return '6.0.8';
  }

  return DEFAULT_SMOKE_VERSION;
}

describeWhenEnabled('nems smoke', function () {
  let originalTimeout;

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
  });

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it('should download extract start and stop mongo with spaces in paths', async function () {
    const version = getSmokeVersion();
    const baseDir = path.join(os.tmpdir(), 'nems smoke test');
    const downloadDir = path.join(baseDir, 'download dir');
    const dbPath = path.join(baseDir, 'db path');
    const port = await getFreePort();
    let extractionPath;
    let stopMessage;

    await deleteFolderWithRetry(baseDir);
    testUtil.createFolder(downloadDir);

    try {
      extractionPath = await nems.distribute(version, downloadDir);
      expect(extractionPath).toContain(downloadDir);
      expect(extractionPath).toContain(version);

      const pid = await nems.startMongo(path.join(extractionPath, 'bin'), port, true, true, dbPath);
      expect(pid).toBeDefined();

      stopMessage = await nems.stop(path.join(extractionPath, 'bin'), dbPath);
      expect(stopMessage).toEqual(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
    } finally {
      if (extractionPath && stopMessage !== SUCCESS_MESSAGE_MONGO_SHUTDOWN) {
        try {
          await nems.stop(path.join(extractionPath, 'bin'), dbPath);
        } catch (err) {
          // Best-effort cleanup so a failed smoke test does not leave mongod behind.
        }
      }

      await deleteFolderWithRetry(baseDir);
    }
  });
});

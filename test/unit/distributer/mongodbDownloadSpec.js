import events from 'events';
import path from 'path';

import { createMongodbDownload } from '../../../lib/distributer/mongodbDownload.js';

function createFileStreamMock() {
  const stream = new events.EventEmitter();

  stream.close = jasmine.createSpy('close').and.callFake(function (callback) {
    if (callback) {
      callback();
    }
  });

  return stream;
}

function createRequestMock() {
  const request = new events.EventEmitter();
  let timeoutCallback;

  request.destroy = jasmine.createSpy('destroy');
  request.setTimeout = jasmine.createSpy('setTimeout').and.callFake(function (_timeoutMs, callback) {
    timeoutCallback = callback;
  });
  request.triggerTimeout = function () {
    if (timeoutCallback) {
      timeoutCallback();
    }
  };

  return request;
}

function createResponseMock(statusCode, headers) {
  const response = new events.EventEmitter();

  response.statusCode = statusCode;
  response.headers = headers || {};
  response.pipe = jasmine.createSpy('pipe');

  return response;
}

function flushPromises() {
  return new Promise(function (resolve) {
    setImmediate(resolve);
  });
}

function createEnoentError() {
  const err = new Error('not found');
  err.code = 'ENOENT';
  return err;
}

describe('mongodbDownload', function () {

  let
    underTest,
    downloadToFile,
    getLinuxDistroSuffix,
    fsMock,
    httpsMock,
    getosMock;

  beforeEach(function () {
    fsMock = {
      promises: {
        stat: jasmine.createSpy('fs.promises.stat').and.callFake(function () {
          return Promise.reject(createEnoentError());
        }),
        mkdir: jasmine.createSpy('fs.promises.mkdir').and.returnValue(Promise.resolve()),
        unlink: jasmine.createSpy('fs.promises.unlink').and.returnValue(Promise.resolve()),
        rename: jasmine.createSpy('fs.promises.rename').and.returnValue(Promise.resolve())
      },
      createWriteStream: jasmine.createSpy('fs.createWriteStream')
    };

    httpsMock = {
      get: jasmine.createSpy('https.get')
    };

    getosMock = jasmine.createSpy('getos');

    underTest = createMongodbDownload({
      fs: fsMock,
      https: httpsMock,
      getos: getosMock
    });

    downloadToFile = underTest.downloadToFile;
    getLinuxDistroSuffix = underTest.getLinuxDistroSuffix;
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  describe('downloadToFile', function () {

    it('should follow redirects and resolve relative redirect locations', async function () {
      const firstFile = createFileStreamMock();
      const secondFile = createFileStreamMock();
      const firstRequest = createRequestMock();
      const secondRequest = createRequestMock();
      const firstResponse = createResponseMock(302, { location: '/redirected/file.tgz' });
      const secondResponse = createResponseMock(200);
      let promise;

      fsMock.createWriteStream.and.returnValues(firstFile, secondFile);
      httpsMock.get
        .withArgs(jasmine.objectContaining({
          protocol: 'https:',
          hostname: 'fastdl.mongodb.org',
          path: '/linux/original.tgz'
        }), jasmine.any(Function))
        .and.callFake(function (_options, callback) {
          callback(firstResponse);
          return firstRequest;
        });
      httpsMock.get
        .withArgs(jasmine.objectContaining({
          protocol: 'https:',
          hostname: 'fastdl.mongodb.org',
          path: '/redirected/file.tgz'
        }), jasmine.any(Function))
        .and.callFake(function (_options, callback) {
          callback(secondResponse);
          return secondRequest;
        });

      promise = downloadToFile(
        'https://fastdl.mongodb.org/linux/original.tgz',
        '/tmp/file.tgz.in_progress',
        '/tmp/file.tgz'
      );

      await flushPromises();
      secondFile.emit('finish');

      expect(await promise).toEqual('/tmp/file.tgz');
      expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      expect(fsMock.promises.rename).toHaveBeenCalledWith('/tmp/file.tgz.in_progress', '/tmp/file.tgz');
      expect(secondResponse.pipe).toHaveBeenCalledWith(secondFile);
    });

    it('should reject when the download status is not 200', async function () {
      const request = createRequestMock();
      const response = createResponseMock(500);
      const file = createFileStreamMock();

      fsMock.createWriteStream.and.returnValue(file);
      httpsMock.get.and.callFake(function (_options, callback) {
        callback(response);
        return request;
      });

      try {
        await downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toEqual(new Error('download failed with status 500'));
        expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      }
    });

    it('should reject when the request emits an error', async function () {
      const request = createRequestMock();
      const expectedError = new Error('network failure');
      const file = createFileStreamMock();
      let promise;

      fsMock.createWriteStream.and.returnValue(file);
      httpsMock.get.and.returnValue(request);

      promise = downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
      request.emit('error', expectedError);

      try {
        await promise;
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toBe(expectedError);
        expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      }
    });

    it('should reject when the response emits an error', async function () {
      const request = createRequestMock();
      const response = createResponseMock(200);
      const file = createFileStreamMock();
      const expectedError = new Error('stream failure');
      let promise;

      fsMock.createWriteStream.and.returnValue(file);
      httpsMock.get.and.callFake(function (_options, callback) {
        callback(response);
        return request;
      });

      promise = downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
      response.emit('error', expectedError);

      try {
        await promise;
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toBe(expectedError);
        expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      }
    });

    it('should reject when the redirect limit is exceeded', async function () {
      const request = createRequestMock();
      const response = createResponseMock(302, { location: '/redirected/file.tgz' });

      fsMock.createWriteStream.and.returnValue(createFileStreamMock());
      httpsMock.get.and.callFake(function (_options, callback) {
        callback(response);
        return request;
      });

      try {
        await downloadToFile(
          'https://fastdl.mongodb.org/linux/file.tgz',
          '/tmp/file.tgz.in_progress',
          '/tmp/file.tgz',
          undefined,
          { redirectCount: 0, maxRedirects: 0 }
        );
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toEqual(new Error('download failed: too many redirects'));
        expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      }
    });

    it('should reject when the request times out', async function () {
      const request = createRequestMock();
      let promise;

      fsMock.createWriteStream.and.returnValue(createFileStreamMock());
      httpsMock.get.and.returnValue(request);

      promise = downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
      request.triggerTimeout();

      try {
        await promise;
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toEqual(new Error('download timed out after 30000ms'));
        expect(request.destroy).toHaveBeenCalled();
        expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      }
    });

    it('should use a custom timeout from http options', async function () {
      const request = createRequestMock();
      let promise;

      fsMock.createWriteStream.and.returnValue(createFileStreamMock());
      httpsMock.get.and.returnValue(request);

      promise = downloadToFile(
        'https://fastdl.mongodb.org/linux/file.tgz',
        '/tmp/file.tgz.in_progress',
        '/tmp/file.tgz',
        { timeout: 1234 }
      );
      request.triggerTimeout();

      try {
        await promise;
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(request.setTimeout).toHaveBeenCalledWith(1234, jasmine.any(Function));
        expect(err).toEqual(new Error('download timed out after 1234ms'));
      }
    });

    it('should remove the temp file when rename fails', async function () {
      const request = createRequestMock();
      const response = createResponseMock(200);
      const file = createFileStreamMock();
      const expectedError = new Error('rename failure');
      let promise;

      fsMock.promises.rename.and.returnValue(Promise.reject(expectedError));
      fsMock.createWriteStream.and.returnValue(file);
      httpsMock.get.and.callFake(function (_options, callback) {
        callback(response);
        return request;
      });

      promise = downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
      file.emit('finish');

      try {
        await promise;
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toBe(expectedError);
        expect(fsMock.promises.unlink).toHaveBeenCalledWith('/tmp/file.tgz.in_progress');
      }
    });
  });

  describe('mongodbDownload', function () {

    describe('getLinuxDistroSuffix', function () {

      function mockOsInfo(err, osInfo) {
        getosMock.and.callFake(function (callback) {
          callback(err, osInfo);
        });
      }

      it('should resolve ubuntu 22 to the ubuntu1404 suffix', async function () {
        mockOsInfo(null, {
          dist: 'Ubuntu',
          release: '22.04'
        });

        expect(await getLinuxDistroSuffix()).toEqual('-ubuntu1404');
      });

      it('should resolve elementary OS to the ubuntu1404 suffix', async function () {
        mockOsInfo(null, {
          dist: 'elementary OS',
          release: '7.1'
        });

        expect(await getLinuxDistroSuffix()).toEqual('-ubuntu1404');
      });

      it('should resolve fedora 20 to the rhel70 suffix', async function () {
        mockOsInfo(null, {
          dist: 'Fedora',
          release: '20'
        });

        expect(await getLinuxDistroSuffix()).toEqual('-rhel70');
      });

      it('should reject when getos fails', async function () {
        const expectedError = new Error('os detection failed');

        mockOsInfo(expectedError);

        try {
          await getLinuxDistroSuffix();
          throw new Error('Expected getLinuxDistroSuffix to reject');
        } catch (err) {
          expect(err).toBe(expectedError);
        }
      });
    });

    it('should reject if version is missing', async function () {
      try {
        await underTest({
          platform: 'win32',
          arch: 'x64'
        });
        throw new Error('Expected mongodbDownload to reject');
      } catch (err) {
        expect(err).toEqual(new Error('missing version'));
      }
    });

    it('should return the cached file when it already exists', async function () {
      const expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-win32-x86_64-3.2.8.zip');

      fsMock.promises.stat.and.returnValue(Promise.resolve({}));

      expect(await underTest({
        version: '3.2.8',
        platform: 'win32',
        arch: 'x64',
        download_dir: '/tmp/downloads'
      })).toEqual(expectedFile);

      expect(fsMock.promises.mkdir).toHaveBeenCalledWith(path.resolve('/tmp/downloads', 'mongodb-download'), { recursive: true });
      expect(httpsMock.get).not.toHaveBeenCalled();
    });

    it('should include the macOS arm64 archive name in the cached file path', async function () {
      const expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-macos-arm64-6.0.8.tgz');

      fsMock.promises.stat.and.returnValue(Promise.resolve({}));

      expect(await underTest({
        version: '6.0.8',
        platform: 'darwin',
        arch: 'arm64',
        download_dir: '/tmp/downloads'
      })).toEqual(expectedFile);

      expect(httpsMock.get).not.toHaveBeenCalled();
    });

    it('should include the newer macOS x64 archive name for MongoDB 6+', async function () {
      const expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-macos-x86_64-6.0.8.tgz');

      fsMock.promises.stat.and.returnValue(Promise.resolve({}));

      expect(await underTest({
        version: '6.0.8',
        platform: 'darwin',
        arch: 'x64',
        download_dir: '/tmp/downloads'
      })).toEqual(expectedFile);

      expect(httpsMock.get).not.toHaveBeenCalled();
    });

    it('should reject old MongoDB versions on macOS arm64', async function () {
      try {
        await underTest({
          version: '2.4.9',
          platform: 'darwin',
          arch: 'arm64',
          download_dir: '/tmp/downloads'
        });
        throw new Error('Expected mongodbDownload to reject');
      } catch (err) {
        expect(err).toEqual(new Error('unsupported MongoDB version for macOS arm64, use version 6.0.0 or newer'));
      }
    });

    it('should include the linux distro suffix in the cached file path', async function () {
      const expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-linux-x86_64-ubuntu1404-3.2.8.tgz');

      fsMock.promises.stat.and.returnValue(Promise.resolve({}));
      getosMock.and.callFake(function (callback) {
        callback(null, {
          dist: 'Ubuntu',
          release: '20.04'
        });
      });

      expect(await underTest({
        version: '3.2.8',
        platform: 'linux',
        arch: 'x64',
        download_dir: '/tmp/downloads'
      })).toEqual(expectedFile);

      expect(httpsMock.get).not.toHaveBeenCalled();
    });
  });
});

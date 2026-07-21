'use strict';

var
  events = require('events'),
  path = require('path'),
  rewire = require('rewire');

function createFileStreamMock() {
  var stream = new events.EventEmitter();

  stream.close = jasmine.createSpy('close').and.callFake(function (callback) {
    if (callback) {
      callback();
    }
  });

  return stream;
}

function createResponseMock(statusCode, headers) {
  var response = new events.EventEmitter();

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
  var err = new Error('not found');
  err.code = 'ENOENT';
  return err;
}

describe('mongodbDownload', function () {

  var
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

    underTest = rewire('../../../lib/distributer/mongodbDownload.js');
    underTest.__set__('fs', fsMock);
    underTest.__set__('https', httpsMock);
    underTest.__set__('getos', getosMock);

    downloadToFile = underTest.__get__('downloadToFile');
    getLinuxDistroSuffix = underTest.__get__('getLinuxDistroSuffix');
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  describe('downloadToFile', function () {

    it('should follow redirects and resolve relative redirect locations', async function () {
      var firstFile = createFileStreamMock();
      var secondFile = createFileStreamMock();
      var firstRequest = new events.EventEmitter();
      var secondRequest = new events.EventEmitter();
      var firstResponse = createResponseMock(302, { location: '/redirected/file.tgz' });
      var secondResponse = createResponseMock(200);
      var promise;

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
      var request = new events.EventEmitter();
      var response = createResponseMock(500);

      fsMock.createWriteStream.and.returnValue(createFileStreamMock());
      httpsMock.get.and.callFake(function (_options, callback) {
        callback(response);
        return request;
      });

      try {
        await downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toEqual(new Error('download failed with status 500'));
      }
    });

    it('should reject when the request emits an error', async function () {
      var request = new events.EventEmitter();
      var expectedError = new Error('network failure');
      var promise;

      fsMock.createWriteStream.and.returnValue(createFileStreamMock());
      httpsMock.get.and.returnValue(request);

      promise = downloadToFile('https://fastdl.mongodb.org/linux/file.tgz', '/tmp/file.tgz.in_progress', '/tmp/file.tgz');
      request.emit('error', expectedError);

      try {
        await promise;
        throw new Error('Expected downloadToFile to reject');
      } catch (err) {
        expect(err).toBe(expectedError);
      }
    });

    it('should reject when the response emits an error', async function () {
      var request = new events.EventEmitter();
      var response = createResponseMock(200);
      var file = createFileStreamMock();
      var expectedError = new Error('stream failure');
      var promise;

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
        var expectedError = new Error('os detection failed');

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
      var expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-win32-x86_64-3.2.8.zip');

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
      var expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-macos-arm64-6.0.8.tgz');

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
      var expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-macos-x86_64-6.0.8.tgz');

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
      var expectedFile = path.resolve('/tmp/downloads', 'mongodb-download', 'mongodb-linux-x86_64-ubuntu1404-3.2.8.tgz');

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

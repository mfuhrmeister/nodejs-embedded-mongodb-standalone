'use strict';

const createNems = require('../../lib/nems.js').createNems;

describe('index', function () {

  let
    underTest,
    downloadServiceMock,
    extractionServiceMock,
    mongoServiceMock,

    ANY_VERSION = 'ANY_VERSION',
    ANY_DOWNLOAD_DIR = 'ANY_DOWNLOAD_DIR',
    ANY_BIN_PATH = 'ANY_BIN_PATH',
    ANY_DB_PATH = 'ANY_DB_PATH',
    ANY_PORT = 'ANY_PORT',
    ANY_FILE = 'ANY_FILE',
    ANY_PID = 'ANY_PID';

  beforeEach(function () {
    downloadServiceMock = jasmine.createSpyObj('downloadService', ['download']);
    downloadServiceMock.download.and.returnValue(Promise.resolve(ANY_FILE));

    extractionServiceMock = jasmine.createSpyObj('extractionService', ['extract']);
    extractionServiceMock.extract.and.returnValue(Promise.resolve(ANY_DOWNLOAD_DIR));

    mongoServiceMock = jasmine.createSpyObj('mongoService', ['start', 'stop']);
    mongoServiceMock.start.and.returnValue(Promise.resolve(ANY_PID));
    mongoServiceMock.stop.and.returnValue(Promise.resolve());

    underTest = createNems({
      downloadService: downloadServiceMock,
      extractionService: extractionServiceMock,
      mongoService: mongoServiceMock
    });
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  function testDownload(value) {
    describe(value, function () {
      it('should reject a promise if download fails', function (done) {
        const expectedError = new Error('any download error');
        downloadServiceMock.download.and.returnValue(Promise.reject(expectedError));

        underTest[value]().then(function () {
          done.fail('Error should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(expectedError);
          done();
        });
      });

      it('should call download on downloadService', function (done) {
        underTest[value](ANY_VERSION, ANY_DOWNLOAD_DIR).then(function () {
          expect(downloadServiceMock.download).toHaveBeenCalledWith(ANY_VERSION, ANY_DOWNLOAD_DIR);
          done();
        });
      });
    });
  }

  ['distribute', 'download'].forEach(function (value) {
    testDownload(value);
  });


  describe('extract', function () {

    it('should call extract', function (done) {
      underTest.extract(ANY_FILE, ANY_VERSION, ANY_DOWNLOAD_DIR).then(function (path) {
        expect(extractionServiceMock.extract).toHaveBeenCalledWith(ANY_FILE, ANY_VERSION, ANY_DOWNLOAD_DIR);
        expect(path).toEqual(ANY_DOWNLOAD_DIR);
        done();
      });
    });
  });

  function testExtractionError(value) {
    describe(value, function () {
      it('should reject a promise if extraction fails', function (done) {
        const expectedError = new Error('any extraction error');
        extractionServiceMock.extract.and.returnValue(Promise.reject(expectedError));

        underTest[value]().then(function () {
          done.fail('Error should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
  }

  ['distribute', 'extract'].forEach(function (value) {
    testExtractionError(value);
  });

  describe('startMongo', function () {
    it('should reject a promise if start of mongoService fails', function (done) {
      const expectedError = new Error('any startMongo error');
      mongoServiceMock.start.and.returnValue(Promise.reject(expectedError));

      underTest.startMongo().then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should call start of mongoService', function (done) {
      underTest.startMongo(ANY_BIN_PATH, ANY_PORT, true, true, ANY_DB_PATH).then(function () {
        expect(mongoServiceMock.start).toHaveBeenCalledWith(ANY_BIN_PATH, ANY_PORT, true, true, ANY_DB_PATH);
        done();
      });
    });
  });

  describe('start', function () {
    it('should reject a promise if any service failed', function (done) {
      const expectedError = new Error('any error');
      downloadServiceMock.download.and.returnValue(Promise.reject(expectedError));

      underTest.start().then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should call all services and return the process id', function (done) {
      const expectedBinPath = ANY_DOWNLOAD_DIR + '/bin';

      underTest.start(ANY_VERSION, ANY_DOWNLOAD_DIR, ANY_PORT, true, true, ANY_DB_PATH).then(function (pid) {
        expect(downloadServiceMock.download).toHaveBeenCalledWith(ANY_VERSION, ANY_DOWNLOAD_DIR);
        expect(extractionServiceMock.extract).toHaveBeenCalledWith(ANY_FILE, ANY_VERSION, ANY_DOWNLOAD_DIR);
        expect(mongoServiceMock.start).toHaveBeenCalledWith(expectedBinPath, ANY_PORT, true, true, ANY_DB_PATH);
        expect(pid).toEqual(ANY_PID);
        done();
      }).catch(function () {
        done.fail('call all services and return the process id should have been resolved');
      });
    });
  });

  describe('stop', function () {
    it('should call stop of mongoService with binPath and dbPath', function (done) {
      underTest.stop(ANY_BIN_PATH, ANY_DB_PATH).then(function () {
        expect(mongoServiceMock.stop).toHaveBeenCalledWith(ANY_BIN_PATH, ANY_DB_PATH);
        done();
      });
    });

    it('should reject a promise if mongo service failed', function (done) {
      const expectedError = new Error('any error');
      mongoServiceMock.stop.and.returnValue(Promise.reject(expectedError));

      underTest.stop().then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });
  });

});

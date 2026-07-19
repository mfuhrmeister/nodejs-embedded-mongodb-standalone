'use strict';

var
  os = require('os'),
  path = require('path'),
  rewire = require('rewire'),
  Promise = require('bluebird'),

  ANY_VALID_FILE = 'ANY_VALID_FILE.zip',
  ANY_VALID_TAR_FILE = 'ANY_VALID_FILE.tar',
  ANY_VALID_TGZ_FILE = 'ANY_VALID_FILE.tgz',
  ANY_VALID_FILE_PATH = 'ANY_VALID_FILE_PATH',
  ANY_VALID_VERSION = 'ANY_VALID_VERSION',
  ANY_EXTRACTION_BASE_DIR = 'ANY_EXTRACTION_BASE_DIR',
  ANY_EXTRACTION_DIR = 'ANY_EXTRACTION_DIR',
  ANY_INVALID_ARCH_TYPE = 'ANY_INVALID_ARCH_TYPE',
  ANY_FILE_ERROR_MESSAGE = 'ANY_FILE_ERROR_MESSAGE',
  ANY_VERSION_ERROR_MESSAGE = 'ANY_VERSION_ERROR_MESSAGE',
  ANY_ARCH_TYPE_ERROR_MESSAGE = 'ANY_ARCH_TYPE_ERROR_MESSAGE';

function createDecompressMock() {
  return jasmine.createSpy('extractZip').and.returnValue(Promise.resolve());
}

describe('extractionService', function () {

  var
    underTest,
    extractZipMock,
    tarMock,
    ensureDirMock;

  beforeEach(function () {
    underTest = rewire('../../../lib/distributer/extractionService.js');

    extractZipMock = createDecompressMock();
    tarMock = {
      x: jasmine.createSpy('tar.x').and.returnValue(Promise.resolve())
    };
    ensureDirMock = jasmine.createSpy('ensureDir').and.returnValue(Promise.resolve());

    underTest.__set__('extractZip', extractZipMock);
    underTest.__set__('tar', tarMock);
    underTest.__set__('ensureDir', ensureDirMock);
    underTest.__set__('ExtractionError', Error);
    underTest.__set__('DEFAULT_EXTRACTION_DIR', ANY_EXTRACTION_DIR);
    underTest.__set__('ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION', ANY_FILE_ERROR_MESSAGE);
    underTest.__set__('ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION', ANY_VERSION_ERROR_MESSAGE);
    underTest.__set__('ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE', ANY_ARCH_TYPE_ERROR_MESSAGE);
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  function testForInvalidFile(invalidFile) {
    it('should throw an error if given file (' + invalidFile + ') is invalid', function (done) {
      var expectedError = new Error(ANY_FILE_ERROR_MESSAGE);

      underTest.extract(invalidFile).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });
  }

  function testForInvalidVersion(invalidVersion) {
    it('should throw an error if given version (' + invalidVersion + ') is invalid', function (done) {
      var expectedError = new Error(ANY_VERSION_ERROR_MESSAGE);

      underTest.extract(ANY_VALID_FILE, invalidVersion).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });
  }

  [null, undefined, ''].forEach(testForInvalidFile);
  [null, undefined, ''].forEach(testForInvalidVersion);

  describe('extract', function() {

    it('should call extractZip with default extraction directory and options for zip files', function (done) {
      var
        expectedExtractionPath = path.join(os.tmpdir(), ANY_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        expect(ensureDirMock).toHaveBeenCalledWith(path.resolve(expectedExtractionPath));
        expect(extractZipMock).toHaveBeenCalledWith(ANY_VALID_FILE, { dir: path.resolve(expectedExtractionPath) });
        done();
      });
    });

    it('should call tar.x with strip for tar files', function (done) {
      var
        expectedExtractionPath = path.join(ANY_EXTRACTION_BASE_DIR, ANY_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_TAR_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        expect(ensureDirMock).toHaveBeenCalledWith(path.resolve(expectedExtractionPath));
        expect(tarMock.x).toHaveBeenCalledWith(jasmine.objectContaining({
          file: ANY_VALID_TAR_FILE,
          cwd: path.resolve(expectedExtractionPath),
          strip: 1,
          gzip: false,
          preservePaths: false,
          filter: jasmine.any(Function)
        }));
        done();
      });
    });

    it('should call tar.x with gzip for tgz files', function (done) {
      var
        expectedExtractionPath = path.join(ANY_EXTRACTION_BASE_DIR, ANY_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_TGZ_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        expect(tarMock.x).toHaveBeenCalledWith(jasmine.objectContaining({
          file: ANY_VALID_TGZ_FILE,
          cwd: path.resolve(expectedExtractionPath),
          strip: 1,
          gzip: true,
          preservePaths: false,
          filter: jasmine.any(Function)
        }));
        done();
      });
    });

    it('should throw an error if arch type is invalid', function (done) {
      var
        expectedError = new Error(ANY_ARCH_TYPE_ERROR_MESSAGE),
        file = [ANY_VALID_FILE_PATH, ANY_INVALID_ARCH_TYPE].join('.');

      underTest.extract(file, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should reject .tar.bz2 files', function (done) {
      var
        expectedError = new Error(ANY_ARCH_TYPE_ERROR_MESSAGE),
        file = [ANY_VALID_FILE_PATH, 'tar.bz2'].join('.');

      underTest.extract(file, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should catch an extractZip error', function (done) {
      var expectedError = new Error('any extraction error');
      extractZipMock.and.callFake(function () {
        return Promise.reject(expectedError);
      });

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should catch a tar.x error', function (done) {
      var expectedError = new Error('any extraction error');
      tarMock.x.and.callFake(function () {
        return Promise.reject(expectedError);
      });

      underTest.extract(ANY_VALID_TAR_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should resolve with extraction directory', function (done) {
      var
        expectedExtractionPath = path.join(ANY_EXTRACTION_BASE_DIR, ANY_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function (path) {
        expect(path).toEqual(expectedExtractionPath);
        done();
      });
    });
  });
});

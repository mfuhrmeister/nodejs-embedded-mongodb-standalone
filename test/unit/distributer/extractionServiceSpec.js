'use strict';

var
  os = require('os'),
  rewire = require('rewire'),
  Promise = require('bluebird'),

  ANY_VALID_FILE = 'ANY_VALID_FILE.zip',
  ANY_VALID_FILE_PATH = 'ANY_VALID_FILE_PATH',
  ANY_VALID_VERSION = 'ANY_VALID_VERSION',
  ANY_EXTRACTION_BASE_DIR = 'ANY_EXTRACTION_BASE_DIR',
  ANY_EXTRACTION_DIR = 'ANY_EXTRACTION_DIR',
  ANY_INVALID_ARCH_TYPE = 'ANY_INVALID_ARCH_TYPE',
  ANY_FILE_ERROR_MESSAGE = 'ANY_FILE_ERROR_MESSAGE',
  ANY_VERSION_ERROR_MESSAGE = 'ANY_VERSION_ERROR_MESSAGE',
  ANY_ARCH_TYPE_ERROR_MESSAGE = 'ANY_ARCH_TYPE_ERROR_MESSAGE';

function createDecompressMock() {
  var decompressMock = jasmine.createSpy('Decompress').and.callFake(function (file, dest, options) {
    return Promise.resolve([{ path: 'extracted_file' }]);
  });
  return decompressMock;
}

describe('extractionService', function () {

  var
    underTest,
    decompressMock;

  beforeEach(function () {
    underTest = rewire('../../../lib/distributer/extractionService.js');

    decompressMock = createDecompressMock();

    underTest.__set__('Decompress', decompressMock);
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

  describe('decompress', function() {

    it('should call Decompress with default extraction directory and options', function (done) {
      var
        expectedExtractionPath = [os.tmpdir(), ANY_EXTRACTION_DIR, ANY_VALID_VERSION].join('/');

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        expect(decompressMock).toHaveBeenCalledWith(ANY_VALID_FILE, expectedExtractionPath, { strip: 1 });
        done();
      });
    });

    it('should call Decompress with given extraction directory and options', function (done) {
      var
        expectedExtractionPath = [ANY_EXTRACTION_BASE_DIR, ANY_EXTRACTION_DIR, ANY_VALID_VERSION].join('/');

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        expect(decompressMock).toHaveBeenCalledWith(ANY_VALID_FILE, expectedExtractionPath, { strip: 1 });
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

    it('should catch a decompress error', function (done) {
      var expectedError = new Error('any decompress error');
      decompressMock.and.returnValue(Promise.reject(expectedError));

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should resolve with extraction directory', function (done) {
      var
        expectedExtractionPath = [ANY_EXTRACTION_BASE_DIR, ANY_EXTRACTION_DIR, ANY_VALID_VERSION].join('/');

      decompressMock.and.returnValue(Promise.resolve([{ path: 'extracted_file' }]));

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function (path) {
        expect(path).toEqual(expectedExtractionPath);
        done();
      });
    });
  });
});
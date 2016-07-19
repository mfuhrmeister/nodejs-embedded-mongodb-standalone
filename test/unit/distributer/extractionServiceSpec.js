'use strict';

var
  os = require('os'),
  rewire = require('rewire'),

  DECOMPRESS_MODE_OPTIONS = {mode: 755},
  DECOMPRESS_ARCH_OPTIONS = {strip:1},
  DECOMPRESS_ARCH_PLUGIN = 'DECOMPRESS_ARCH_PLUGIN',

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
  var decompressMock = jasmine.createSpy('Decompress');
  decompressMock.and.returnValue(decompressMock);
  decompressMock.src = decompressMock.dest = decompressMock.use = jasmine.createSpy('decompressInstanceFunctions');
  decompressMock.src.and.returnValue(decompressMock);
  decompressMock.run = jasmine.createSpy('decompressInstanceFunctions');
  decompressMock.run.and.callFake(function (cb) {
    cb(null, ANY_VALID_FILE);
  });
  decompressMock.zip = decompressMock.tar = decompressMock.targz = decompressMock.tarbz2 = jasmine.createSpy('decompressStaticFunctions');
  decompressMock.zip.and.returnValue(DECOMPRESS_ARCH_PLUGIN);

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

    it('should be called with file properties options', function (done) {
      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        expect(decompressMock).toHaveBeenCalledWith(DECOMPRESS_MODE_OPTIONS);
        done();
      });
    });

    it('should call "src" with file', function (done) {
      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        expect(decompressMock.src).toHaveBeenCalledWith(ANY_VALID_FILE);
        done();
      });
    });

    it('should call "dest" with default extraction directory', function (done) {
      var
        EXPECTED_EXTRACTION_PATH = [os.tmpdir(), ANY_EXTRACTION_DIR, ANY_VALID_VERSION].join('/');

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        expect(decompressMock.dest).toHaveBeenCalledWith(EXPECTED_EXTRACTION_PATH);
        done();
      });
    });

    it('should call "dest" with given extraction directory', function (done) {
      var
        expectedExtractionPath = [ANY_EXTRACTION_BASE_DIR, ANY_EXTRACTION_DIR, ANY_VALID_VERSION].join('/');

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        expect(decompressMock.dest).toHaveBeenCalledWith(expectedExtractionPath);
        done();
      });
    });

    it('should throw an error if arch type is invalid', function (done) {
      var
        expectedError = new Error(ANY_ARCH_TYPE_ERROR_MESSAGE),
        file = [ANY_VALID_FILE_PATH, ANY_INVALID_ARCH_TYPE].join('.');

      underTest.extract(file, ANY_VALID_VERSION, ANY_EXTRACTION_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    function testDecompressArch(archTypeObject) {
      it('should call the arch type corresponding decompress method for ' + archTypeObject.arch, function (done) {
        var
          file = [ANY_VALID_FILE_PATH, archTypeObject.arch].join('.');

        underTest.extract(file, ANY_VALID_VERSION, ANY_EXTRACTION_DIR).then(function () {
          expect(decompressMock[archTypeObject.expectedFunction]).toHaveBeenCalledWith(DECOMPRESS_ARCH_OPTIONS);
          done();
        });
      });
    }

    [
      {
        arch: 'zip',
        expectedFunction: 'zip'
      },
      {
        arch: 'tar',
        expectedFunction: 'tar'
      },
      {
        arch: 'gz',
        expectedFunction: 'targz'
      },
      {
        arch: 'tgz',
        expectedFunction: 'targz'
      },
      {
        arch: 'tar.gz',
        expectedFunction: 'targz'
      },
      {
        arch: 'tar.bz2',
        expectedFunction: 'tarbz2'
      }
    ].forEach(testDecompressArch);

    it('should call "use" with decompress arch type', function (done) {
      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_DIR).then(function () {
        expect(decompressMock.use).toHaveBeenCalledWith(DECOMPRESS_ARCH_PLUGIN);
        done();
      });
    });

    it('should call "run" with callback function', function (done) {
      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_DIR).then(function () {
        expect(decompressMock.run).toHaveBeenCalledWith(jasmine.any(Function));
        done();
      });
    });

    it('should catch a decompress error', function (done) {
      var expectedError = new Error('any decompress error');
      decompressMock.run.and.callFake(function (cb) {
        cb(expectedError);
      });

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err).toEqual(expectedError);
        done();
      });
    });

    it('should resolve with files', function (done) {
      var expectedFiles = 'any expected files';

      decompressMock.run.and.callFake(function (cb) {
        cb(null, expectedFiles);
      });

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_DIR).then(function (files) {
        expect(files).toEqual(expectedFiles);
        done();
      });
    });
  });
});
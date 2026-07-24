import os from 'os';
import path from 'path';

import { createExtractionService } from '../../../lib/distributer/extractionService.js';

const
  ANY_VALID_FILE = 'ANY_VALID_FILE.zip',
  ANY_VALID_TAR_FILE = 'ANY_VALID_FILE.tar',
  ANY_VALID_TGZ_FILE = 'ANY_VALID_FILE.tgz',
  ANY_VALID_FILE_PATH = 'ANY_VALID_FILE_PATH',
  ANY_VALID_VERSION = 'ANY_VALID_VERSION',
  ANY_EXTRACTION_BASE_DIR = 'ANY_EXTRACTION_BASE_DIR',
  ANY_INVALID_ARCH_TYPE = 'ANY_INVALID_ARCH_TYPE',
  DEFAULT_EXTRACTION_DIR = 'mongodb-download',
  ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION = 'missing file for extraction',
  ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION = 'missing version for extraction',
  ERROR_MESSAGE_TAR_ENTRY_LIMIT_EXCEEDED = 'tar extraction limits exceeded: too many entries',
  ERROR_MESSAGE_TAR_TOTAL_SIZE_LIMIT_EXCEEDED = 'tar extraction limits exceeded: total uncompressed size',
  ERROR_MESSAGE_ZIP_ENTRY_LIMIT_EXCEEDED = 'zip extraction limits exceeded: too many entries',
  ERROR_MESSAGE_ZIP_TOTAL_SIZE_LIMIT_EXCEEDED = 'zip extraction limits exceeded: total uncompressed size',
  ERROR_MESSAGE_ZIP_COMPRESSION_RATIO_LIMIT_EXCEEDED = 'zip extraction limits exceeded: compression ratio',
  ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE = 'invalid arch type';

function createDecompressMock() {
  return jasmine.createSpy('extractZip').and.returnValue(Promise.resolve());
}

describe('extractionService', function () {

  let
    underTest,
    extractZipMock,
    tarMock,
    ensureDirMock;

  beforeEach(function () {
    extractZipMock = createDecompressMock();
    tarMock = {
      x: jasmine.createSpy('tar.x').and.returnValue(Promise.resolve())
    };
    ensureDirMock = jasmine.createSpy('ensureDir').and.returnValue(Promise.resolve());

    underTest = createExtractionService({
      extractZip: extractZipMock,
      tar: tarMock,
      ensureDir: ensureDirMock
    });
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  function testForInvalidFile(invalidFile) {
    it('should throw an error if given file (' + invalidFile + ') is invalid', function (done) {
      underTest.extract(invalidFile).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION);
        done();
      });
    });
  }

  function testForInvalidVersion(invalidVersion) {
    it('should throw an error if given version (' + invalidVersion + ') is invalid', function (done) {
      underTest.extract(ANY_VALID_FILE, invalidVersion).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION);
        done();
      });
    });
  }

  [null, undefined, ''].forEach(testForInvalidFile);
  [null, undefined, ''].forEach(testForInvalidVersion);

  describe('extract', function () {

    it('should call extractZip with default extraction directory and options for zip files', function (done) {
      const expectedExtractionPath = path.join(os.tmpdir(), DEFAULT_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        expect(ensureDirMock).toHaveBeenCalledWith(path.resolve(expectedExtractionPath));
        expect(extractZipMock).toHaveBeenCalledWith(ANY_VALID_FILE, jasmine.objectContaining({
          dir: path.resolve(expectedExtractionPath),
          onEntry: jasmine.any(Function)
        }));
        done();
      });
    });

    it('should reject when the zip entry count limit is exceeded', function (done) {
      const expectedError = new Error(ERROR_MESSAGE_ZIP_ENTRY_LIMIT_EXCEEDED);
      extractZipMock.and.callFake(function (_file, options) {
        options.onEntry({ uncompressedSize: 1, compressedSize: 1 });
        options.onEntry({ uncompressedSize: 1, compressedSize: 1 });
        return Promise.resolve();
      });

      underTest = createExtractionService({
        extractZip: extractZipMock,
        tar: tarMock,
        ensureDir: ensureDirMock,
        zipLimits: { maxEntries: 1 }
      });

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(expectedError.message);
        expect(err.statusCode).toEqual(413);
        done();
      });
    });

    it('should reject when the total uncompressed zip size limit is exceeded', function (done) {
      const expectedError = new Error(ERROR_MESSAGE_ZIP_TOTAL_SIZE_LIMIT_EXCEEDED);
      extractZipMock.and.callFake(function (_file, options) {
        options.onEntry({ uncompressedSize: 10, compressedSize: 10 });
        options.onEntry({ uncompressedSize: 1, compressedSize: 1 });
        return Promise.resolve();
      });

      underTest = createExtractionService({
        extractZip: extractZipMock,
        tar: tarMock,
        ensureDir: ensureDirMock,
        zipLimits: { maxTotalUncompressedBytes: 10 }
      });

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(expectedError.message);
        expect(err.statusCode).toEqual(413);
        done();
      });
    });

    it('should reject when the zip compression ratio limit is exceeded', function (done) {
      const expectedError = new Error(ERROR_MESSAGE_ZIP_COMPRESSION_RATIO_LIMIT_EXCEEDED);
      extractZipMock.and.callFake(function (_file, options) {
        options.onEntry({ uncompressedSize: 10, compressedSize: 1 });
        return Promise.resolve();
      });

      underTest = createExtractionService({
        extractZip: extractZipMock,
        tar: tarMock,
        ensureDir: ensureDirMock,
        zipLimits: { maxCompressionRatio: 2 }
      });

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(expectedError.message);
        expect(err.statusCode).toEqual(413);
        done();
      });
    });

    it('should call tar.x with strip for tar files', function (done) {
      const expectedExtractionPath = path.join(ANY_EXTRACTION_BASE_DIR, DEFAULT_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_TAR_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        expect(ensureDirMock).toHaveBeenCalledWith(path.resolve(expectedExtractionPath));
        expect(tarMock.x).toHaveBeenCalledWith(jasmine.objectContaining({
          file: ANY_VALID_TAR_FILE,
          cwd: path.resolve(expectedExtractionPath),
          strip: 1,
          gzip: false,
          preservePaths: false,
          filter: jasmine.any(Function),
          onReadEntry: jasmine.any(Function),
          maxDecompressionRatio: 200
        }));
        done();
      });
    });

    it('should call tar.x with gzip for tgz files', function (done) {
      const expectedExtractionPath = path.join(ANY_EXTRACTION_BASE_DIR, DEFAULT_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_TGZ_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        expect(tarMock.x).toHaveBeenCalledWith(jasmine.objectContaining({
          file: ANY_VALID_TGZ_FILE,
          cwd: path.resolve(expectedExtractionPath),
          strip: 1,
          gzip: true,
          preservePaths: false,
          filter: jasmine.any(Function),
          onReadEntry: jasmine.any(Function),
          maxDecompressionRatio: 200
        }));
        done();
      });
    });

    it('should reject when the tar entry count limit is exceeded', function (done) {
      tarMock.x.and.callFake(function (options) {
        options.onReadEntry({ size: 1 });
        options.onReadEntry({ size: 1 });
        return Promise.resolve();
      });

      underTest = createExtractionService({
        extractZip: extractZipMock,
        tar: tarMock,
        ensureDir: ensureDirMock,
        tarLimits: { maxEntries: 1 }
      });

      underTest.extract(ANY_VALID_TAR_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(ERROR_MESSAGE_TAR_ENTRY_LIMIT_EXCEEDED);
        expect(err.statusCode).toEqual(413);
        done();
      });
    });

    it('should reject when the total uncompressed tar size limit is exceeded', function (done) {
      tarMock.x.and.callFake(function (options) {
        options.onReadEntry({ size: 10 });
        options.onReadEntry({ size: 1 });
        return Promise.resolve();
      });

      underTest = createExtractionService({
        extractZip: extractZipMock,
        tar: tarMock,
        ensureDir: ensureDirMock,
        tarLimits: { maxTotalUncompressedBytes: 10 }
      });

      underTest.extract(ANY_VALID_TAR_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(ERROR_MESSAGE_TAR_TOTAL_SIZE_LIMIT_EXCEEDED);
        expect(err.statusCode).toEqual(413);
        done();
      });
    });

    it('should throw an error if arch type is invalid', function (done) {
      const file = [ANY_VALID_FILE_PATH, ANY_INVALID_ARCH_TYPE].join('.');

      underTest.extract(file, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE);
        expect(err.statusCode).toEqual(400);
        done();
      });
    });

    it('should reject .tar.bz2 files', function (done) {
      const file = [ANY_VALID_FILE_PATH, 'tar.bz2'].join('.');

      underTest.extract(file, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(err.name).toEqual('ExtractionError');
        expect(err.message).toEqual(ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE);
        expect(err.statusCode).toEqual(400);
        done();
      });
    });

    it('should catch an extractZip error', function (done) {
      const expectedError = new Error('any extraction error');
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
      const expectedError = new Error('any extraction error');
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
      const expectedExtractionPath = path.join(ANY_EXTRACTION_BASE_DIR, DEFAULT_EXTRACTION_DIR, ANY_VALID_VERSION);

      underTest.extract(ANY_VALID_FILE, ANY_VALID_VERSION, ANY_EXTRACTION_BASE_DIR).then(function (path) {
        expect(path).toEqual(expectedExtractionPath);
        done();
      });
    });
  });
});

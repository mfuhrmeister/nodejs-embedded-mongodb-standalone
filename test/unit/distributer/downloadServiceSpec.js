import os from 'os';

import { createDownloadService } from '../../../lib/distributer/downloadService.js';

describe('downloadServiceSpec', function () {

  let
    underTest,
    mongodbDownloadMock,
    errorHandlerMock,

    ANY_VALID_VERSION = 'ANY_VALID_VERSION',
    ANY_DOWNLOAD_DIR = 'ANY_DOWNLOAD_DIR',
    ANY_VALID_DATA = 'ANY_VALID_DATA',
    ANY_ERROR_MESSAGE = 'ANY_ERROR_MESSAGE',
    ANY_ERROR = new Error(ANY_ERROR_MESSAGE);

  beforeEach(function () {
    mongodbDownloadMock = jasmine.createSpy('mongodbDownload');
    mongodbDownloadMock.and.returnValue(Promise.resolve(ANY_VALID_DATA));

    errorHandlerMock = jasmine.createSpyObj('errorHandlerMock', ['handleDownloadError']);
    errorHandlerMock.handleDownloadError.and.callFake(function (err) {
      throw err;
    });

    underTest = createDownloadService({
      mongodbDownload: mongodbDownloadMock,
      errorHandler: errorHandlerMock
    });
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  describe('download', function () {

    it('should be defined', function () {
      expect(underTest.download).toBeDefined();
    });

    it('should throw an error if mongodbDownload fails', function (done) {
      mongodbDownloadMock.and.returnValue(Promise.reject(ANY_ERROR));

      underTest.download().then(function () {
        done.fail('Error should have been caught');
      }).catch(function (err) {
        expect(errorHandlerMock.handleDownloadError).toHaveBeenCalledWith(ANY_ERROR);
        expect(err).toEqual(ANY_ERROR);
        done();
      });
    });

    it('should call mongodbDownload with default download directory', function (done) {
      const EXPECTED_OPTIONS = {version: ANY_VALID_VERSION, download_dir: os.tmpdir()};

      underTest.download(ANY_VALID_VERSION).then(function () {
        expect(mongodbDownloadMock).toHaveBeenCalledWith(EXPECTED_OPTIONS);
        done();
      });
    });

    it('should call mongodbDownload with download options', function (done) {
      const EXPECTED_OPTIONS = {version: ANY_VALID_VERSION, download_dir: ANY_DOWNLOAD_DIR};

      underTest.download(ANY_VALID_VERSION, ANY_DOWNLOAD_DIR).then(function () {
        expect(mongodbDownloadMock).toHaveBeenCalledWith(EXPECTED_OPTIONS);
        done();
      });
    });
  });
});

'use strict';

var
  promise = require('bluebird'),
  sprintf = require('sprintf-js').sprintf,
  logger = require('npmlog'),
  mongodbDownload = promise.promisify(require('mongodb-download')),
  errorHandler = require('../error/errorHandler'),

  INFO_MESSAGE_DOWNLOAD_STARTED = 'Starting download of mongodb %s to a mongodb-download directory under %s';

function download(version, downloadDir) {
  var downloadOptions = {
    version: version,
    download_dir: downloadDir
  };

  logger.info('nems', sprintf(INFO_MESSAGE_DOWNLOAD_STARTED, version, downloadDir));

  return mongodbDownload(downloadOptions).catch(errorHandler.handleDownloadError);
}

module.exports.download = download;
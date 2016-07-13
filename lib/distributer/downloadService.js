'use strict';

var
  os = require('os'),
  promise = require('bluebird'),
  sprintf = require('sprintf-js').sprintf,
  logger = require('npmlog'),
  mongodbDownload = promise.promisify(require('mongodb-download')),
  errorHandler = require('../error/errorHandler'),

  INFO_MESSAGE_DOWNLOAD_STARTED = 'Starting download of mongodb %s to a mongodb-download directory under %s';

function download(version, downloadDir) {
  var downloadOptions = {
    version: version,
    download_dir: (!!downloadDir) ? downloadDir : os.tmpdir()
  };
  
  logger.info('nems', sprintf(INFO_MESSAGE_DOWNLOAD_STARTED, downloadOptions.version, downloadOptions.download_dir));

  return mongodbDownload(downloadOptions).catch(errorHandler.handleDownloadError);
}

module.exports.download = download;
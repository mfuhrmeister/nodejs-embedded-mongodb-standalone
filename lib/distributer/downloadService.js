'use strict';

var
  os = require('os'),
  logger = require('../logger'),
  mongodbDownload = require('./mongodbDownload'),
  errorHandler = require('../error/errorHandler'),

  INFO_MESSAGE_DOWNLOAD_STARTED = 'Starting download of mongodb';

async function download(version, downloadDir) {
  var downloadOptions = {
    version: version,
    download_dir: (!!downloadDir) ? downloadDir : os.tmpdir()
  };
  
  logger.info('nems', `${INFO_MESSAGE_DOWNLOAD_STARTED} ${downloadOptions.version} to a mongodb-download directory under ${downloadOptions.download_dir}`);

  try {
    return await mongodbDownload(downloadOptions);
  } catch (err) {
    return errorHandler.handleDownloadError(err);
  }
}

module.exports.download = download;

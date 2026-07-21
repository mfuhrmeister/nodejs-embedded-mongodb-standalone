'use strict';

var
  os = require('os'),
  sprintf = require('sprintf-js').sprintf,
  logger = require('npmlog'),
  mongodbDownload = require('./mongodbDownload'),
  errorHandler = require('../error/errorHandler'),

  INFO_MESSAGE_DOWNLOAD_STARTED = 'Starting download of mongodb %s to a mongodb-download directory under %s';

async function download(version, downloadDir) {
  var downloadOptions = {
    version: version,
    download_dir: (!!downloadDir) ? downloadDir : os.tmpdir()
  };
  
  logger.info('nems', sprintf(INFO_MESSAGE_DOWNLOAD_STARTED, downloadOptions.version, downloadOptions.download_dir));

  try {
    return await mongodbDownload(downloadOptions);
  } catch (err) {
    return errorHandler.handleDownloadError(err);
  }
}

module.exports.download = download;

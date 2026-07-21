'use strict';

const
  os = require('os'),
  mongodbDownload = require('./mongodbDownload'),
  errorHandler = require('../error/errorHandler');

async function download(version, downloadDir) {
  const downloadOptions = {
    version: version,
    download_dir: (!!downloadDir) ? downloadDir : os.tmpdir()
  };

  try {
    return await mongodbDownload(downloadOptions);
  } catch (err) {
    return errorHandler.handleDownloadError(err);
  }
}

module.exports.download = download;

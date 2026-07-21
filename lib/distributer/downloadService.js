'use strict';

const
  os = require('os'),
  mongodbDownload = require('./mongodbDownload'),
  errorHandler = require('../error/errorHandler');

function createDownloadService(dependencies) {
  const resolvedDependencies = dependencies || {};
  const resolvedMongodbDownload = resolvedDependencies.mongodbDownload || mongodbDownload;
  const resolvedErrorHandler = resolvedDependencies.errorHandler || errorHandler;

  async function download(version, downloadDir) {
    const downloadOptions = {
      version: version,
      download_dir: (!!downloadDir) ? downloadDir : os.tmpdir()
    };

    try {
      return await resolvedMongodbDownload(downloadOptions);
    } catch (err) {
      return resolvedErrorHandler.handleDownloadError(err);
    }
  }

  return {
    download: download
  };
}

module.exports = createDownloadService();
module.exports.createDownloadService = createDownloadService;

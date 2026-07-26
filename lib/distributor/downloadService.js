import os from 'os';
import mongodbDownload from './mongodbDownload.js';
import errorHandler from '../error/errorHandler.js';

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

const downloadService = createDownloadService();

export { createDownloadService };
export default downloadService;

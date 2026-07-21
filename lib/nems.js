import downloadService from './distributer/downloadService.js';
import extractionService from './distributer/extractionService.js';
import mongoService from './process/mongoService.js';

function createNems(services) {
  const resolvedServices = services || {};
  const resolvedDownloadService = resolvedServices.downloadService || downloadService;
  const resolvedExtractionService = resolvedServices.extractionService || extractionService;
  const resolvedMongoService = resolvedServices.mongoService || mongoService;

  async function distribute(version, dir) {
    const file = await resolvedDownloadService.download(version, dir);
    return resolvedExtractionService.extract(file, version, dir);
  }

  function download(version, dir) {
    return resolvedDownloadService.download(version, dir);
  }

  function extract(file, version, dir) {
    return resolvedExtractionService.extract(file, version, dir);
  }

  function startMongo(binPath, port, noprealloc, nojournal, dbPath) {
    return resolvedMongoService.start(binPath, port, noprealloc, nojournal, dbPath);
  }

  async function start(version, dir, port, noprealloc, nojournal, dbPath) {
    const extractionPath = await distribute(version, dir);
    const binPath = extractionPath + '/bin';

    return resolvedMongoService.start(binPath, port, noprealloc, nojournal, dbPath);
  }

  function stop(binPath, dbPath) {
    return resolvedMongoService.stop(binPath, dbPath);
  }

  return {
    distribute: distribute,
    download: download,
    extract: extract,
    startMongo: startMongo,
    start: start,
    stop: stop
  };
}

const nems = createNems();

export { createNems };
export default nems;

import os from 'os';
import https from 'https';
import fs from 'fs';
import path from 'path';
import getos from 'getos';

const DOWNLOAD_BASE_URI = 'https://fastdl.mongodb.org';
const MINIMUM_MACOS_ARM64_MAJOR = 6;
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_DOWNLOAD_BYTES = 1024 * 1024 * 1024;
const ERROR_MESSAGE_TOO_MANY_REDIRECTS = 'download failed: too many redirects';

function getVersionMajor(version) {
  const major = Number(String(version).split('.')[0]);

  if (isNaN(major)) {
    return 0;
  }

  return major;
}

function getMongoPlatform(platform) {
  switch (platform) {
    case 'darwin':
      return 'osx';
    case 'win32':
      return 'win32';
    case 'linux':
      return 'linux';
    case 'elementary OS':
      return 'linux';
    case 'sunos':
      return 'sunos5';
    default:
      throw new Error('unsupported OS');
  }
}

function getMongoArch(platform, arch) {
  if (arch === 'ia32') {
    if (platform === 'linux') {
      return 'i686';
    }
    if (platform === 'win32') {
      return 'i386';
    }
    throw new Error('unsupported architecture');
  }
  if (arch === 'arm64') {
    if (platform === 'darwin') {
      return 'arm64';
    }
    throw new Error('unsupported architecture');
  }
  if (arch === 'x64') {
    return 'x86_64';
  }
  throw new Error('unsupported architecture, ia32, x64 and darwin arm64 are the only valid options');
}

function getArchiveExtension(mongoPlatform) {
  return mongoPlatform === 'win32' ? 'zip' : 'tgz';
}

function getMongoBaseName(mongoPlatform, mongoArch, version) {
  if (mongoPlatform !== 'osx') {
    return 'mongodb-' + mongoPlatform + '-' + mongoArch;
  }

  if (mongoArch === 'arm64') {
    if (getVersionMajor(version) < MINIMUM_MACOS_ARM64_MAJOR) {
      throw new Error('unsupported MongoDB version for macOS arm64, use version 6.0.0 or newer');
    }

    return 'mongodb-macos-arm64';
  }

  if (mongoArch === 'x86_64' && getVersionMajor(version) >= MINIMUM_MACOS_ARM64_MAJOR) {
    return 'mongodb-macos-x86_64';
  }

  return 'mongodb-osx-x86_64';
}

function createMongodbDownload(dependencies) {
  const resolvedDependencies = dependencies || {};
  const resolvedOs = resolvedDependencies.os || os;
  const resolvedHttps = resolvedDependencies.https || https;
  const resolvedFs = resolvedDependencies.fs || fs;
  const resolvedPath = resolvedDependencies.path || path;
  const resolvedGetos = resolvedDependencies.getos || getos;

  function getLinuxDistroSuffix() {
    return new Promise(function (resolve, reject) {
      resolvedGetos(function (err, osInfo) {
        if (err) {
          reject(err);
          return;
        }
        const dist = (osInfo && osInfo.dist) ? osInfo.dist : '';
        const release = (osInfo && osInfo.release) ? osInfo.release : '';
        let suffix = '';

        if (/ubuntu/i.test(dist)) {
          suffix = '-ubuntu';
          if (release === '14.04' || Number(release.split('.')[0]) > 14) {
            suffix += '1404';
          } else if (release === '12.04') {
            suffix += '1204';
          } else if (release === '14.10') {
            suffix += '1410-clang';
          }
        } else if (/elementary OS/i.test(dist)) {
          suffix = '-ubuntu1404';
        } else if (/suse/i.test(dist)) {
          suffix = '-suse';
          if (/^11/.test(release)) {
            suffix += '11';
          }
        } else if (/rhel/i.test(dist) || /centos/i.test(dist) || /scientific/i.test(dist)) {
          suffix = '-rhel';
          if (/^7/.test(release)) {
            suffix += '70';
          } else if (/^6/.test(release)) {
            suffix += '62';
          } else if (/^5/.test(release)) {
            suffix += '55';
          }
        } else if (/fedora/i.test(dist)) {
          suffix = '-rhel';
          const fedoraVersion = Number(release);
          if (fedoraVersion > 18) {
            suffix += '70';
          } else if (fedoraVersion < 19 && fedoraVersion >= 12) {
            suffix += '62';
          } else if (fedoraVersion < 12 && fedoraVersion >= 6) {
            suffix += '55';
          }
        } else if (/debian/i.test(dist)) {
          suffix = '-debian';
          if (/^(7|8)/.test(release)) {
            suffix += '71';
          }
        }

        resolve(suffix);
      });
    });
  }

  async function exists(filePath) {
    try {
      await resolvedFs.promises.stat(filePath);
      return true;
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  function closeStream(stream) {
    return new Promise(function (resolve) {
      if (!stream || typeof stream.close !== 'function') {
        resolve();
        return;
      }

      stream.close(resolve);
    });
  }

  function removeFile(filePath) {
    return resolvedFs.promises.unlink(filePath).catch(function () {
      return;
    });
  }

  function renameFile(tempFile, finalFile) {
    return resolvedFs.promises.rename(tempFile, finalFile).then(function () {
      return finalFile;
    });
  }

  function getContentLength(response) {
    const headerValue = response && response.headers ? response.headers['content-length'] : undefined;
    const parsedContentLength = Number(headerValue);

    if (!Number.isInteger(parsedContentLength) || parsedContentLength < 0) {
      return null;
    }

    return parsedContentLength;
  }

  function cleanupTempFile(file, tempFile) {
    return closeStream(file)
      .catch(function () {
        return;
      })
      .then(function () {
        return removeFile(tempFile);
      });
  }

  function downloadToFile(downloadUrl, tempFile, finalFile, httpOpts, downloadState) {
    return new Promise(function (resolve, reject) {
      const requestHttpOpts = Object.assign({}, httpOpts || {});
      const configuredTimeoutMs = typeof requestHttpOpts.timeout === 'number' ? requestHttpOpts.timeout : DEFAULT_REQUEST_TIMEOUT_MS;
      const configuredMaxRedirects = typeof requestHttpOpts.maxRedirects === 'number' ? requestHttpOpts.maxRedirects : DEFAULT_MAX_REDIRECTS;
      const configuredMaxDownloadBytes = typeof requestHttpOpts.maxContentLength === 'number'
        ? requestHttpOpts.maxContentLength
        : DEFAULT_MAX_DOWNLOAD_BYTES;
      delete requestHttpOpts.timeout;
      delete requestHttpOpts.maxRedirects;
      delete requestHttpOpts.maxContentLength;
      const state = Object.assign({
        redirectCount: 0,
        maxRedirects: configuredMaxRedirects,
        timeoutMs: configuredTimeoutMs,
        maxDownloadBytes: configuredMaxDownloadBytes
      }, downloadState || {});
      const parsed = new URL(downloadUrl);
      const requestOptions = Object.assign({}, requestHttpOpts, {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search
      });
      let settled = false;
      let request;

      const file = resolvedFs.createWriteStream(tempFile);

      function rejectWithCleanup(err) {
        if (settled) {
          return;
        }

        settled = true;
        cleanupTempFile(file, tempFile).then(function () {
          reject(err);
        }, function () {
          reject(err);
        });
      }

      request = resolvedHttps.get(requestOptions, function (response) {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          if (state.redirectCount >= state.maxRedirects) {
            rejectWithCleanup(new Error(ERROR_MESSAGE_TOO_MANY_REDIRECTS));
            return;
          }

          cleanupTempFile(file, tempFile)
            .then(function () {
              return downloadToFile(
                new URL(response.headers.location, downloadUrl).toString(),
                tempFile,
                finalFile,
                httpOpts,
                Object.assign({}, state, {
                  redirectCount: state.redirectCount + 1
                })
              );
            })
            .then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          rejectWithCleanup(new Error('download failed with status ' + response.statusCode));
          return;
        }

        const contentLength = getContentLength(response);
        if (contentLength !== null && contentLength > state.maxDownloadBytes) {
          rejectWithCleanup(new Error('download failed: content-length ' + contentLength + ' exceeds limit ' + state.maxDownloadBytes));
          return;
        }

        response.pipe(file);

        file.on('finish', function () {
          closeStream(file)
            .then(function () {
              return renameFile(tempFile, finalFile);
            })
            .then(resolve, rejectWithCleanup);
        });

        response.on('error', function (err) {
          rejectWithCleanup(err);
        });
      });

      file.on('error', function (err) {
        rejectWithCleanup(err);
      });

      request.on('error', function (err) {
        rejectWithCleanup(err);
      });

      if (typeof request.setTimeout === 'function') {
        request.setTimeout(state.timeoutMs, function () {
          if (typeof request.destroy === 'function') {
            request.destroy();
          }

          rejectWithCleanup(new Error('download timed out after ' + state.timeoutMs + 'ms'));
        });
      }
    });
  }

  async function mongodbDownload(opts) {
    const options = opts || {};

    const platform = options.platform || resolvedOs.platform();
    const mongoPlatform = getMongoPlatform(platform);

    const arch = options.arch || resolvedOs.arch();
    const mongoArch = getMongoArch(platform, arch);

    const version = options.version;
    if (!version) {
      throw new Error('missing version');
    }

    const archiveExt = getArchiveExtension(mongoPlatform);
    const baseName = getMongoBaseName(mongoPlatform, mongoArch, version);

    const linuxSuffix = (mongoPlatform === 'linux' && mongoArch !== 'i686') ? await getLinuxDistroSuffix() : '';
    const fileName = baseName + linuxSuffix + '-' + version + '.' + archiveExt;
    const downloadUrl = DOWNLOAD_BASE_URI + '/' + mongoPlatform + '/' + fileName;

    const tempDir = options.download_dir || resolvedOs.tmpdir();
    const downloadDir = resolvedPath.resolve(tempDir, 'mongodb-download');
    const finalFile = resolvedPath.resolve(downloadDir, fileName);
    const tempFile = resolvedPath.resolve(downloadDir, fileName + '.in_progress');

    await resolvedFs.promises.mkdir(downloadDir, { recursive: true });

    if (await exists(finalFile)) {
      return finalFile;
    }

    return downloadToFile(downloadUrl, tempFile, finalFile, options.http_opts);
  }

  mongodbDownload.downloadToFile = downloadToFile;
  mongodbDownload.getLinuxDistroSuffix = getLinuxDistroSuffix;

  return mongodbDownload;
}

const mongodbDownload = createMongodbDownload();

const getLinuxDistroSuffix = mongodbDownload.getLinuxDistroSuffix;
const downloadToFile = mongodbDownload.downloadToFile;

export {
  createMongodbDownload,
  getLinuxDistroSuffix,
  downloadToFile,
  getVersionMajor,
  getMongoPlatform,
  getMongoArch,
  getArchiveExtension,
  getMongoBaseName
};
export default mongodbDownload;

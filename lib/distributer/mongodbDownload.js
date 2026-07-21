'use strict';

const
  os = require('os'),
  https = require('https'),
  fs = require('fs'),
  path = require('path'),
  getos = require('getos');

const DOWNLOAD_BASE_URI = 'https://fastdl.mongodb.org';
const MINIMUM_MACOS_ARM64_MAJOR = 6;

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

  function downloadToFile(downloadUrl, tempFile, finalFile, httpOpts) {
    return new Promise(function (resolve, reject) {
      const parsed = new URL(downloadUrl);
      const requestOptions = Object.assign({}, httpOpts || {}, {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search
      });

      const file = resolvedFs.createWriteStream(tempFile);
      const request = resolvedHttps.get(requestOptions, function (response) {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          closeStream(file)
            .then(function () {
              return removeFile(tempFile);
            })
            .then(function () {
              return downloadToFile(new URL(response.headers.location, downloadUrl).toString(), tempFile, finalFile, httpOpts);
            })
            .then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error('download failed with status ' + response.statusCode));
          return;
        }

        response.pipe(file);

        file.on('finish', function () {
          closeStream(file)
            .then(function () {
              return renameFile(tempFile, finalFile);
            })
            .then(resolve, reject);
        });

        response.on('error', function (err) {
          reject(err);
        });
      });

      file.on('error', function (err) {
        reject(err);
      });

      request.on('error', function (err) {
        reject(err);
      });
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

module.exports = mongodbDownload;
module.exports.createMongodbDownload = createMongodbDownload;
module.exports.getLinuxDistroSuffix = mongodbDownload.getLinuxDistroSuffix;
module.exports.downloadToFile = mongodbDownload.downloadToFile;
module.exports.getVersionMajor = getVersionMajor;
module.exports.getMongoPlatform = getMongoPlatform;
module.exports.getMongoArch = getMongoArch;
module.exports.getArchiveExtension = getArchiveExtension;
module.exports.getMongoBaseName = getMongoBaseName;

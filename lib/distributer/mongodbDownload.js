'use strict';

var
  os = require('os'),
  https = require('https'),
  fs = require('fs'),
  path = require('path'),
  url = require('url'),
  getos = require('getos');

var DOWNLOAD_BASE_URI = 'https://fastdl.mongodb.org';

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
  if (arch === 'x64') {
    return 'x86_64';
  }
  throw new Error('unsupported architecture, ia32 and x64 are the only valid options');
}

function getArchiveExtension(mongoPlatform) {
  return mongoPlatform === 'win32' ? 'zip' : 'tgz';
}

function getLinuxDistroSuffix() {
  return new Promise(function (resolve, reject) {
    getos(function (err, osInfo) {
      if (err) {
        reject(err);
        return;
      }
      var dist = (osInfo && osInfo.dist) ? osInfo.dist : '';
      var release = (osInfo && osInfo.release) ? osInfo.release : '';
      var suffix = '';

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
        var fedoraVersion = Number(release);
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
    await fs.promises.stat(filePath);
    return true;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

function downloadToFile(downloadUrl, tempFile, finalFile, httpOpts) {
  return new Promise(function (resolve, reject) {
    var parsed = url.parse(downloadUrl);
    var requestOptions = Object.assign({}, httpOpts || {}, {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      path: parsed.path
    });

    var file = fs.createWriteStream(tempFile);
    var request = https.get(requestOptions, function (response) {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close(function () {
          fs.promises.unlink(tempFile).catch(function () { return; }).then(function () {
            return downloadToFile(response.headers.location, tempFile, finalFile, httpOpts);
          }).then(resolve, reject);
        });
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error('download failed with status ' + response.statusCode));
        return;
      }

      response.pipe(file);

      file.on('finish', function () {
        file.close(function () {
          fs.rename(tempFile, finalFile, function (err) {
            if (err) {
              reject(err);
              return;
            }
            resolve(finalFile);
          });
        });
      });

      response.on('error', function (err) {
        reject(err);
      });
    });

    request.on('error', function (err) {
      reject(err);
    });
  });
}

async function mongodbDownload(opts) {
  var options = opts || {};

  var platform = options.platform || os.platform();
  var mongoPlatform = getMongoPlatform(platform);

  var arch = options.arch || os.arch();
  var mongoArch = getMongoArch(platform, arch);

  var version = options.version;
  if (!version) {
    throw new Error('missing version');
  }

  var archiveExt = getArchiveExtension(mongoPlatform);
  var baseName = 'mongodb-' + mongoPlatform + '-' + mongoArch;

  var linuxSuffix = (mongoPlatform === 'linux' && mongoArch !== 'i686') ? await getLinuxDistroSuffix() : '';
  var fileName = baseName + linuxSuffix + '-' + version + '.' + archiveExt;
  var downloadUrl = DOWNLOAD_BASE_URI + '/' + mongoPlatform + '/' + fileName;

  var tempDir = options.download_dir || os.tmpdir();
  var downloadDir = path.resolve(tempDir, 'mongodb-download');
  var finalFile = path.resolve(downloadDir, fileName);
  var tempFile = path.resolve(downloadDir, fileName + '.in_progress');

  await fs.promises.mkdir(downloadDir, { recursive: true });

  if (await exists(finalFile)) {
    return finalFile;
  }

  return downloadToFile(downloadUrl, tempFile, finalFile, options.http_opts);
}

module.exports = mongodbDownload;

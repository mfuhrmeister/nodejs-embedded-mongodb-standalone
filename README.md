# nems

![npm](https://img.shields.io/npm/v/nems.svg) ![license](https://img.shields.io/npm/l/nems.svg) ![github-issues](https://img.shields.io/github/issues/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

nems is a native Promise-based embedded MongoDB distribution library that downloads an appropriate MongoDB build and runs it standalone, for example in integration and functional tests.

Requires Node.js 18 or newer.

![nodei.co](https://nodei.co/npm/nems.png?downloads=true&downloadRank=true&stars=true)

![stars](https://img.shields.io/github/stars/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)
![forks](https://img.shields.io/github/forks/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

CircleCI: ![Circle CI build status](https://circleci.com/gh/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg?style=svg)

## Features

#### Distributor
Downloads and extracts mongodb for a given version and download directory.
The version is mandatory and must be a semantic version string (e.g., `6.0.8`). Invalid formats are rejected with an error.
The download directory may default to the OS temporary directory.

###### Usage:
```javascript
import nems from 'nems';

nems.distribute('6.0.8', '.')
  .then(function (path) {
    // do anything else with the 'path' to the extracted mongo directory
  })
  .catch(function (err) {
    // catch any DownloadError, ExtractionError or standard Error
  });
```
You can use the download and extraction service separately:

###### Usage:
```javascript
import nems from 'nems';

nems.download('6.0.8', '.')
  .then(function (file) {
    // do anything else with the 'file' string
  })
  .catch(function (err) {
    // catch any DownloadError or standard Error
  });

nems.extract('/path/to/file.tgz', '6.0.8', '.')
  .then(function (path) {
    // do anything else with the 'path' to the extracted mongo directory
  })
  .catch(function (err) {
    // catch any ExtractionError or standard Error
  });
```

By default, newly downloaded archives are verified against the upstream `.sha256` file before extraction continues. If the MongoDB download host does not publish a checksum file for the requested archive, the download fails with a message that points to the low-level opt-out parameter `verify_checksum: false`.

**GPG signature verification** is available as an additional security layer. When enabled, downloaded archives are verified against MongoDB's GPG signatures using bundled public keys for MongoDB versions 4.4, 5.0, 6.0, 7.0, and 8.0:

```javascript
import { createMongodbDownload } from 'nems/lib/distributor/mongodbDownload.js';

const mongodbDownload = createMongodbDownload();

// GPG signature verification only
mongodbDownload({
  version: '8.0.9',
  download_dir: '.',
  verify_checksum: false,
  verify_signature: 'gpg'
});

// Both SHA256 checksum and GPG signature verification (recommended)
mongodbDownload({
  version: '8.0.9',
  download_dir: '.',
  verify_signature: 'both'
});
```

Advanced usage:
```javascript
import { createMongodbDownload } from 'nems/lib/distributor/mongodbDownload.js';

const mongodbDownload = createMongodbDownload();

mongodbDownload({
  version: '6.0.8',
  download_dir: '.',
  verify_checksum: false
});
```

#### Process
Start a mongodb for the given file path.

###### Usage:
```javascript
import nems from 'nems';

/**
 * Parameter: 
 *  path - path to the mongodb installation
 *  port - the mongodb port (optional)
 *  noprealloc - do not pre-allocate (optional)
 *  nojournal - do not use a journal (optional)
 *  dbpath - db working directory, if different from installation path (optional)
 * 
 */

If `dbpath` is provided and the directory does not exist, nems creates it before starting `mongod`.

Note on modern MongoDB versions: `--noprealloc` and `--nojournal` are legacy flags and can be rejected by newer `mongod` binaries. If `mongod` reports an unrecognized option for these flags, nems retries startup without them.
nems.startMongo('path/to/mongodb/installation', 27017, true, true, 'path/to/db/working/directory')
  .then(function (pid) {
    // do anything with the returned process id
  })
  .catch(function (err) {
    // catch any standard Error, e.g. if child process to start mongo crashed
  });
```

#### Interface
A sophisticated module interface to download, extract and start a mongodb at once, as well as stopping it.

###### Usage:
```javascript
import nems from 'nems';

/**
 * Parameter: 
 *  version - the desired mongodb version
 *  downloadDir - the directory to download and extract to (optional, defaults to the OS temporary directory)
 *  port - the mongodb port (optional)
 *  noprealloc - do not pre-allocate (optional)
 *  nojournal - do not use a journal (optional)
 *  dbpath - db working directory, if different from installation path (optional)
 * 
 */
nems.start('6.0.8', '.', 27017, true, true, 'path/to/db/working/directory')
  .then(function (pid) {
    // do anything with the returned process id
  })
  .catch(function (err) {
    // catch any MongoError or standard Error, e.g. if child process to start mongo crashed
  });
    
/**
 * Parameter: 
 *  path - path to the mongodb installation
 *  dbpath - db working directory, if different from installation path (optional)
 */
nems.stop('path/to/mongodb/installation','path/to/db/working/directory')
  .then(function (successMessage) {
    // do anything after mongodb shutdown
  })
  .catch(function (err) {
    // catch any MongoError or standard Error, e.g. if child process to stop mongo crashed
  });
```

Shutdown behavior is platform-aware. If nems can resolve the `mongod` pid from the pid file written at startup, stop works across supported platforms. On Linux, nems also keeps `mongod --shutdown` as a fallback when no pid file is available. On macOS and Windows, pass at least the same `binPath` used at startup so the pid file can be resolved reliably. If you started MongoDB with a custom `dbpath`, pass the same `dbpath` to `stop` as well.

## Install

`npm install nems`

This package now uses ESM:

```javascript
import nems from 'nems';
```

Supported public entrypoints:

- `nems`
- `nems/lib/distributor/mongodbDownload.js`

Published package binaries:

- `npx nems [version [directory [port [noprealloc [nojournal [dbpath]]]]]]`
- `npx nems-dax [version [directory]]`
- `npx nems-stop [binPath [dbpath]]`


## Scripts
Within this module use:

- **npm start** : `node bin/start.js [version [directory [port [noprealloc [nojournal [dbpath]]]]]]` downloads, extracts, and starts MongoDB for the given version, download directory, and optional parameters.
- **npm run dax** : `node bin/dax.js [version [directory]]` downloads and extracts MongoDB for the given version and download directory.
 
- **npm run stop** : `node bin/stop.js [binPath [dbpath]]` stops MongoDB for the given installation path and optional working directory.

`npm start` logs the resolved `binPath` and `dbPath` before `mongod` is launched. Reuse those exact values with `npm run stop`, especially on macOS and Windows.

For macOS and Windows, do not rely on `npm run stop` without arguments in a separate shell. Pass at least the same `binPath` that was used at startup so `nems-stop` can resolve the pid file. If startup used a custom `dbpath`, pass that as the second argument too.

Examples:

- `npm run stop -- "C:\\path\\to\\mongodb\\bin"`
- `npm run stop -- "C:\\path\\to\\mongodb\\bin" "C:\\path\\to\\db"`

If you install the package globally or run it through `npx`, the same entrypoints are available as `nems`, `nems-dax`, and `nems-stop`.
 
 If no parameters are given for `npm start` or `npm run dax`, defaults (version 6.0.8 and the OS temp folder) are used. `npm run stop` is different: on macOS and Windows you should pass at least `binPath`, and pass `dbpath` too when startup used a custom database directory.
 Debug output is opt-in. Set `DEBUG=*` before running `npm start` or `npm run dax` if you want verbose downloader logs.
 Use only the 'h' flag to see further usage information.  
 *HINT: use double-minus to pass parameters to npm run command, e.g `npm start -- version`*

Within the source code project:

- **npm test** : `npm run lint && npm run unit && npm run functional` runs eslint on source, test, and script files and runs all tests.

## Security

nems is designed for use in development, testing, and CI environments. Here are the security measures and assumptions:

### Download Security

- **SHA256 checksum verification** is enabled by default for all downloaded MongoDB archives. Downloads fail if the checksum file is unavailable or verification fails.
- **Version validation**: The version parameter must be a semantic version string (e.g., `6.0.8`). Malformed versions are rejected to prevent URL injection.
- **Download limits**: Redirects are limited to 5 hops, and downloads are bounded by size and timeout constraints.

### Archive Extraction Security

- **Path traversal protection**: All extracted paths are validated to stay within the target directory.
- **Archive bomb protection**: Extraction limits include max entries (20,000), max uncompressed size (8GB), and max compression ratio (200x).
- **Symlink filtering**: Symbolic links and hard links are filtered out during tar extraction.

### Process Security

- **Shell injection prevention**: `mongod` is spawned using argument arrays, not shell interpolation.
- **Input sanitization**: While `spawn` usage is safe, consumers should avoid passing untrusted input to `version`, `binPath`, or `dbPath` parameters in production scenarios.

### Known Limitations

- Checksums are fetched from the same MongoDB download server (`fastdl.mongodb.org`) as the binaries. For additional assurance in high-security environments, consider pinning to known-good hashes or implementing GPG signature verification.
- Temporary files are written to the OS temp directory without explicit permission restrictions. On shared systems, consider using a dedicated download directory.

For details, see [docs/security-analysis.md](docs/security-analysis.md).

## Contributing

Contributions welcome! Please submit all pull requests against master branch. If your pull request contains JavaScript patches or features, you should fully cover the code with unit tests. Thanks!

## Author

Marcus Fuhrmeister <marcus.fuhrmeister@googlemail.com> https://github.com/mfuhrmeister

## License

 - **MIT** : http://opensource.org/licenses/MIT

# nems

![npm](https://img.shields.io/npm/v/nems.svg) ![license](https://img.shields.io/npm/l/nems.svg) ![github-issues](https://img.shields.io/github/issues/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

nems is a native Promise-based embedded MongoDB distribution library that downloads an appropriate MongoDB build and runs it standalone, for example in integration and functional tests.

Requires Node.js 18 or newer.

![nodei.co](https://nodei.co/npm/nems.png?downloads=true&downloadRank=true&stars=true)

![stars](https://img.shields.io/github/stars/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)
![forks](https://img.shields.io/github/forks/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

CircleCI: ![Circle CI build status](https://circleci.com/gh/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg?style=svg)

## Features

#### Distributer
Downloads and extracts mongodb for a given version and download directory.
The version is mandatory, the download directory may default to the OS temporary directory.

###### Usage:
```javascript
import nems from 'nems';

nems.distribute('3.2.8', '.')
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

nems.download('3.2.8', '.')
  .then(function (file) {
    // do anything else with the 'file' string
  })
  .catch(function (err) {
    // catch any DownloadError or standard Error
  });

nems.extract('/path/to/file.gz', '3.2.8', '.')
  .then(function (path) {
    // do anything else with the 'path' to the extracted mongo directory
  })
  .catch(function (err) {
    // catch any ExtractionError or standard Error
  });
```

By default, newly downloaded archives are verified against the upstream `.sha256` file before extraction continues. If the MongoDB download host does not publish a checksum file for the requested archive, the download fails with a message that points to the low-level opt-out parameter `verify_checksum: false`.

Advanced usage:
```javascript
import { createMongodbDownload } from 'nems/lib/distributer/mongodbDownload.js';

const mongodbDownload = createMongodbDownload();

mongodbDownload({
  version: '3.2.8',
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
nems.start('3.2.8', '.', 27017, true, true, 'path/to/db/working/directory')
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

## Install

`npm install nems`

This package now uses ESM:

```javascript
import nems from 'nems';
```


## Scripts
Within this module use:

- **npm start** : `node bin/start.js [version [directory [port [noprealloc [nojournal [dbpath]]]]]]` downloads, extracts, and starts MongoDB for the given version, download directory, and optional parameters.
- **npm run dax** : `node bin/dax.js [version [directory]]` downloads and extracts MongoDB for the given version and download directory.
 
- **npm run stop** : `node bin/stop.js [binPath [dbpath]]` stops MongoDB for the given installation path and optional working directory.
 
 If no parameters are given, defaults (version 2.4.9 on most platforms, version 6.0.8 on macOS arm64, and the OS temp folder, respectively dbpath) are used.  
 Use only the 'h' flag to see further usage information.  
 *HINT: use double-minus to pass parameters to npm run command, e.g `npm start -- version`*

Within the source code project:

- **npm test** : `npm run lint && npm run unit && npm run functional` runs eslint on source, test, and script files and runs all tests.

## Contributing

Contributions welcome! Please submit all pull requests against master branch. If your pull request contains JavaScript patches or features, you should fully cover the code with unit tests. Thanks!

## Author

Marcus Fuhrmeister <marcus.fuhrmeister@googlemail.com> https://github.com/mfuhrmeister

## License

 - **MIT** : http://opensource.org/licenses/MIT

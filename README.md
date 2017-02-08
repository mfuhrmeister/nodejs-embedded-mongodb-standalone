# nems

![npm](https://img.shields.io/npm/v/nems.svg) ![license](https://img.shields.io/npm/l/nems.svg) ![github-issues](https://img.shields.io/github/issues/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

nodejs-embedded-mongodb-standalone is a promise based embedded mongodb distribution library that downloads a appropriate mongodb and utilizes it as standalone, e.g. for integration/functional tests.

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
var nems = require('nems');

nems.distribute('3.2.8', '.')
    .then(function (path) {
      // do anything else with the 'path' to the extracted mongo directory
    }).catch(function(err) {
      // catch any DownloadError, ExtractionError or standard Error
    });
```
You can use the download and extraction service separately:

###### Usage:
```javascript
var nems = require('nems');

nems.download('3.2.8', '.')
    .then(function (file) {
      // do anything else with the 'file' string
    }.catch(err) {
      // catch any DownloadError or standard Error
    };
    
nems.extract('/path/to/file.gz', '3.2.8', '.')
    .then(function (path) {
      // do anything else with the 'path' to the extracted mongo directory
    }.catch(err) {
      // catch any ExtractionError or standard Error
    };
```

#### Process
Start a mongodb for the given file path.

###### Usage:
```javascript
var nems = require('nems');

/**
 * Parameter: 
 *  path - path to the mongodb installation
 *  port - the mongodb port (optional)
 *  noprealloc - do not pre-allocate (optional)
 *  nojournal - do not use a journal (optional)
 * 
 */
nems.startMongo('path/to/mongodb', 27017, true, true)
    .then(function (pid) {
      // do anything with the returned process id
    }.catch(err) {
      // catch any standard Error, e.g. if child process to start mongo crashed
    };
```

#### Interface
A sophisticated module interface to download, extract and start a mongodb at once, as well as stopping it.

###### Usage:
```javascript
var nems = require('nems');

/**
 * Parameter: 
 *  version - the desired mongodb version
 *  downloadDir - the directory to download and extract to (optional, defaults to the OS temporary directory)
 *  port - the mongodb port (optional)
 *  noprealloc - do not pre-allocate (optional)
 *  nojournal - do not use a journal (optional)
 * 
 */
nems.start('3.2.8', '.', 27017, true, true)
    .then(function (pid) {
      // do anything with the returned process id
    }.catch(err) {
      // catch any standard Error, e.g. if child process to start mongo crashed
    };
    
/**
 * Parameter: 
 *  path - path to the mongodb installation
 */
nems.stop('path/to/mongodb')
    .then(function () {
      // do anything after mongodb shutdown
    }.catch(err) {
      // catch any standard Error, e.g. if child process to start mongo crashed
    };
```

## Install

`npm i -S nems`


## Scripts
Within this module use:

 - **npm start** : `node bin/start [version [directory [port [noprealloc [nojournal]]]]]` will download, extract and start a mongodb for given version and download directory.
 - **npm run dax** : `node bin/dax [version [directory]]` will download and extract mongodb for given version and download directory.
 
 - **npm run stop** : `node bin/stop [dbpath]` will stop mongodb for given db path.
 
 If no parameters are given, defaults (version 2.4.9 and OS temp folder, resp. dbpath) are used.  
 Use only the 'h' flag to see further usage information.  
 *HINT: use double-minus to pass parameters to npm run command, e.g `npm start -- version`*

Within the source code project:

 - **npm test** : `./node_modules/gulp/bin/gulp.js test` runs jshint on gulp, test and source files and runs all tests with code coverage analysis.

## Contributing

Contributions welcome! Please submit all pull requests against master branch. If your pull request contains JavaScript patches or features, you should fully cover the code with unit tests. Thanks!

## Author

Marcus Fuhrmeister <marcus.fuhrmeister@googlemail.com> https://github.com/mfuhrmeister

## License

 - **MIT** : http://opensource.org/licenses/MIT

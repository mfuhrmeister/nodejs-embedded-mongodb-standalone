# nems

![npm](https://img.shields.io/npm/v/nems.svg) ![license](https://img.shields.io/npm/l/nems.svg) ![github-issues](https://img.shields.io/github/issues/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)  ![Circle CI build status](https://circleci.com/gh/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg?style=svg)

nodejs-embedded-mongodb-standalone is a promise based embedded mongodb distribution library that downloads a appropriate mongodb and utilizes it as standalone, e.g. fo integration/functional tests.

![nodei.co](https://nodei.co/npm/nems.png?downloads=true&downloadRank=true&stars=true)

![stars](https://img.shields.io/github/stars/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)
![forks](https://img.shields.io/github/forks/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

![](https://david-dm.org/mfuhrmeister/nodejs-embedded-mongodb-standalone/status.svg)
![](https://david-dm.org/mfuhrmeister/nodejs-embedded-mongodb-standalone/dev-status.svg)

## Features (current)

#### Distributer
Downloads and extracts mongodb for a given version and download directory, or uses defaults.

###### Usage:
```javascript
var nems = require('nems');

nems.distribute('3.2.8', '.')
    .then(function (files) {
      // do anything else with the 'files' array containing File objects
    }.catch(err) {
      // catch any DownloadError, ExtractionError or standard Error
    };
```

## Features (comming with version 0.2.0)

#### Process
Start or stop a mongodb for the given file path.

#### Interface
A sophisticated module interface to download, extract, start and stop a mongodb at once or use all of them independently.

## Install

`npm i -S nems`


## Scripts
Within this module use:

 - **npm test** : `./node_modules/gulp/bin/gulp.js test` runs jshint on gulp, test and source files and runs all tests with code coverage analysis.
 - **npm start** : `node bin/dax [version [directory]]` will download and extract mongodb for given version and download directory, otherwise uses defaults. Use only the 'h' flag to see further usage information.

## Dependencies

Package | Version | Dev
--- |:---:|:---:
[bluebird](https://www.npmjs.com/package/bluebird) | ^3.4.1 | ✖
[decompress](https://www.npmjs.com/package/decompress) | ^3.0.0 | ✖
[mongodb-download](https://www.npmjs.com/package/mongodb-download) | ^1.3.2 | ✖
[npmlog](https://www.npmjs.com/package/npmlog) | ^4.0.0 | ✖
[sprintf-js](https://www.npmjs.com/package/sprintf-js) | ^1.0.3 | ✖
[lodash](https://www.npmjs.com/package/lodash) | ^4.0.0 | ✖
[del](https://www.npmjs.com/package/del) | ^2.0.0 | ✔
[gulp](https://www.npmjs.com/package/gulp) | ^3.9.0 | ✔
[gulp-istanbul](https://www.npmjs.com/package/gulp-istanbul) | ^1.0.0 | ✔
[gulp-jasmine](https://www.npmjs.com/package/gulp-jasmine) | ^2.4.0 | ✔
[gulp-jshint](https://www.npmjs.com/package/gulp-jshint) | ^2.0.1 | ✔
[gulp-nsp](https://www.npmjs.com/package/gulp-nsp) | ^2.1.0 | ✔
[gulp-util](https://www.npmjs.com/package/gulp-util) | ^3.0.1 | ✔
[jasmine-core](https://www.npmjs.com/package/jasmine-core) | ^2.4.1 | ✔
[jasmine-node](https://www.npmjs.com/package/jasmine-node) | ^1.14.5 | ✔
[jasmine-reporters](https://www.npmjs.com/package/jasmine-reporters) | ^2.0.3 | ✔
[jshint](https://www.npmjs.com/package/jshint) | ^2.0.0 | ✔
[jshint-stylish](https://www.npmjs.com/package/jshint-stylish) | ^2.2.0 | ✔
[require-dir](https://www.npmjs.com/package/require-dir) | ~0.3.0 | ✔
[rewire](https://www.npmjs.com/package/rewire) | ^2.3.1 | ✔
[run-sequence](https://www.npmjs.com/package/run-sequence) | ^1.2.1 | ✔
[map-stream](https://www.npmjs.com/package/map-stream) | 0.0.6 | ✔


## Contributing

Contributions welcome; Please submit all pull requests against master branch. If your pull request contains JavaScript patches or features, you should fully cover the code with unit tests. Thanks!

## Author

Marcus Fuhrmeister <marcus.fuhrmeister@googlemail.com> https://github.com/mfuhrmeister

## License

 - **MIT** : http://opensource.org/licenses/MIT

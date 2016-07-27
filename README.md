# nems

![npm](https://img.shields.io/npm/v/nems.svg) ![license](https://img.shields.io/npm/l/nems.svg) ![github-issues](https://img.shields.io/github/issues/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

nodejs-embedded-mongodb-standalone is a promise based embedded mongodb distribution library that downloads a appropriate mongodb and utilizes it as standalone, e.g. fo integration/functional tests.

![nodei.co](https://nodei.co/npm/nems.png?downloads=true&downloadRank=true&stars=true)

![stars](https://img.shields.io/github/stars/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)
![forks](https://img.shields.io/github/forks/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg)

CircleCI: ![Circle CI build status](https://circleci.com/gh/mfuhrmeister/nodejs-embedded-mongodb-standalone.svg?style=svg)

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

## Contributing

Contributions welcome; Please submit all pull requests against master branch. If your pull request contains JavaScript patches or features, you should fully cover the code with unit tests. Thanks!

## Author

Marcus Fuhrmeister <marcus.fuhrmeister@googlemail.com> https://github.com/mfuhrmeister

## License

 - **MIT** : http://opensource.org/licenses/MIT

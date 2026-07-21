'use strict';

const path = require('path');
const runJasmine = require('../gulp/support/runJasmine');

async function main() {
  const specDirArg = process.argv[2];
  const reportDirArg = process.argv[3];

  if (!specDirArg || !reportDirArg) {
    throw new Error('usage: node scripts/run-jasmine.js <specDir> <reportDir>');
  }

  const specDir = path.relative(process.cwd(), path.resolve(process.cwd(), specDirArg));
  const reportDir = path.relative(process.cwd(), path.resolve(process.cwd(), reportDirArg));

  await runJasmine(
    specDir,
    reportDir
  );
}

main().catch(function (err) {
  console.error(err);
  process.exitCode = 1;
});

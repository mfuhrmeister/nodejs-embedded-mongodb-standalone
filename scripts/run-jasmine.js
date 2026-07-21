import path from 'path';
import Jasmine from 'jasmine';
import jasmineReporters from 'jasmine-reporters';

function createTerminalReporter() {
  return new jasmineReporters.TerminalReporter({
    verbosity: 3,
    color: 'yellow'
  });
}

function createJunitReporter(reportDir) {
  return new jasmineReporters.JUnitXmlReporter({
    consolidate: true,
    consolidateAll: false,
    savePath: reportDir,
    filePrefix: 'TEST-',
    useDotNotation: true
  });
}

async function runJasmine(specDir, reportDir) {
  const runner = new Jasmine();

  runner.exitOnCompletion = false;
  runner.env.configure({
    random: false,
    stopSpecOnExpectationFailure: false
  });
  runner.loadConfig({
    spec_dir: specDir,
    spec_files: ['**/*Spec.js'],
    helpers: []
  });

  runner.env.clearReporters();
  runner.addReporter(createTerminalReporter());
  runner.addReporter(createJunitReporter(reportDir));

  if (!await runner.execute()) {
    throw new Error('Jasmine failed');
  }
}

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

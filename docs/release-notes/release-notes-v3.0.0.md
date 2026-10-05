# nems v3.0.0

## Summary

- Migrates the package from CommonJS to package wide ESM
- Keeps the public default module shape while moving the internal codebase to modern import and export syntax
- Removes rewire from the test stack after completing dependency seam refactors across the unit suite
- Validates build, test, download, start, and stop flows on the ESM codebase

## Breaking Changes

- Consumer code must now import nems with ESM syntax
- package.json now declares type: module
- CommonJS require based consumption is no longer the supported package entry path

## Migration

### Before

- const nems = require("nems");

### After

- import nems from "nems";

## Highlights

- Converts runtime modules under lib to ESM
- Converts CLI entrypoints under bin to ESM compatible execution
- Converts helper scripts under scripts to ESM compatible imports and path handling
- Converts the Jasmine test suite to ESM imports
- Replaces __dirname usage in scripts with import.meta.url based path resolution
- Preserves injectable factory seams for unit testing

## Validation

- npm test
- npm run build
- npm run dax -- 6.0.8 /tmp/nems-phase3.0BPP50
- npm run start -- 6.0.8 /tmp/nems-phase3.0BPP50 27118
- npm run stop -- /tmp/nems-phase3.0BPP50/mongodb-download/6.0.8/bin

## Notes

- Functional specs remain skipped as before
- The CLI argument sequence still expects positional ordering for optional values

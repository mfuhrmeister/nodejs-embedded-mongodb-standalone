# Tasks

## Current Focus

- [x] Remove `ramda` by replacing the remaining usage in `lib/distributer/extractionService.js`
- [x] Remove `fs-extra` from `test/testUtil.js` and switch to Node built-in `fs`
- [x] Remove `sprintf-js` and replace formatting with template literals
- [x] Replace deprecated `npmlog` with a minimal local logger and keep CLI output simple
- [ ] Keep `getos` for now unless Linux distro detection is redesigned

## Modernization

- [x] Replace remaining `var` declarations with `const` and `let` where appropriate
- [ ] Simplify small helper functions with modern JavaScript syntax where it improves readability
- [ ] Keep the project in CommonJS unless there is a strong reason to migrate to ESM
- [ ] Evaluate whether Gulp can be replaced with plain npm scripts or small Node-based task runners

## Process

- [ ] Keep each cleanup as a separate commit
- [ ] Run targeted tests after each dependency removal
- [ ] Run lint and diagnostics after each code change
- [ ] Update `README.md` if user-facing behavior changes

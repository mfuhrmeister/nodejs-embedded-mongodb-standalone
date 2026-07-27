# Issue tasks tracker

## Open Github Issues

### Issue #6: Cross Platform Shutdown Feature

- [x] Review the current shutdown flow in `lib/process/mongoService.js` and document which parts are Linux-specific today.
- [x] Define the supported shutdown behavior for macOS and Windows, including whether PID-file shutdown, signal-based shutdown, and `mongod --shutdown` should be preferred or avoided per platform.
- [x] Refactor `mongoService.stop()` to choose a platform-appropriate shutdown strategy without regressing the current Linux behavior.
- [x] Add unit coverage in `test/unit/process/mongoServiceSpec.js` for the platform-specific shutdown branches and failure modes.
- [x] Add or extend a functional validation path that proves shutdown works on non-Linux platforms where CI or local verification is feasible.
- [x] Update `README.md` and the CLI usage notes in `bin/stop.js` if shutdown expectations or platform support become more explicit.

Implemented behavior:

- Linux keeps the current PID-file-first shutdown path and still falls back to `mongod --shutdown` when no pid is available.
- macOS and Windows stop MongoDB through the pid file written at startup, or through the in-process managed pid when shutdown happens from the same Node.js process.
- On macOS and Windows, `nems-stop` should be given the same `binPath` and `dbpath` that were used at startup so the pid file can be resolved reliably.

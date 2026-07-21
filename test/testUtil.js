import fs from 'fs';

function mkdir(path) {
  fs.mkdirSync(path, { recursive: true });
}

function rm(path) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true, force: true });
  }
}

function killProcess(pid, hard) {
  process.kill(pid, (!!hard) ? 'SIGKILL' : 'SIGTERM');
}

function escapePath(dbPath) {
  return '"' + dbPath + '"';
}

const testUtil = {
  createFolder: mkdir,
  deleteFolder: rm,
  killProcess: killProcess,
  escapePath: escapePath
};

export { mkdir as createFolder, rm as deleteFolder, killProcess, escapePath };
export default testUtil;

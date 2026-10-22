const fs = require('node:fs');
const path = require('node:path');

// Mémorise, pour chaque dossier, les fichiers déjà gardés afin de reprendre un tri interrompu.
class ProgressStore {
  constructor(filePath, { platform = process.platform } = {}) {
    this._filePath = filePath;
    this._pathApi = platform === 'win32' ? path.win32 : path.posix;
    this._caseInsensitive = platform === 'win32';
    this._data = this._load();
  }

  keptFor(folder) {
    return new Set(this._data[this._key(folder)] ?? []);
  }

  addKept(folder, name) {
    const kept = this.keptFor(folder);
    kept.add(name);
    this._set(folder, kept);
  }

  removeKept(folder, name) {
    const kept = this.keptFor(folder);
    kept.delete(name);
    this._set(folder, kept);
  }

  reset(folder) {
    delete this._data[this._key(folder)];
    this._save();
  }

  _set(folder, kept) {
    if (kept.size === 0) delete this._data[this._key(folder)];
    else this._data[this._key(folder)] = [...kept];
    this._save();
  }

  _key(folder) {
    const key = this._pathApi.resolve(folder);
    return this._caseInsensitive ? key.toLowerCase() : key;
  }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this._filePath, 'utf8'));
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch {
      return {};
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this._filePath), { recursive: true });
    const tmp = `${this._filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this._data));
    fs.renameSync(tmp, this._filePath);
  }
}

module.exports = { ProgressStore };

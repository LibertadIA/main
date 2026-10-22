const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ProgressStore } = require('../../src/main/progress');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tri-progress-')), 'progress.json');
}

test('mémorise les fichiers gardés par dossier, sur disque', () => {
  const file = tempFile();
  const store = new ProgressStore(file);
  assert.deepEqual([...store.keptFor('/photos/vacances')], []);
  store.addKept('/photos/vacances', 'IMG_1.jpg');
  store.addKept('/photos/vacances', 'IMG_2.jpg');
  store.addKept('/photos/noel', 'IMG_9.jpg');
  store.removeKept('/photos/vacances', 'IMG_1.jpg');

  const reloaded = new ProgressStore(file);
  assert.deepEqual([...reloaded.keptFor('/photos/vacances')], ['IMG_2.jpg']);
  assert.deepEqual([...reloaded.keptFor('/photos/noel')], ['IMG_9.jpg']);
});

test('reset oublie un dossier sans toucher aux autres', () => {
  const file = tempFile();
  const store = new ProgressStore(file);
  store.addKept('/photos/a', 'x.jpg');
  store.addKept('/photos/b', 'y.jpg');
  store.reset('/photos/a');
  const reloaded = new ProgressStore(file);
  assert.deepEqual([...reloaded.keptFor('/photos/a')], []);
  assert.deepEqual([...reloaded.keptFor('/photos/b')], ['y.jpg']);
});

test('sous Windows, le chemin du dossier est insensible à la casse', () => {
  const store = new ProgressStore(tempFile(), { platform: 'win32' });
  store.addKept('C:\\Photos\\Vacances', 'IMG_1.jpg');
  assert.deepEqual([...store.keptFor('c:\\photos\\vacances\\')], ['IMG_1.jpg']);
});

test('un fichier de mémorisation corrompu est ignoré', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{pas du json');
  const store = new ProgressStore(file);
  assert.deepEqual([...store.keptFor('/photos')], []);
  store.addKept('/photos', 'a.jpg');
  assert.deepEqual([...new ProgressStore(file).keptFor('/photos')], ['a.jpg']);
});

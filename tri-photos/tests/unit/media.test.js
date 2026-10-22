const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mediaType, listMedia } = require('../../src/main/media');

function makeDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-media-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

test('mediaType reconnaît photos et vidéos, sans tenir compte de la casse', () => {
  assert.equal(mediaType('IMG_1.JPG'), 'image');
  assert.equal(mediaType('a.jpeg'), 'image');
  assert.equal(mediaType('a.webp'), 'image');
  assert.equal(mediaType('VID_1.MP4'), 'video');
  assert.equal(mediaType('a.mov'), 'video');
  assert.equal(mediaType('a.3gp'), 'video');
  assert.equal(mediaType('notes.txt'), null);
  assert.equal(mediaType('sans-extension'), null);
});

test('listMedia ne garde que les médias du dossier, triés par nom', async () => {
  const dir = makeDir({
    'IMG_10.jpg': 'xx',
    'IMG_2.jpg': 'x',
    'VID_1.mp4': 'xxxx',
    'notes.txt': 'x',
    '.trashed-123-IMG_3.jpg': 'x',
    'sous-dossier/IMG_9.jpg': 'x',
  });
  const items = await listMedia(dir);
  assert.deepEqual(items.map((i) => i.name), ['IMG_2.jpg', 'IMG_10.jpg', 'VID_1.mp4']);
  assert.deepEqual(items[2], {
    name: 'VID_1.mp4',
    path: path.join(dir, 'VID_1.mp4'),
    type: 'video',
    size: 4,
  });
});

test('listMedia renvoie une liste vide pour un dossier sans média', async () => {
  const dir = makeDir({ 'notes.txt': 'x' });
  assert.deepEqual(await listMedia(dir), []);
});

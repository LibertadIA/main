const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');
const electronPath = require('electron');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, '..', 'fixtures');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Dossier de photos de test : `files` associe un nom de fichier à une fixture ou à un contenu brut.
function makePhotoFolder(files) {
  const dir = tempDir('tri-dossier-');
  for (const [name, source] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (source.fixture) fs.copyFileSync(path.join(FIXTURES, source.fixture), target);
    else fs.writeFileSync(target, source.content);
  }
  return dir;
}

// Profil isolé : données de l'app et corbeille Linux dans des dossiers temporaires.
function makeProfile() {
  return { config: tempDir('tri-config-'), data: tempDir('tri-data-') };
}

function trashedFiles(profile) {
  const dir = path.join(profile.data, 'Trash', 'files');
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

async function launch(profile) {
  const env = { ...process.env, XDG_CONFIG_HOME: profile.config, XDG_DATA_HOME: profile.data };
  delete env.NODE_OPTIONS;
  const app = await electron.launch({
    executablePath: electronPath,
    args: [ROOT, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env,
  });
  const page = await app.firstWindow();
  await page.waitForSelector('#pick');
  return { app, page };
}

async function chooseFolder(app, page, buttonId, folder) {
  await app.evaluate(({ dialog }, folderPath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folderPath] });
  }, folder);
  await page.click(`#${buttonId}`);
}

async function expectCard(page, counter, name) {
  await page.waitForFunction(
    ([expectedCounter, expectedName]) =>
      document.getElementById('counter').textContent === expectedCounter &&
      document.querySelector('.card.front')?.dataset.name === expectedName,
    [counter, name],
  );
}

test('trier un dossier au clavier : garder, supprimer, annuler, vidéo, fin', async () => {
  const profile = makeProfile();
  const folder = makePhotoFolder({
    '01-photo-a.jpg': { fixture: 'photo-a.jpg' },
    '02-photo-b.png': { fixture: 'photo-b.png' },
    '03-clip.webm': { fixture: 'clip.webm' },
    '04-cassee.mp4': { content: 'pas une vraie vidéo' },
    'notes.txt': { content: 'à ignorer' },
    'sous-dossier/05-photo.jpg': { fixture: 'photo-a.jpg' },
  });
  const { app, page } = await launch(profile);
  try {
    await chooseFolder(app, page, 'pick', folder);
    await expectCard(page, '1 / 4', '01-photo-a.jpg');
    await page.waitForFunction(() => document.querySelector('.card.front img')?.naturalWidth > 0);

    await page.keyboard.press('ArrowRight');
    await expectCard(page, '2 / 4', '02-photo-b.png');

    await page.keyboard.press('ArrowLeft');
    await expectCard(page, '3 / 4', '03-clip.webm');
    assert.ok(fs.existsSync(path.join(folder, '02-photo-b.png')), 'la suppression reste annulable');

    await page.keyboard.press('Control+z');
    await expectCard(page, '2 / 4', '02-photo-b.png');

    await page.keyboard.press('ArrowLeft');
    await expectCard(page, '3 / 4', '03-clip.webm');
    await page.waitForFunction(() => {
      const video = document.querySelector('.card.front video');
      return video && video.readyState >= 2 && !video.paused && video.muted;
    });
    await page.keyboard.press(' ');
    assert.equal(await page.evaluate(() => document.querySelector('.card.front video').paused), true);

    await page.keyboard.press('ArrowRight');
    await expectCard(page, '4 / 4', '04-cassee.mp4');
    await page.waitForSelector('.card.front .fallback >> text=Ouvrir avec le lecteur Windows');

    await page.keyboard.press('ArrowLeft');
    await page.waitForSelector('#end:not([hidden])');
    assert.equal(await page.textContent('#statKept'), '2');
    assert.equal(await page.textContent('#statDeleted'), '2');
    assert.equal(await page.isHidden('#errors'), true);

    assert.deepEqual(fs.readdirSync(folder).sort(), ['01-photo-a.jpg', '03-clip.webm', 'notes.txt', 'sous-dossier']);
    assert.deepEqual(trashedFiles(profile), ['02-photo-b.png', '04-cassee.mp4']);
  } finally {
    await app.close();
  }

  // Réouverture : les fichiers gardés ne sont plus proposés.
  const second = await launch(profile);
  try {
    await chooseFolder(second.app, second.page, 'pick', folder);
    await second.page.waitForSelector('#empty:not([hidden]) >> text=Tout est déjà trié');
    await second.page.click('#restart');
    await expectCard(second.page, '1 / 2', '01-photo-a.jpg');
  } finally {
    await second.app.close();
  }
});

test('glisser à la souris et suppressions vidées à la fermeture', async () => {
  const profile = makeProfile();
  const folder = makePhotoFolder({
    'a.jpg': { fixture: 'photo-a.jpg' },
    'b.png': { fixture: 'photo-b.png' },
    'c.jpg': { fixture: 'photo-a.jpg' },
  });
  const { app, page } = await launch(profile);
  try {
    await chooseFolder(app, page, 'pick', folder);
    await expectCard(page, '1 / 3', 'a.jpg');

    const box = await page.locator('.card.front').boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const swipe = async (dx) => {
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + dx / 2, startY, { steps: 5 });
      await page.mouse.move(startX + dx, startY, { steps: 5 });
      await page.mouse.up();
    };

    await swipe(-300);
    await expectCard(page, '2 / 3', 'b.png');

    await swipe(60); // trop court : la carte revient
    await page.waitForTimeout(400);
    await expectCard(page, '2 / 3', 'b.png');

    await swipe(300);
    await expectCard(page, '3 / 3', 'c.jpg');
    assert.ok(fs.existsSync(path.join(folder, 'a.jpg')), 'la suppression reste annulable');
  } finally {
    await app.close();
  }
  assert.deepEqual(fs.readdirSync(folder).sort(), ['b.png', 'c.jpg']);
  assert.deepEqual(trashedFiles(profile), ['a.jpg']);
});

test('dossier sans photo ni vidéo', async () => {
  const profile = makeProfile();
  const folder = makePhotoFolder({ 'notes.txt': { content: 'rien' } });
  const { app, page } = await launch(profile);
  try {
    await chooseFolder(app, page, 'pick', folder);
    await page.waitForSelector('#empty:not([hidden]) >> text=Aucune photo ni vidéo');
    assert.equal(await page.isHidden('#restart'), true);
  } finally {
    await app.close();
  }
});

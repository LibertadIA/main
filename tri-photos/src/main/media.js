const fs = require('node:fs/promises');
const path = require('node:path');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.3gp', '.webm']);

function mediaType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return null;
}

// Fichiers du dossier uniquement (pas les sous-dossiers), triés comme l'explorateur Windows.
async function listMedia(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const type = mediaType(entry.name);
    if (!type) continue;
    const filePath = path.join(dir, entry.name);
    const { size } = await fs.stat(filePath);
    items.push({ name: entry.name, path: filePath, type, size });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

module.exports = { mediaType, listMedia };

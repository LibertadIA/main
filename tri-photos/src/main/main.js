const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { listMedia } = require('./media');
const { SortSession } = require('./session');
const { ProgressStore } = require('./progress');

let mainWindow = null;
let store = null;
let session = null;
let folder = null;
let flushedBeforeQuit = false;

async function trashFile(filePath) {
  if (!fs.existsSync(filePath)) return; // déjà supprimé en dehors de l'app
  await shell.trashItem(filePath);
}

function sendToWindow(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function sessionState() {
  return {
    index: session.index,
    total: session.total,
    done: session.isDone(),
    canUndo: session.canUndo(),
    stats: session.stats(),
  };
}

async function loadFolder(dir) {
  if (session) await session.flush();
  const items = await listMedia(dir);
  const kept = store.keptFor(dir);
  const remaining = items.filter((item) => !kept.has(item.name));
  folder = dir;
  session = new SortSession(remaining, {
    trash: trashFile,
    onKeep: (item) => store.addKept(dir, item.name),
    onUnkeep: (item) => store.removeKept(dir, item.name),
    onTrashError: (error) => sendToWindow('trash-error', error),
  });
  return {
    folder: dir,
    folderName: path.basename(dir) || dir,
    totalInFolder: items.length,
    alreadySorted: items.length - remaining.length,
    items: remaining.map((item) => ({ name: item.name, type: item.type, size: item.size, url: pathToFileURL(item.path).href })),
    ...sessionState(),
  };
}

function requireSession() {
  if (!session) throw new Error('Aucun dossier ouvert');
  return session;
}

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir le dossier à trier',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return loadFolder(result.filePaths[0]);
});

ipcMain.handle('restart-folder', async () => {
  if (!folder) return null;
  store.reset(folder);
  return loadFolder(folder);
});

ipcMain.handle('decide', async (_event, action) => {
  requireSession().decide(action);
  if (session.isDone()) await session.flush();
  return sessionState();
});

ipcMain.handle('undo', () => {
  const undone = requireSession().undo();
  return { undone, ...sessionState() };
});

ipcMain.handle('open-external', async (_event, index) => {
  const item = requireSession().items[index];
  if (!item) return null;
  const error = await shell.openPath(item.path);
  return error || null;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 860,
    minWidth: 720,
    minHeight: 600,
    title: 'Tri Photos',
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // Un fichier lâché sur la fenêtre ne doit pas remplacer l'interface.
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    store = new ProgressStore(path.join(app.getPath('userData'), 'progress.json'));
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());

  // Les suppressions encore annulables partent à la corbeille avant de quitter.
  app.on('before-quit', (event) => {
    if (flushedBeforeQuit || !session) return;
    event.preventDefault();
    flushedBeforeQuit = true;
    session.flush().finally(() => app.quit());
  });
}

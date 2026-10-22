# Tri Photos Implementation Plan

**Goal:** Application Windows portable (Electron) pour trier photos/vidéos d'un dossier façon Tinder, suppression vers la corbeille.

**Architecture:** Processus principal Electron = logique fichiers (listing, session de tri, corbeille, mémorisation).
Rendu = interface HTML/CSS/JS sans framework, isolée (contextIsolation + sandbox), qui parle au principal via `window.triPhotos`.

**Tech Stack:** Electron 44, electron-builder 26 (cible `portable`), `node:test`, Playwright (`_electron`) pour l'E2E, GitHub Actions `windows-latest`.

---

### Task 1 : Listing des médias — `src/main/media.js`
- [ ] Tests `tests/unit/media.test.js` : filtre par extension (insensible à la casse), ignore sous-dossiers et fichiers cachés, tri naturel par nom, renvoie `{ name, path, type, size }`.
- [ ] Implémenter `mediaType(name)` et `listMedia(dir)`.

### Task 2 : Session de tri — `src/main/session.js`
- [ ] Tests `tests/unit/session.test.js` : garder/supprimer avancent l'index ; suppression différée (corbeille quand elle sort des 10 derniers choix) ;
  `undo()` revient en arrière et annule la stat ; `flush()` envoie toutes les suppressions en attente ; fin de tri = tout vidé ;
  erreur de corbeille comptée et remontée via `onTrashError` ; callbacks `onKeep`/`onUnkeep`.
- [ ] Implémenter `SortSession` (décisions synchrones, corbeille sérialisée en arrière-plan).

### Task 3 : Mémorisation — `src/main/progress.js`
- [ ] Tests `tests/unit/progress.test.js` : ajout/retrait/reset par dossier, persistance sur disque, clé insensible à la casse sous Windows.
- [ ] Implémenter `ProgressStore` (écriture atomique).

### Task 4 : Processus principal — `src/main/main.js`, `src/main/preload.js`
- [ ] Fenêtre sécurisée, IPC `openFolder`, `restartFolder`, `decide`, `undo`, `openExternal`, événement `trash-error`.
- [ ] Vidage des suppressions au changement de dossier et à la fermeture.

### Task 5 : Interface — `src/renderer/index.html`, `styles.css`, `app.js`
- [ ] Écrans accueil / tri / fin / vide. Carte avec glisser (souris), tampons GARDER/SUPPRIMER, boutons ✕ ♥ ↺, clavier.
- [ ] Lecteur vidéo natif, repli « Ouvrir avec le lecteur Windows » si illisible.

### Task 6 : E2E — `tests/e2e/app.test.js`
- [ ] Dossier de test (images, vidéo lisible, vidéo illisible, .txt, sous-dossier) : garder, supprimer, annuler, glisser, fin, reprise, recommencer, vidage à la fermeture.

### Task 7 : Build et livraison
- [ ] `build/icon.png`, config electron-builder (`portable`, `TriPhotos.exe`).
- [ ] `.github/workflows/tri-photos.yml` (racine du dépôt) : tests Linux + build Windows, artefact, Release sur tag `tri-photos-v*`.
- [ ] `README.md` (mode d'emploi en français).

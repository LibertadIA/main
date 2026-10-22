const api = window.triPhotos;

const SWIPE_THRESHOLD = 110; // px à parcourir pour valider un glisser
const DRAG_START = 6; // px avant de considérer qu'on glisse (sinon c'est un clic)
const ANIMATION_MS = 260;
const VIDEO_CONTROLS_HEIGHT = 64; // zone des contrôles natifs, exclue du glisser

const $ = (id) => document.getElementById(id);
const screens = { home: $('home'), sorter: $('sorter'), end: $('end'), empty: $('empty') };
const els = {
  stage: $('stage'),
  folderName: $('folderName'),
  counter: $('counter'),
  progressBar: $('progressBar'),
  undo: $('undo'),
  toast: $('toast'),
};

let folder = null;
let items = [];
let index = 0;
let busy = false;
let preferMuted = true;
let drag = null;
let toastTimer = null;

function show(name) {
  for (const [key, screen] of Object.entries(screens)) screen.hidden = key !== name;
}

function plural(count, singular, pluralForm) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function formatSize(bytes) {
  const format = (value) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  if (bytes >= 1e9) return `${format(bytes / 1e9)} Go`;
  if (bytes >= 1e6) return `${format(bytes / 1e6)} Mo`;
  return `${Math.ceil(bytes / 1e3)} Ko`;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 3500);
}

// Dossier

async function pickFolder() {
  if (busy) return;
  busy = true;
  try {
    const result = await api.openFolder();
    if (result) startFolder(result);
  } catch {
    toast("Impossible d'ouvrir ce dossier.");
  } finally {
    busy = false;
  }
}

async function restartFolder() {
  if (busy) return;
  busy = true;
  try {
    const result = await api.restartFolder();
    if (result) startFolder(result);
  } finally {
    busy = false;
  }
}

function startFolder(result) {
  folder = result;
  items = result.items;
  index = result.index;
  els.folderName.textContent = result.folderName;
  els.folderName.title = result.folder;
  els.undo.disabled = !result.canUndo;

  if (result.totalInFolder === 0) {
    showEmpty('Aucune photo ni vidéo', `Le dossier « ${result.folderName} » ne contient aucun fichier à trier.`, false);
  } else if (items.length === 0) {
    showEmpty(
      'Tout est déjà trié',
      `Les ${plural(result.alreadySorted, 'fichier restant a', 'fichiers restants ont')} déjà été gardés lors d'un tri précédent.`,
      true,
    );
  } else {
    show('sorter');
    renderCards();
    if (result.alreadySorted > 0) toast(`Reprise du tri : ${plural(result.alreadySorted, 'fichier déjà gardé', 'fichiers déjà gardés')}.`);
  }
}

function showEmpty(title, text, canRestart) {
  $('emptyTitle').textContent = title;
  $('emptyText').textContent = text;
  $('restart').hidden = !canRestart;
  show('empty');
}

function showEnd(stats) {
  $('endFolder').textContent = folder.folderName;
  $('statKept').textContent = stats.kept;
  $('statDeleted').textContent = stats.deleted;
  $('statBytes').textContent = formatSize(stats.deletedBytes);
  $('errors').hidden = stats.errors.length === 0;
  $('errorList').replaceChildren(
    ...stats.errors.map((error) => {
      const li = document.createElement('li');
      li.textContent = `${error.name} : ${error.message}`;
      return li;
    }),
  );
  show('end');
}

// Cartes

function frontCard() {
  return els.stage.querySelector('.card.front');
}

function frontVideo() {
  return frontCard()?.querySelector('video') ?? null;
}

function renderCards(enterFrom = null) {
  drag = null;
  const next = items[index + 1];
  const cards = [];
  if (next) cards.push(buildCard(next, index + 1, true));
  const card = buildCard(items[index], index, false);
  cards.push(card);
  // Les cartes en train de s'envoler restent par-dessus jusqu'à la fin de leur animation.
  els.stage.replaceChildren(...cards, ...els.stage.querySelectorAll('.card.leaving'));

  els.counter.textContent = `${index + 1} / ${items.length}`;
  els.progressBar.style.width = `${(index / items.length) * 100}%`;
  preloadImage(items[index + 2]);

  if (enterFrom) {
    const direction = enterFrom === 'keep' ? 1 : -1;
    card.animate(
      [{ transform: `translateX(${direction * window.innerWidth}px) rotate(${direction * 25}deg)` }, { transform: 'none' }],
      { duration: ANIMATION_MS, easing: 'ease-out' },
    );
  }
}

function preloadImage(item) {
  if (item?.type === 'image') new Image().src = item.url;
}

function buildCard(item, itemIndex, isBack) {
  const card = document.createElement('article');
  card.className = isBack ? 'card back' : 'card front';
  card.dataset.name = item.name;

  const media = document.createElement('div');
  media.className = 'media';
  media.append(item.type === 'image' ? buildImage(item, media) : buildVideo(item, itemIndex, media, isBack));
  card.append(media);

  const caption = document.createElement('div');
  caption.className = 'caption';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = item.name;
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = `${item.type === 'video' ? 'Vidéo' : 'Photo'} · ${formatSize(item.size)}`;
  caption.append(name, meta);
  card.append(caption);

  if (!isBack) {
    for (const kind of ['keep', 'nope']) {
      const stamp = document.createElement('div');
      stamp.className = `stamp ${kind}`;
      stamp.textContent = kind === 'keep' ? 'GARDER' : 'SUPPRIMER';
      card.append(stamp);
    }
    attachDrag(card);
  }
  return card;
}

function buildImage(item, media) {
  const img = document.createElement('img');
  img.src = item.url;
  img.alt = item.name;
  img.draggable = false;
  img.addEventListener('error', () => media.replaceChildren(buildFallback('🖼️', 'Cette image ne peut pas être affichée.')));
  return img;
}

function buildVideo(item, itemIndex, media, isBack) {
  const video = document.createElement('video');
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  if (isBack) {
    video.muted = true;
  } else {
    video.controls = true;
    video.autoplay = true;
    video.muted = preferMuted;
    video.addEventListener('volumechange', () => {
      preferMuted = video.muted;
    });
  }
  const showUnsupported = () => {
    video.pause();
    const fallback = buildFallback('🎬', 'Cette vidéo ne peut pas être lue ici.');
    if (!isBack) {
      const button = document.createElement('button');
      button.className = 'secondary';
      button.textContent = 'Ouvrir avec le lecteur Windows';
      button.addEventListener('click', () => api.openExternal(itemIndex));
      fallback.append(button);
    }
    media.replaceChildren(fallback);
  };
  video.addEventListener('error', showUnsupported);
  // Codec vidéo non pris en charge (ex. certains HEVC) : seul le son serait lu.
  video.addEventListener('loadedmetadata', () => {
    if (video.videoWidth === 0) showUnsupported();
  });
  video.src = item.url;
  return video;
}

function buildFallback(icon, message) {
  const box = document.createElement('div');
  box.className = 'fallback';
  const iconEl = document.createElement('div');
  iconEl.className = 'icon';
  iconEl.textContent = icon;
  const text = document.createElement('p');
  text.textContent = message;
  box.append(iconEl, text);
  return box;
}

// Glisser à la souris

function cardTransform(dx, dy) {
  return `translate(${dx}px, ${dy * 0.3}px) rotate(${dx * 0.05}deg)`;
}

function setStamps(card, dx) {
  const strength = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
  card.querySelector('.stamp.keep').style.opacity = dx > 0 ? strength : 0;
  card.querySelector('.stamp.nope').style.opacity = dx < 0 ? strength : 0;
}

function isOnVideoControls(event) {
  const video = event.target.closest('video');
  return Boolean(video) && event.clientY > video.getBoundingClientRect().bottom - VIDEO_CONTROLS_HEIGHT;
}

function attachDrag(card) {
  card.addEventListener('pointerdown', (event) => {
    if (busy || event.button !== 0 || event.target.closest('button') || isOnVideoControls(event)) return;
    drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, active: false };
  });

  card.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.dx = event.clientX - drag.startX;
    drag.dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(drag.dx) < DRAG_START) return;
      drag.active = true;
      card.setPointerCapture(event.pointerId);
      card.classList.add('dragging');
    }
    card.style.transform = cardTransform(drag.dx, drag.dy);
    setStamps(card, drag.dx);
  });

  const release = (event, cancelled) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { dx, active } = drag;
    drag = null;
    card.classList.remove('dragging');
    // La carte a pu être remplacée pendant le glisser (flèche du clavier, annulation).
    if (!active || !card.classList.contains('front')) return;
    if (!cancelled && dx > SWIPE_THRESHOLD) commit('keep');
    else if (!cancelled && dx < -SWIPE_THRESHOLD) commit('delete');
    else snapBack(card);
  };
  card.addEventListener('pointerup', (event) => release(event, false));
  card.addEventListener('pointercancel', (event) => release(event, true));
}

function snapBack(card) {
  const from = card.style.transform;
  card.style.transform = '';
  setStamps(card, 0);
  card.animate([{ transform: from }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
}

// Décisions : la carte suivante s'affiche tout de suite, l'ancienne s'envole par-dessus.

async function commit(action) {
  if (busy || index >= items.length) return;
  busy = true;
  try {
    const state = await api.decide(action);
    flyAway(frontCard(), action);
    applyState(state);
  } catch {
    toast('Une erreur est survenue, réessaie.');
    renderCards();
  } finally {
    busy = false;
  }
}

function flyAway(card, action) {
  if (!card) return;
  const video = card.querySelector('video');
  if (video) {
    video.pause();
    video.muted = true;
  }
  card.classList.replace('front', 'leaving');
  const direction = action === 'keep' ? 1 : -1;
  setStamps(card, direction * SWIPE_THRESHOLD);
  const from = card.style.transform || 'none';
  const to = `translate(${direction * window.innerWidth}px, 40px) rotate(${direction * 25}deg)`;
  card
    .animate([{ transform: from }, { transform: to }], { duration: ANIMATION_MS, easing: 'ease-in', fill: 'forwards' })
    .finished.finally(() => card.remove());
}

function applyState(state) {
  index = state.index;
  els.undo.disabled = !state.canUndo;
  if (state.done) showEnd(state.stats);
  else renderCards();
}

async function undo() {
  if (busy) return;
  busy = true;
  try {
    const state = await api.undo();
    if (!state.undone) {
      toast('Rien à annuler.');
      return;
    }
    index = state.index;
    els.undo.disabled = !state.canUndo;
    renderCards(state.undone);
  } finally {
    busy = false;
  }
}

// Clavier et boutons

window.addEventListener(
  'keydown',
  (event) => {
    if (screens.sorter.hidden) return;
    const key = event.key.toLowerCase();
    // Garder une touche enfoncée ne doit pas trier des dizaines de fichiers d'un coup.
    if (event.repeat && key !== ' ') {
      event.preventDefault();
      return;
    }
    if (key === 'arrowright') {
      event.preventDefault();
      commit('keep');
    } else if (key === 'arrowleft') {
      event.preventDefault();
      commit('delete');
    } else if (((event.ctrlKey || event.metaKey) && key === 'z') || key === 'backspace') {
      event.preventDefault();
      undo();
    } else if (key === ' ') {
      event.preventDefault();
      const video = frontVideo();
      if (video) video.paused ? video.play() : video.pause();
    }
  },
  true,
);

for (const [id, handler] of [
  ['pick', pickFolder],
  ['change', pickFolder],
  ['endPick', pickFolder],
  ['emptyPick', pickFolder],
  ['restart', restartFolder],
  ['nope', () => commit('delete')],
  ['like', () => commit('keep')],
  ['undo', undo],
]) {
  const button = $(id);
  button.addEventListener('click', handler);
  // Évite qu'un bouton garde le focus et soit déclenché par Espace / Entrée.
  button.addEventListener('mousedown', (event) => event.preventDefault());
}

api.onTrashError((error) => toast(`Impossible de mettre « ${error.name} » à la corbeille.`));

const test = require('node:test');
const assert = require('node:assert/strict');
const { SortSession } = require('../../src/main/session');

function makeItems(count) {
  return Array.from({ length: count }, (_, i) => ({ name: `IMG_${i}.jpg`, path: `/photos/IMG_${i}.jpg`, type: 'image', size: 100 }));
}

function makeSession(count, options = {}) {
  const trashed = [];
  const session = new SortSession(makeItems(count), {
    trash: async (p) => { trashed.push(p); },
    ...options,
  });
  return { session, trashed };
}

test('garder et supprimer avancent dans la liste et comptent', async () => {
  const { session } = makeSession(5);
  assert.equal(session.current().name, 'IMG_0.jpg');
  session.decide('keep');
  session.decide('delete');
  assert.equal(session.index, 2);
  assert.equal(session.current().name, 'IMG_2.jpg');
  assert.deepEqual(session.stats(), { kept: 1, deleted: 1, deletedBytes: 100, errors: [] });
});

test('une suppression reste annulable tant qu\'elle est dans les derniers choix', async () => {
  const { session, trashed } = makeSession(20, { undoLimit: 3 });
  session.decide('delete'); // IMG_0
  session.decide('keep');
  session.decide('keep');
  await session.flushIdle();
  assert.deepEqual(trashed, []);
  session.decide('keep'); // IMG_0 sort des 3 derniers choix
  await session.flushIdle();
  assert.deepEqual(trashed, ['/photos/IMG_0.jpg']);
});

test('annuler revient au fichier précédent et retire la statistique', () => {
  const kept = [];
  const { session } = makeSession(5, {
    onKeep: (item) => kept.push(item.name),
    onUnkeep: (item) => kept.splice(kept.indexOf(item.name), 1),
  });
  session.decide('keep');
  session.decide('delete');
  assert.equal(session.undo(), 'delete');
  assert.equal(session.current().name, 'IMG_1.jpg');
  assert.equal(session.undo(), 'keep');
  assert.equal(session.current().name, 'IMG_0.jpg');
  assert.deepEqual(kept, []);
  assert.deepEqual(session.stats(), { kept: 0, deleted: 0, deletedBytes: 0, errors: [] });
  assert.equal(session.undo(), null);
});

test('une suppression annulée n\'est jamais envoyée à la corbeille', async () => {
  const { session, trashed } = makeSession(5, { undoLimit: 2 });
  session.decide('delete');
  session.undo();
  session.decide('keep');
  session.decide('keep');
  session.decide('keep');
  await session.flush();
  assert.deepEqual(trashed, []);
});

test('flush envoie toutes les suppressions en attente et bloque l\'annulation', async () => {
  const { session, trashed } = makeSession(5);
  session.decide('delete');
  session.decide('keep');
  session.decide('delete');
  await session.flush();
  assert.deepEqual(trashed, ['/photos/IMG_0.jpg', '/photos/IMG_2.jpg']);
  assert.equal(session.canUndo(), false);
  assert.equal(session.undo(), null);
});

test('le dernier choix termine le tri et vide les suppressions', async () => {
  const { session, trashed } = makeSession(2);
  session.decide('keep');
  session.decide('delete');
  assert.equal(session.isDone(), true);
  assert.equal(session.current(), null);
  assert.equal(session.canUndo(), false);
  await session.flushIdle();
  assert.deepEqual(trashed, ['/photos/IMG_1.jpg']);
});

test('un échec de corbeille est compté en erreur et signalé', async () => {
  const reported = [];
  const session = new SortSession(makeItems(3), {
    trash: async () => { throw new Error('fichier verrouillé'); },
    onTrashError: (error) => reported.push(error),
  });
  session.decide('delete');
  await session.flush();
  const expected = { name: 'IMG_0.jpg', message: 'fichier verrouillé' };
  assert.deepEqual(reported, [expected]);
  assert.deepEqual(session.stats(), { kept: 0, deleted: 0, deletedBytes: 0, errors: [expected] });
});

test('les suppressions partent dans l\'ordre, une à la fois', async () => {
  const events = [];
  const session = new SortSession(makeItems(3), {
    undoLimit: 0,
    trash: async (p) => {
      events.push(`start ${p}`);
      await new Promise((r) => setTimeout(r, 5));
      events.push(`end ${p}`);
    },
  });
  session.decide('delete');
  session.decide('delete');
  await session.flush();
  assert.deepEqual(events, ['start /photos/IMG_0.jpg', 'end /photos/IMG_0.jpg', 'start /photos/IMG_1.jpg', 'end /photos/IMG_1.jpg']);
});

test('une action inconnue est refusée', () => {
  const { session } = makeSession(1);
  assert.throws(() => session.decide('like'), /Action inconnue/);
});

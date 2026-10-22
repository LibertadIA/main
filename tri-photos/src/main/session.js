// Nombre de choix qu'on peut annuler. Une suppression ne part à la corbeille
// qu'une fois sortie de ces derniers choix (ou à la fin / à la fermeture).
const UNDO_LIMIT = 10;

class SortSession {
  constructor(items, { trash, undoLimit = UNDO_LIMIT, onKeep = () => {}, onUnkeep = () => {}, onTrashError = () => {} }) {
    this.items = items;
    this.index = 0;
    this._trash = trash;
    this._undoLimit = undoLimit;
    this._onKeep = onKeep;
    this._onUnkeep = onUnkeep;
    this._onTrashError = onTrashError;
    this._history = [];
    this._trashQueue = Promise.resolve();
    this._kept = 0;
    this._deleted = 0;
    this._deletedBytes = 0;
    this._errors = [];
  }

  get total() {
    return this.items.length;
  }

  current() {
    return this.items[this.index] ?? null;
  }

  isDone() {
    return this.index >= this.items.length;
  }

  canUndo() {
    return this._history.length > 0;
  }

  decide(action) {
    if (action !== 'keep' && action !== 'delete') throw new Error(`Action inconnue : ${action}`);
    const item = this.current();
    if (!item) return;
    this._history.push({ index: this.index, action });
    if (action === 'keep') {
      this._kept++;
      this._onKeep(item);
    } else {
      this._deleted++;
      this._deletedBytes += item.size;
    }
    this.index++;
    const settleCount = this.isDone() ? this._history.length : this._history.length - this._undoLimit;
    for (const entry of this._history.splice(0, Math.max(0, settleCount))) this._settle(entry);
  }

  // Renvoie l'action annulée ('keep' | 'delete') ou null s'il n'y a rien à annuler.
  undo() {
    const last = this._history.pop();
    if (!last) return null;
    const item = this.items[last.index];
    if (last.action === 'keep') {
      this._kept--;
      this._onUnkeep(item);
    } else {
      this._deleted--;
      this._deletedBytes -= item.size;
    }
    this.index = last.index;
    return last.action;
  }

  // Envoie toutes les suppressions en attente à la corbeille.
  async flush() {
    for (const entry of this._history.splice(0)) this._settle(entry);
    await this.flushIdle();
  }

  // Attend la fin des mises à la corbeille déjà lancées.
  flushIdle() {
    return this._trashQueue;
  }

  stats() {
    return { kept: this._kept, deleted: this._deleted, deletedBytes: this._deletedBytes, errors: [...this._errors] };
  }

  _settle(entry) {
    if (entry.action !== 'delete') return;
    const item = this.items[entry.index];
    this._trashQueue = this._trashQueue.then(async () => {
      try {
        await this._trash(item.path);
      } catch (err) {
        this._deleted--;
        this._deletedBytes -= item.size;
        const error = { name: item.name, message: err.message };
        this._errors.push(error);
        this._onTrashError(error);
      }
    });
  }
}

module.exports = { SortSession, UNDO_LIMIT };

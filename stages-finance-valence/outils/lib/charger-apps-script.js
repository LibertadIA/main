// Charge des fichiers Apps Script dans la portée globale de Node, comme Apps Script le fait :
// tous les fichiers d'un projet partagent la même portée globale.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DOSSIER_APPS_SCRIPT = path.join(__dirname, '..', '..', 'apps-script');

function chargerAppsScript(fichiers) {
  for (const fichier of fichiers) {
    const code = fs.readFileSync(path.join(DOSSIER_APPS_SCRIPT, fichier), 'utf8');
    vm.runInThisContext(code, { filename: fichier });
  }
  return globalThis;
}

module.exports = { chargerAppsScript, DOSSIER_APPS_SCRIPT };

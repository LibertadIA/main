// Assemble les fichiers Apps Script en un seul `dist/Code.gs`, à coller dans l'éditeur Apps Script.
const fs = require('node:fs');
const path = require('node:path');
const { DOSSIER_APPS_SCRIPT } = require('./lib/charger-apps-script');

// Menu.js en premier : l'éditeur Apps Script lance par défaut la première fonction du fichier (installer).
const ORDRE = ['Menu.js', 'Schema.js', 'Logique.js', 'Feuilles.js', 'Documents.js', 'Messagerie.js'];

function assembler() {
  return ORDRE.map((fichier) => {
    const code = fs.readFileSync(path.join(DOSSIER_APPS_SCRIPT, fichier), 'utf8');
    return '// ===== ' + fichier + ' =====\n' + code.trimEnd() + '\n';
  }).join('\n');
}

if (require.main === module) {
  const sortie = path.join(__dirname, '..', 'dist', 'Code.gs');
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, assembler());
  console.log('Écrit : ' + sortie);
}

module.exports = { assembler, ORDRE };

// Fausses versions minimales des services Google utilisés par le script, pour les tests d'intégration.

function installerFakesGoogle({ monEmail = 'lea.dupre@gmail.com', onglets = {}, fils = {}, fichiers = {}, pagesPdf = 1 } = {}) {
  const journal = { brouillons: [], brouillonsRelance: [], pdf: [], toasts: [], recherches: [] };

  const feuille = (nom) => ({
    getDataRange: () => ({ getValues: () => onglets[nom].map((ligne) => ligne.slice()) }),
    getRange: (ligne, colonne) => ({
      setValue: (valeur) => {
        while (onglets[nom].length < ligne) onglets[nom].push([]);
        onglets[nom][ligne - 1][colonne - 1] = valeur;
      }
    })
  });

  globalThis.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: (nom) => (onglets[nom] ? feuille(nom) : null),
      toast: (message) => journal.toasts.push(message)
    })
  };

  globalThis.Session = { getActiveUser: () => ({ getEmail: () => monEmail }) };

  const fil = (id) => ({
    getId: () => id,
    addLabel: () => {},
    getMessages: () => (fils[id] || []).map((m) => ({
      getFrom: () => m.de,
      getDate: () => m.date,
      isDraft: () => Boolean(m.estBrouillon),
      getPlainBody: () => m.corps || '',
      getHeader: () => m.idMessage || ''
    }))
  });

  let compteur = 0;
  globalThis.GmailApp = {
    getThreadById: (id) => (fils[id] ? fil(id) : null),
    getUserLabelByName: () => ({}),
    createLabel: () => ({}),
    search: (requete) => {
      journal.recherches.push(requete);
      return [];
    },
    createDraft: (a, objet, corps, options) => {
      compteur += 1;
      const idFil = 'fil-' + compteur;
      fils[idFil] = [{ de: monEmail, date: new Date(), estBrouillon: true, corps }];
      journal.brouillons.push({ a, objet, corps, options });
      return { getId: () => 'brouillon-' + compteur, getMessage: () => ({ getThread: () => fil(idFil) }) };
    }
  };

  globalThis.Gmail = {
    Users: {
      Drafts: {
        create: (ressource) => {
          journal.brouillonsRelance.push(ressource);
          return { id: 'relance-' + journal.brouillonsRelance.length };
        }
      }
    }
  };

  globalThis.Utilities = {
    Charset: { UTF_8: 'UTF-8' },
    base64Encode: (texte) => Buffer.from(texte, 'utf8').toString('base64'),
    base64EncodeWebSafe: (texte) => Buffer.from(texte, 'utf8').toString('base64url')
  };

  globalThis.MimeType = { PDF: 'application/pdf' };

  const dossier = {
    getId: () => 'dossier-1',
    getUrl: () => 'https://drive.google.com/drive/folders/dossier-1',
    getFilesByName: () => ({ hasNext: () => false }),
    createFile: (blob) => journal.pdf.push(blob.nom)
  };

  globalThis.DriveApp = {
    getFileById: (id) => {
      if (!fichiers[id]) throw new Error('Fichier introuvable : ' + id);
      return {
        getMimeType: () => fichiers[id],
        getName: () => id + '.html',
        getBlob: () => ({}),
        getParents: () => ({ next: () => dossier }),
        getAs: () => {
          const blob = {
            nom: null,
            setName: (nom) => { blob.nom = nom; return blob; },
            getDataAsString: () => '<< /Type /Page >>'.repeat(pagesPdf)
          };
          return blob;
        }
      };
    }
  };

  globalThis.Drive = {
    Files: {
      create: (ressource) => {
        const id = 'converti-' + ressource.name;
        fichiers[id] = 'application/vnd.google-apps.document';
        return { id };
      }
    }
  };

  const corps = {};
  for (const methode of ['setPageWidth', 'setPageHeight', 'setMarginTop', 'setMarginBottom', 'setMarginLeft', 'setMarginRight']) {
    corps[methode] = () => corps;
  }
  globalThis.DocumentApp = { openById: () => ({ getBody: () => corps, saveAndClose: () => {} }) };

  return { journal, onglets, fils };
}

module.exports = { installerFakesGoogle };

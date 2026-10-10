// Brouillons et lecture des fils Gmail (GmailApp, Gmail avancé).

function monEmail() {
  return Session.getActiveUser().getEmail();
}

function destinataireEffectif(ligne, reglages) {
  return reglages.modeTest ? monEmail() : String(ligne['Email']).trim();
}

function libelleGmail(nom) {
  return GmailApp.getUserLabelByName(nom) || GmailApp.createLabel(nom);
}

function creerBrouillonCandidature(ligne, reglages, pdfCv) {
  var brouillon = GmailApp.createDraft(
    destinataireEffectif(ligne, reglages),
    ligne['Objet'],
    corpsAvecSignature(ligne['Corps'], reglages.signature),
    { attachments: [pdfCv], name: reglages.prenomNom }
  );
  var fil = brouillon.getMessage().getThread();
  fil.addLabel(libelleGmail(reglages.libelle));
  return { idBrouillon: brouillon.getId(), idFil: fil.getId() };
}

function lireFil(idFil) {
  if (!idFil) return [];
  var fil;
  try {
    fil = GmailApp.getThreadById(idFil);
  } catch (e) {
    fil = null;
  }
  if (!fil) return [];
  return fil.getMessages().map(function (message) {
    return {
      de: message.getFrom(),
      date: message.getDate(),
      estBrouillon: message.isDraft(),
      corps: message.getPlainBody(),
      idMessage: message.getHeader('Message-ID')
    };
  });
}

function chercherFilEnvoye(ligne, reglages) {
  var fils = GmailApp.search(requeteFilEnvoye(destinataireEffectif(ligne, reglages), ligne['Objet']), 0, 1);
  return fils.length ? fils[0].getId() : null;
}

function creerBrouillonRelance(ligne, reglages, idMessageOrigine) {
  var brut = construireMimeRelance({
    a: destinataireEffectif(ligne, reglages),
    objet: ligne['Objet'],
    corps: corpsRelance(ligne, reglages),
    idMessageOrigine: idMessageOrigine
  }, function (texte) {
    return Utilities.base64Encode(texte, Utilities.Charset.UTF_8);
  });
  var brouillon = Gmail.Users.Drafts.create(
    { message: { raw: Utilities.base64EncodeWebSafe(brut), threadId: ligne['ID fil Gmail'] } },
    'me'
  );
  return brouillon.id;
}

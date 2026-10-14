// Récupération JSON avec nouvelles tentatives : la connexion sortante est parfois coupée ou renvoie une erreur amont.

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function recupererJson(url, { tentatives = 5, attenteMs = 1000, fetchImpl = fetch, attendre = dormir } = {}) {
  let derniereErreur;
  for (let essai = 1; essai <= tentatives; essai++) {
    try {
      const reponse = await fetchImpl(url);
      if (reponse.status >= 400 && reponse.status < 500 && reponse.status !== 429) {
        throw Object.assign(new Error('HTTP ' + reponse.status + ' sur ' + url), { definitive: true });
      }
      if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
      return JSON.parse(await reponse.text());
    } catch (erreur) {
      if (erreur.definitive) throw erreur;
      derniereErreur = erreur;
      if (essai < tentatives) await attendre(attenteMs * 2 ** (essai - 1));
    }
  }
  throw new Error('Échec après ' + tentatives + ' tentatives sur ' + url + ' : ' + derniereErreur.message);
}

module.exports = { recupererJson, dormir };

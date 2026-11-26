# JCI Présence

Plateforme de présence pour tous les événements JCI Comé Excellence : **un seul QR code**, collé à l'entrée, ouvre le formulaire de l'événement actif.

SvelteKit 5 · application monopage statique · Supabase (comptes partagés avec la billetterie) · hébergement Cloudflare Workers.

```
/                       page publique (QR code) : formulaire de l'événement actif
/admin                  événements : créer, modifier, activer, dupliquer
/admin/evenements/:id   présences : recherche, filtres, stats, ajout/suppression, export CSV
/admin/evenements/:id/emargement   liste d'émargement imprimable (PDF)
/admin/jci              liste des JCI locales / provinces
/admin/comptes          administrateurs
/admin/affiche          QR code + affiche A4
```

## Mise en route (≈ 20 minutes)

### 1. Base de données (Supabase)

1. Supabase → **SQL Editor** → coller et exécuter `sql/presence.sql`. Il crée le schéma `presence` (indépendant des tables de la billetterie) et peut être relancé sans risque.
2. Supabase → **Project Settings → API → Exposed schemas** : ajouter `presence`, puis enregistrer.
3. Créer le premier administrateur (un compte qui existe déjà dans la billetterie) :

```sql
insert into presence.admins (user_id, email)
select id, email from auth.users where lower(email) = lower('secretaire@exemple.org');
```

Les autres administrateurs s'ajoutent ensuite depuis l'application (menu **Comptes**), après avoir été invités dans l'administration de la billetterie (menu Membres).

### 2. Lancer en local

```bash
npm install
cp .env.example .env      # URL et clé "anon" du même projet Supabase que la billetterie
npm run dev               # http://localhost:5173
npm run check             # vérification des types
```

### 3. Déployer (GitHub → Cloudflare)

Domaine : **`presence.jcicomee.org`** (déjà déclaré dans `wrangler.jsonc`, avec `workers_dev` et `preview_urls` désactivés : une seule adresse publique, donc pas de doublon pour Google).

1. **GitHub** : dépôt **privé**, puis `git init -b main && git add . && git commit -m "JCI Présence" && git remote add origin … && git push -u origin main`.
2. **Cloudflare** → Workers & Pages → *Create* → *Import a repository*. Build : `npm run build` · Deploy : `npx wrangler deploy` · nom du Worker : `jci-presence` (même nom que dans `wrangler.jsonc`).
3. **Variables « Build »** (Settings → Variables and secrets → *Build*) : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé **anon** uniquement). `VITE_PUBLIC_URL` et `VITE_PASSWORD_RESET_URL` sont déjà dans `.env.production` (non secrets) ; une variable Cloudflare du même nom prend le dessus. Après tout changement de variable : relancer un build.
4. **Domaine** : au premier déploiement Cloudflare crée l'enregistrement DNS et le certificat. Condition : la zone `jcicomee.org` est dans le même compte, et il n'existe **aucun** enregistrement DNS `presence` créé à la main (le supprimer sinon).
5. **Imprimer l'affiche seulement après** : le QR code encode `VITE_PUBLIC_URL`. L'écran « Affiche QR » avertit si l'adresse est provisoire.
6. Test local sous Cloudflare : `npm run build && npx wrangler dev` ; déploiement sans Git : `npm run deploy` (après `npx wrangler login`).

### 4. Référencement Google

Ce qui est en place : balises `title`, `description`, Open Graph et Twitter dans `src/app.html` (lues aussi par WhatsApp et Facebook), `canonical` et pied de page avec lien vers jcicomee.org sur la page d'accueil, données structurées JSON-LD (Organization + WebSite), `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, image de partage `static/og-image.png` (1200×630). Tout `/admin` est exclu (`robots.txt`, en-tête `X-Robots-Tag`, balise `noindex`), ainsi que les adresses inconnues (`+error.svelte`).

À faire une fois en ligne, dans [Google Search Console](https://search.google.com/search-console) :

1. Ajouter la propriété **Domaine** `jcicomee.org` (vérification par enregistrement TXT dans le DNS Cloudflare) : elle couvre tous les sous-domaines. Si elle existe déjà pour le site principal, ne rien refaire.
2. *Sitemaps* → ajouter `https://presence.jcicomee.org/sitemap.xml`.
3. *Inspection d'URL* → `https://presence.jcicomee.org/` → **Demander une indexation**.

Si le domaine change : modifier `src/app.html`, `+page.svelte` (canonical), `static/robots.txt`, `static/sitemap.xml`, `wrangler.jsonc`, `.env.production`.

## Design

Même identité que l'administration de la billetterie : bleu nuit `#16103f`, fond lavande `#f5f6fb`, police Nunito (hébergée avec le site, aucun appel à Google), logo officiel (`static/logo.png` et `logo-dark.png`). Thème clair et sombre automatiques selon le téléphone.

- **Mobile d'abord** : champs de 52 px, bouton « Enregistrer » fixé en bas de l'écran, clavier adapté (téléphone, e-mail), navigation admin en barre du bas.
- **Accessibilité** : contrastes WCAG AA vérifiés, erreurs affichées sous chaque champ avec le curseur placé sur la première, zones tactiles de 44 px minimum, animation désactivée si le téléphone le demande. Audit automatique axe-core : aucune violation (28 vues, clair et sombre, mobile et bureau).
- **Écran de confirmation** : plein écran bleu nuit avec le nom, l'événement et l'heure, pratique comme preuve à l'entrée.

## Utilisation par le bureau

1. **Avant l'événement** : *Événements → Nouvel événement* (nom, date, lieu, fermeture automatique facultative), puis **Activer**.
2. **Pendant** : les participants scannent. Plusieurs événements actifs → une liste de choix s'affiche. Aucun → « Aucune inscription ouverte ».
3. **Après** : *Présences* → **Exporter Excel / CSV** ou **Liste d'émargement** → *Imprimer / enregistrer en PDF*. Puis **Désactiver** l'événement.
4. Pour un événement récurrent : **Dupliquer**, ajuster la date, activer.

## Règles de fonctionnement

- **Doublons** : même événement + même numéro. Les formats sont unifiés (`+229 01 97…`, `97…`, `0197…` = même personne).
- **Fermeture automatique** : un événement dont l'heure de fermeture est dépassée n'accepte plus d'inscription, sans action de personne.
- **Sécurité** : le public ne peut ni lire ni modifier les données ; il appelle uniquement `evenements_ouverts()` et `register()` (contrôlées côté base). Les droits d'administration sont vérifiés par la base (`presence.is_admin()`), pas par l'interface.
- **Anti-spam** : champ piège, délai minimum de remplissage, et plafond de 200 inscriptions/minute/événement côté base. Voir « Limites connues ».
- **Dates** : heure du Bénin (UTC+1).

## Limites connues

- **Pas de captcha Turnstile.** Une vérification Turnstile exige un contrôle côté serveur ; l'ajouter oblige à faire passer l'inscription par un petit point d'entrée serveur (Worker) et à retirer l'accès direct à `register()`. À faire seulement si du spam apparaît.
- `config.alias` (`$lib`) est déprécié dans SvelteKit 3 (fonctionne, avertissement au build). Migration vers les imports `#lib` à prévoir plus tard.
- Pas d'export PDF généré par le serveur : la liste d'émargement s'imprime depuis le navigateur.

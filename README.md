# Boutique en ligne

Application e-commerce MERN découpée en microservices : un front React, un backend Express et MongoDB,
un gateway, et deux microservices (notifications par mail, gestion du stock).

## Architecture

```
navigateur ── front React (site statique) ── /api ──> backend :5000 ── MongoDB
                                                         │
                                                         └─ clé interne ──> gateway :8000
                                                                              ├─ /notify ─────────> notifications :4002 ── SMTP
                                                                              └─ /update-stock ───> stock-management :4003 ── MongoDB
                                                                                 /restore-stock
```

- Le front ne parle qu'au backend, sous `/api` (même origine : cookie de session simple, pas de CORS).
- Le backend est le seul client du gateway. Gateway et microservices exigent l'en-tête `x-internal-key`,
  comparé en temps constant ; sans lui, ils répondent 401.
- Le microservice stock est le seul à modifier le stock lors d'une commande : décrément atomique, tout ou
  rien. Le backend rend le stock d'une commande annulée, supprimée ou non enregistrée.

## Environnements

| | Production (branche main) | Préproduction (branche develop) |
|---|---|---|
| Boutique | https://examen.mywatchbuddy.com | https://preprod.examen.mywatchbuddy.com |
| Santé de toute la chaîne | /api/health/deep | /api/health/deep |
| Backend, gateway, stock | Render, `ccasa-ecom-*-prod` | Render, `ccasa-ecom-*-preprod` |
| Notifications | https://examen311.mywatchbuddy.com (Hostinger) | https://preprodexamen311.mywatchbuddy.com |
| Base | Atlas, `ecommerce_prod` | Atlas, `ecommerce_preprod` |

Render est décrit dans `render.yaml` (Blueprint). Les notifications tournent chez Hostinger parce que
Render gratuit bloque le SMTP sortant.

## Lancer en local

Avec Docker (tout compris, mails visibles dans Mailpit) :

```bash
cp .env.example .env   # remplir JWT_SECRET, INTERNAL_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build -d
docker compose exec backend node seeder.js
```

Boutique sur http://localhost:3000, mails sur http://localhost:8025.

Sans Docker : Node 24 (le front demande au moins 22.12), un MongoDB local, un `.env` par service (copier
chaque `.env.example`), puis :

```bash
npm install && npm run start:all
```

## Mise en production

1. Atlas : un cluster, puis une base et un utilisateur limité à `readWrite` sur cette base, par
   environnement (`ecommerce_prod`, `ecommerce_preprod`). Produits et compte admin, depuis `backend/` :
   `MONGO_URI=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node seeder.js` (mot de passe de 12 caractères au moins).
2. Render : New, Blueprint sur ce dépôt, branche main. `render.yaml` crée les 8 services et les deux groupes
   de variables. Saisir `MONGO_URI` sur le backend et le stock de chaque environnement (même URI pour les deux).
3. Hostinger : une appli Node.js par environnement depuis ce dépôt (branche main ou develop), répertoire
   racine `microservices/notifications`, fichier d'entrée `index.js`, variables de son `.env.example`.
   `INTERNAL_API_KEY` y prend la même valeur que dans le groupe de variables Render de l'environnement.
4. DNS : CNAME `examen` et `preprod.examen` vers les deux fronts `onrender.com`, puis Custom Domains sur Render.
5. GitHub : secrets `RENDER_DEPLOY_HOOK_{BACKEND,GATEWAY,STOCK,FRONT}_{PROD,PREPROD}` (Deploy Hook de chaque
   service), variables `FRONT_URL_PROD`, `FRONT_URL_PREPROD` et `SECURITE_BLOQUANTE=oui`.

## Variables d'environnement

Chaque service a son `.env.example` commenté : `backend/`, `gateway/`, `microservices/notifications/`,
`microservices/stock-management/`, et la racine pour docker compose. Chaque service valide sa configuration
au démarrage (Joi) et refuse de démarrer si elle est incomplète. `INTERNAL_API_KEY` a la même valeur dans
les quatre services d'un environnement, et `MONGO_URI` la même valeur dans le backend et le stock.

## API

| Méthode | Route | Accès |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public, pose le cookie de session |
| POST | /api/auth/logout | public |
| GET | /api/auth/me | public, `{ user }` ou `{ user: null }` |
| GET | /api/products | public |
| PUT | /api/products/:productId/stock | admin |
| POST | /api/orders | client connecté |
| GET | /api/orders/mine | client connecté |
| GET | /api/orders | admin |
| PUT | /api/orders/:orderId/status | admin |
| PUT | /api/orders/:orderId/validate | admin |
| DELETE | /api/orders/:orderId | admin |
| GET | /health, /api/health, /api/health/deep | public |

Les erreurs sont en JSON `{ message }` ; une validation refusée ajoute `errors: [{ field, message }]`.

## Tests

```bash
cd backend && MONGO_URI_TEST=mongodb://127.0.0.1:27017/test npm test
cd gateway && npm test
cd microservices/notifications && npm install --include=dev && npm test
cd microservices/stock-management && npm test
cd frontend && npm test
```

Le backend a besoin d'un MongoDB de test ; le gateway et les microservices non (le stock est testé avec un
modèle simulé).

## Pipeline

`.github/workflows/ci.yml`, sur push et pull request vers develop et main :

1. tests et audit npm de production pour les cinq composants ;
2. sur push : cinq images Docker construites, analysées par Trivy, publiées sur GHCR (tag de branche et sha) ;
3. déploiement Render de l'environnement de la branche par hook, avec l'image exacte du commit, puis test
   de fumée : le backend doit répondre avec le sha du commit, puis toute la chaîne doit répondre ok.

Avec la variable de dépôt `SECURITE_BLOQUANTE=oui`, une vulnérabilité high ou critical (npm audit) ou
critical corrigeable (Trivy) fait échouer le pipeline. Dependabot propose les mises à jour chaque semaine.

## Supervision

`.github/workflows/monitoring.yml` : les deux fronts toutes les 10 minutes (code 200, contenu, temps de
réponse, certificat), la chaîne complète toutes les 6 heures. Un échec envoie un mail GitHub.

## Documentation du code

```bash
cd backend && npm run docs   # site JSDoc dans backend/docs, cette page en accueil
```

Historique des versions : `CHANGELOG.md`. Scénario de contrôle avant et après correctifs :
`docs/scenario.sh`, sorties dans `docs/`.

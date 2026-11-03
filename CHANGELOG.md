# Changelog

Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## [À venir]

- Accès Atlas limité aux adresses IP de Render au lieu de 0.0.0.0/0.
- Sauvegarde planifiée des bases (mongodump), Atlas gratuit n'en fait pas.
- Content-Security-Policy sur les fronts.
- Restauration du stock quand une commande expédiée revient.

## [1.2.0] - 2026-11-03

Session code : failles, bugs, contrôle des entrées, dépendances, documentation.

### Sécurité

- Session dans un cookie HttpOnly, Secure et SameSite=Strict : le jeton n'est plus renvoyé dans le corps
  de la réponse ni stocké dans le localStorage.
- Validation Joi de toutes les entrées (types stricts, champs inconnus retirés) et `sanitizeFilter` de
  Mongoose : l'injection NoSQL `{"$gt": ""}` au login est refusée en 400.
- Prix et total d'une commande recalculés depuis la base : un prix envoyé par le client est ignoré.
- Même réponse 401 pour un compte inconnu et un mauvais mot de passe, avec un temps de réponse égal :
  plus d'énumération des comptes.
- Limitation de débit : 10 échecs de connexion par compte et par adresse IP sur 15 minutes, 20 inscriptions
  par adresse, 600 requêtes par adresse sur l'API.
- En-têtes de sécurité avec helmet.
- `DELETE /api/orders/:orderId` réservé aux administrateurs.
- Statut de commande limité à la liste du schéma ; une commande annulée ne change plus de statut.
- Nom d'utilisateur limité aux lettres, chiffres et `. _ -`, adresse sans `<` ni `>` : plus de HTML stocké.
- Rôle limité à `user` et `admin`, jamais lu dans la requête d'inscription.
- Dépendances à jour, `npm audit --omit=dev` à 0 sur les cinq composants (Express 5, bcryptjs 3, front
  sous Vite).

### Corrigé

- Stock jamais décrémenté : le microservice stock réserve le stock de chaque commande, en tout ou rien,
  et le rend à l'annulation ou à la suppression.
- `deleteOrder` ne répondait jamais ; `validateOrder` ne changeait rien.
- Inscription avec des champs vides ou un nom déjà pris : 400 et 409 au lieu de 500.
- Commande sans adresse ni paiement : 400 avec la liste des champs au lieu de 500.
- Jeton invalide ou expiré : 401 au lieu de 403.
- Identifiant mal formé : 400 au lieu de 500.
- Mail de commande envoyé au client, avec le nom, la quantité et le prix de chaque article ; l'admin
  garde sa copie. Le client reçoit aussi un mail à chaque changement de statut.

### Ajouté

- `GET /api/orders/mine` et la page Mes commandes : le client suit le statut de ses commandes.
- `GET /api/auth/me` et `POST /api/auth/logout`.
- Lien Administration dans la barre de navigation pour les administrateurs.
- Route `/restore-stock` dans le gateway.
- Tests : 12 de commandes et 9 d'authentification dans le backend, 23 dans le microservice stock,
  18 dans le front (Vitest).
- Documentation JSDoc du backend (`npm run docs`), README, ce changelog, scénario de contrôle
  `docs/scenario.sh` avec ses sorties avant et après correctifs.

### Supprimé

- `routes/adminRoutes.js` et `controllers/adminController.js` : jamais montés, ils appelaient
  `localhost:3001` et posaient un statut hors de la liste. L'administration passe par `/api/orders` et
  `/api/products`, protégés par `isAdmin`.
- axios et debug dans le backend.

## [1.1.0] - 2026-11-03

Session mise en production.

### Ajouté

- Dockerfiles multi-stage non-root avec healthcheck pour les cinq composants, docker compose complet
  avec Mailpit.
- Pipeline GitHub Actions : tests, audit, images analysées par Trivy et publiées sur GHCR, déploiement
  Render par hook avec l'image du commit, tests de fumée.
- `render.yaml` (Blueprint) : préproduction sur develop, production sur main.
- Supervision planifiée des fronts et de la chaîne complète, Dependabot.
- Validation de la configuration au démarrage de chaque service, journaux Winston, `/health` sur chaque
  service et `/api/health/deep` pour toute la chaîne.
- Clé interne entre le backend, le gateway et les microservices.

### Modifié

- Microservice notifications hébergé chez Hostinger (Render gratuit bloque le SMTP sortant).
- URL du gateway, des microservices et de l'API en variables d'environnement.
- CORS limité aux origines des fronts.

### Supprimé

- Jeton, mot de passe et URI Mongo écrits dans les logs.

## [1.0.0] - 2026-11-03

État d'origine du code fourni pour l'examen.

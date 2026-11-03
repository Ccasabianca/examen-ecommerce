# Front React (Vite)

Boutique en React 19, React Router 7 et Tailwind CSS 3, construite avec Vite.

## Commandes

| Commande | Rôle |
|---|---|
| `npm install` | installe les dépendances |
| `npm start` (ou `npm run dev`) | serveur de dev sur http://localhost:3000, `/api` relayé vers le backend sur le port 5000 |
| `npm test` | tests Vitest et Testing Library |
| `npm run lint` | ESLint |
| `npm run build` | build de production dans `build/` |
| `npm run preview` | sert la build localement |

## Configuration

`REACT_APP_API_URL` (lue à la build, `/api` par défaut) : adresse de l'API. En production, le front et l'API
partagent la même origine (réécriture Render ou nginx), donc `/api` suffit.

## Session

Le backend pose un cookie HttpOnly à la connexion : le jeton n'est jamais lisible par le JavaScript du
navigateur. `AuthProvider` lit la session avec `GET /api/auth/me` au chargement ; une réponse 401 pendant la
navigation ferme la session côté client.

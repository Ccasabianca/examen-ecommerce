// src/services/config.js
// fix : url de l'api fixée à la build (REACT_APP_API_URL), avant http://localhost:5000 en dur dans 4 fichiers
// /api par défaut : même origine (proxy de vite en dev, nginx ou réécriture render en prod)
export const API_BASE_URL = import.meta.env.REACT_APP_API_URL || '/api';

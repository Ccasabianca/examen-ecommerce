import { useContext } from 'react';
import { AuthContext } from '../context/auth-context';

/** accès à la session (utilisateur, chargement, connexion, déconnexion) */
export default function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return ctx;
}

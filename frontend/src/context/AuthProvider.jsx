import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/api';
import { AuthContext } from './auth-context';

/** fournit la session (cookie httponly vérifié par /api/auth/me) à toute l'application */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // fix : plus de jeton ni de rôle dans localstorage, la session est lue auprès du serveur au chargement
  useEffect(() => {
    let cancelled = false;
    authApi
      .getSession()
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // session expirée ou invalide pendant la navigation (401 signalé par l'intercepteur axios)
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const { username, role } = res.data;
    setUser({ username, role });
    return { username, role };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // serveur injoignable : la session est fermée côté client quand même
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import { AuthContext } from '../context/auth-context';

function renderAt(path, auth) {
  const value = { user: null, loading: false, isAuthenticated: false, isAdmin: false, ...auth };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>Accueil</p>} />
          <Route path="/login" element={<p>Page de connexion</p>} />
          <Route path="/order" element={<ProtectedRoute><p>Commande</p></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><p>Administration</p></AdminRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('routes protégées', () => {
  test('pas de redirection tant que la session est en cours de vérification', () => {
    renderAt('/order', { loading: true });
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
    expect(screen.queryByText('Page de connexion')).not.toBeInTheDocument();
  });

  test('sans session, la commande renvoie vers la connexion', () => {
    renderAt('/order', {});
    expect(screen.getByText('Page de connexion')).toBeInTheDocument();
  });

  test("un client connecté n'entre pas dans l'administration", () => {
    renderAt('/admin', { user: { username: 'alice', role: 'user' }, isAuthenticated: true });
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });

  test("un admin entre dans l'administration", () => {
    renderAt('/admin', {
      user: { username: 'admin', role: 'admin' },
      isAuthenticated: true,
      isAdmin: true,
    });
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });
});

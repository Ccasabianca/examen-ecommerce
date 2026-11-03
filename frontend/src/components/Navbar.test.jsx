import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { CartProvider } from '../context/CartContext';
import { AuthContext } from '../context/auth-context';

function renderNavbar(auth = {}) {
  const value = {
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...auth,
  };
  return render(
    <AuthContext.Provider value={value}>
      <CartProvider>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </CartProvider>
    </AuthContext.Provider>
  );
}

describe('barre de navigation', () => {
  test("sans session : l'application, le panier et la connexion", () => {
    renderNavbar();
    expect(screen.getByText('Mon Application')).toBeInTheDocument();
    expect(screen.getByText('Panier')).toBeInTheDocument();
    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.queryByText('Mes commandes')).not.toBeInTheDocument();
  });

  test('avec session : le nom, mes commandes et la déconnexion', () => {
    renderNavbar({ user: { username: 'alice', role: 'user' }, isAuthenticated: true });
    expect(screen.getByText('Bonjour, alice')).toBeInTheDocument();
    expect(screen.getByText('Mes commandes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument();
    expect(screen.queryByText('Connexion')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  test('admin : lien vers la page d\'administration', () => {
    renderNavbar({ user: { username: 'patron', role: 'admin' }, isAuthenticated: true, isAdmin: true });
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin');
  });
});

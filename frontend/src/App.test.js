import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import { CartProvider } from './context/CartContext';

// fix : le test par défaut de create react app cherchait un lien "learn react" qui n'existe plus
test("la barre de navigation affiche l'application, le panier et la connexion", () => {
  render(
    <CartProvider>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </CartProvider>
  );
  expect(screen.getByText('Mon Application')).toBeInTheDocument();
  expect(screen.getByText('Panier')).toBeInTheDocument();
  expect(screen.getByText('Connexion')).toBeInTheDocument();
});

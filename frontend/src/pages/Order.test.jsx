import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Order from './Order';
import { CartContext } from '../context/CartContext';
import { createOrder } from '../services/api';

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal()),
  createOrder: vi.fn(),
}));

function renderOrder(dispatch = vi.fn()) {
  const value = {
    cart: [
      { id: 'p1', _id: 'p1', name: 'Clavier Mécanique', price: 120, stock: 15, quantity: 2 },
      { id: 'p2', _id: 'p2', name: 'Tablette', price: 400, stock: 25, quantity: 1 },
    ],
    shippingAddress: { street: '1 rue de la Paix', city: 'Paris', postalCode: '75002', country: 'France' },
    shippingMethod: 'colissimo',
    paymentMethod: 'Carte bancaire',
    dispatch,
  };
  render(
    <CartContext.Provider value={value}>
      <MemoryRouter initialEntries={['/order']}>
        <Routes>
          <Route path="/order" element={<Order />} />
          <Route path="/mes-commandes" element={<p>Page mes commandes</p>} />
        </Routes>
      </MemoryRouter>
    </CartContext.Provider>
  );
  return dispatch;
}

describe('confirmation de commande', () => {
  beforeEach(() => {
    createOrder.mockReset();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    window.alert.mockRestore();
  });

  test('envoie seulement le produit et la quantité, puis ouvre le suivi des commandes', async () => {
    createOrder.mockResolvedValue({ data: { message: 'Commande créée avec succès' } });
    const dispatch = renderOrder();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    expect(createOrder).toHaveBeenCalledTimes(1);
    const sent = createOrder.mock.calls[0][0];
    expect(sent.items).toEqual([
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ]);
    expect(sent).not.toHaveProperty('total');
    expect(sent.paymentMethod).toBe('Carte bancaire');
    expect(sent.shippingMethod).toBe('colissimo');
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_CART' });
    expect(await screen.findByText('Page mes commandes')).toBeInTheDocument();
  });

  test('bouton désactivé pendant l’envoi, pas de double commande', async () => {
    let finish;
    createOrder.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderOrder();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la commande' }));
    const button = screen.getByRole('button', { name: 'Commande en cours...' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(createOrder).toHaveBeenCalledTimes(1);

    finish({ data: {} });
    expect(await screen.findByText('Page mes commandes')).toBeInTheDocument();
  });

  test('affiche le message du serveur et garde le panier en cas de refus', async () => {
    createOrder.mockRejectedValue({
      response: { status: 409, data: { message: 'Stock insuffisant pour Tablette' } },
    });
    const dispatch = renderOrder();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    expect(window.alert).toHaveBeenCalledWith('Erreur : Stock insuffisant pour Tablette');
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmer la commande' })).toBeEnabled();
  });
});

import { cartReducer, initialCartState } from './CartContext';

const product = { id: 'p1', name: 'Clavier Mécanique', price: 120 };

describe('reducer du panier', () => {
  test('ajoute un produit avec une quantité de 1', () => {
    const state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { ...product, quantity: 1 },
    });
    expect(state.cart).toEqual([{ ...product, quantity: 1 }]);
  });

  test("incrémente la quantité sans modifier l'état précédent", () => {
    const first = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { ...product, quantity: 1 },
    });
    // un article gelé : toute modification en place lèverait une erreur
    Object.freeze(first.cart[0]);
    Object.freeze(first.cart);

    const second = cartReducer(first, { type: 'ADD_TO_CART', payload: { id: 'p1', quantity: 1 } });

    expect(second.cart[0].quantity).toBe(2);
    expect(first.cart[0].quantity).toBe(1);
    expect(second.cart[0]).not.toBe(first.cart[0]);
  });

  test('la quantité ne descend pas sous 1, retrait et vidage du panier', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { ...product, quantity: 1 },
    });
    state = cartReducer(state, { type: 'DECREMENT_QUANTITY', payload: { id: 'p1' } });
    expect(state.cart[0].quantity).toBe(1);

    state = cartReducer(state, {
      type: 'ADD_TO_CART',
      payload: { id: 'p2', name: 'Tablette', price: 400, quantity: 1 },
    });
    state = cartReducer(state, { type: 'REMOVE_FROM_CART', payload: { id: 'p1' } });
    expect(state.cart.map((item) => item.id)).toEqual(['p2']);

    state = cartReducer(state, { type: 'CLEAR_CART' });
    expect(state.cart).toEqual([]);
  });

  test("livraison et paiement valent l'option affichée par défaut", () => {
    expect(initialCartState.shippingMethod).toBe('colissimo');
    expect(initialCartState.paymentMethod).toBe('Carte bancaire');
  });
});

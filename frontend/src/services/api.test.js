import api, { createOrder, getErrorMessage } from './api';

describe('services/api', () => {
  afterEach(() => vi.restoreAllMocks());

  test("createOrder n'envoie ni prix ni total, même si le panier en contient", async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const shippingAddress = { street: '1 rue', city: 'Paris', postalCode: '75002', country: 'France' };

    await createOrder({
      items: [{ productId: 'p1', quantity: 2, price: 0.01 }],
      total: 0.02,
      shippingAddress,
      paymentMethod: 'PayPal',
      shippingMethod: 'chronopost',
    });

    expect(post).toHaveBeenCalledWith('/orders', {
      items: [{ productId: 'p1', quantity: 2 }],
      shippingAddress,
      paymentMethod: 'PayPal',
      shippingMethod: 'chronopost',
    });
  });

  test('getErrorMessage : détail de validation, message du serveur, réseau, défaut', () => {
    const validation = {
      response: {
        data: {
          message: 'Données invalides',
          errors: [
            { field: 'username', message: "Le nom d'utilisateur est obligatoire" },
            { field: 'email', message: "L'email est invalide" },
          ],
        },
      },
    };
    expect(getErrorMessage(validation)).toBe(
      "Le nom d'utilisateur est obligatoire\nL'email est invalide"
    );
    expect(getErrorMessage({ response: { data: { message: 'Identifiants invalides' } } })).toBe(
      'Identifiants invalides'
    );
    expect(getErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/Impossible de joindre le serveur/);
    expect(getErrorMessage({}, 'Échec')).toBe('Échec');
  });

  test('cookie de session envoyé avec chaque requête, délai long pour le réveil des services', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout).toBeGreaterThanOrEqual(120000);
    expect(api.defaults.baseURL).toBe('/api');
  });
});

// src/pages/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { fetchProducts, getErrorMessage } from '../services/api';
import { useCart } from '../context/CartContext';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const { dispatch } = useCart();

  useEffect(() => {
    // fix : message affiché si l'api ne répond pas, avant la promesse rejetée n'était pas gérée
    fetchProducts()
      .then((response) => setProducts(response.data))
      .catch((err) => setError(getErrorMessage(err, 'Impossible de charger les produits.')));
  }, []);

  const addToCart = (product) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: { ...product, id:product._id, quantity: 1 }, // Ajoute +1 à la quantité
    });
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Liste des Produits</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          // fix : clé stable, product.id n'existe pas (mongodb renvoie _id)
          <li key={product._id} className="border p-4 rounded shadow">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-gray-500">{product.price} €</p>
            <button
              onClick={() => addToCart(product)}
              className="bg-green-500 text-white px-4 py-2 mt-2 rounded"
            >
              Ajouter au panier
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductList;

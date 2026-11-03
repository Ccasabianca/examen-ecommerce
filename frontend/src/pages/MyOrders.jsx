// src/pages/MyOrders.jsx
// fix : suivi des commandes côté client, avant aucune page ne montrait le statut après l'achat
import React, { useEffect, useState } from "react";
import { getMyOrders, getErrorMessage } from "../services/api";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyOrders()
      .then((response) => setOrders(response.data))
      .catch((err) =>
        setError(getErrorMessage(err, "Impossible de charger vos commandes."))
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Mes commandes</h2>
      {loading && <p className="text-gray-600">Chargement...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="text-gray-600">Vous n&apos;avez pas encore passé de commande.</p>
      )}
      <ul>
        {orders.map((order) => (
          <li key={order._id} className="border p-4 mb-4 rounded shadow">
            <p>
              <strong>Commande :</strong> {order._id}
            </p>
            {order.createdAt && (
              <p>
                <strong>Date :</strong>{" "}
                {new Date(order.createdAt).toLocaleString("fr-FR")}
              </p>
            )}
            <p>
              <strong>Statut :</strong> {order.status}
            </p>
            <table className="w-full border-collapse border border-gray-300 mt-2">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2">Produit</th>
                  <th className="border border-gray-300 p-2">Quantité</th>
                  <th className="border border-gray-300 p-2">Prix Unitaire (€)</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={item._id || index}>
                    <td className="border border-gray-300 p-2">
                      {item.name || item.productId}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {Number(item.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-bold mt-2">
              Total : {Number(order.total).toFixed(2)} €
            </p>
            {order.shippingAddress && (
              <p className="text-gray-600 mt-2">
                Livraison : {order.shippingAddress.street},{" "}
                {order.shippingAddress.postalCode} {order.shippingAddress.city},{" "}
                {order.shippingAddress.country} ({order.shippingMethod},{" "}
                {order.paymentMethod})
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyOrders;

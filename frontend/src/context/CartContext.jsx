import React, { createContext, useContext, useReducer } from "react";

export const CartContext = createContext();

export const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const exists = state.cart.some((item) => item.id === action.payload.id);

      // fix : nouvel objet pour l'article modifié, avant la quantité était changée en place dans l'état
      if (exists) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
              : item
          ),
        };
      }

      return {
        ...state,
        cart: [...state.cart, { ...action.payload, quantity: 1 }],
      };
    }

    case "DECREMENT_QUANTITY":
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(item.quantity - 1, 1) } // Ne peut pas être inférieur à 1
            : item
        ),
      };

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload.id),
      };

    case "CLEAR_CART":
      return { ...state, cart: [] };

    case "SET_SHIPPING_METHOD":
      return { ...state, shippingMethod: action.payload };

    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.payload };
    case "SET_SHIPPING_ADDRESS":
      return { ...state, shippingAddress: action.payload };
    default:
      return state;
  }
};

// fix : livraison et paiement valent l'option affichée par défaut, avant null tant qu'on ne changeait pas de choix
export const initialCartState = {
  cart: [],
  shippingMethod: "colissimo",
  paymentMethod: "Carte bancaire",
  shippingAddress: {
    street: "",
    city: "",
    postalCode: "",
    country: "",
  },
};

export const CartProvider = ({ children }) => {

  const [cartState, dispatch] = useReducer(cartReducer, initialCartState);

  return (
    <CartContext.Provider value={{ ...cartState, dispatch }}>
      {children}
    </CartContext.Provider>
  );

};

export const useCart = () => useContext(CartContext);

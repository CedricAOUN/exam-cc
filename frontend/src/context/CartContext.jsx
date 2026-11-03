import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

/**
 * Pure reducer for the cart. Quantities are capped by product stock and out-of-stock
 * products cannot be added. Also stores the shipping address and shipping/payment methods.
 */
export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingProductIndex = state.cart.findIndex((item) => item.id === action.payload.id);

      if (existingProductIndex >= 0) {
        const updatedCart = [...state.cart];
        const existing = updatedCart[existingProductIndex];
        updatedCart[existingProductIndex] = {
          ...existing,
          quantity: Math.min(
            existing.quantity + (action.payload.quantity || 1),
            existing.stock ?? Infinity,
          ),
        };
        return { ...state, cart: updatedCart };
      } else {
        if (action.payload.stock <= 0) return state;
        return {
          ...state,
          cart: [...state.cart, { ...action.payload, quantity: 1 }],
        };
      }
    }
    case 'DECREMENT_QUANTITY':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(item.quantity - 1, 1) } // Ne peut pas être inférieur à 1
            : item,
        ),
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload.id),
      };

    case 'RESET_CART':
      return {
        cart: [],
        shippingMethod: 'colissimo',
        paymentMethod: 'Carte bancaire',
        shippingAddress: { street: '', city: '', postalCode: '', country: '' },
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'SET_SHIPPING_METHOD':
      return { ...state, shippingMethod: action.payload };

    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_SHIPPING_ADDRESS':
      return { ...state, shippingAddress: action.payload };
    default:
      return state;
  }
};

/** Provides cart state and `dispatch` to the app. */
export const CartProvider = ({ children }) => {
  const [cartState, dispatch] = useReducer(cartReducer, {
    cart: [],
    shippingMethod: 'colissimo',
    paymentMethod: 'Carte bancaire',
    shippingAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    },
  });

  return <CartContext.Provider value={{ ...cartState, dispatch }}>{children}</CartContext.Provider>;
};

/** Hook returning the cart context (`cart`, `dispatch`, address and methods). */
export const useCart = () => useContext(CartContext);

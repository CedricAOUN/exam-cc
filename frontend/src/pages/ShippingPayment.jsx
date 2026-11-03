import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShippingMethodSelection from '../components/ShippingMethodSelection';
import PaymentMethodSelection from '../components/handlePaymentChange';
import ShippingAddress from '../components/ShippingAddress';
import { useCart } from '../context/CartContext';

/**
 * Checkout step: collects the shipping address, shipping method and payment
 * method before the order summary.
 */
const ShippingPayment = () => {
  const navigate = useNavigate();
  const { cart, shippingAddress, dispatch } = useCart();
  const [error, setError] = useState('');
  const handleSubmitOrder = (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      setError('Votre panier est vide. Ajoutez un produit avant de continuer.');
      return;
    }
    const address = Object.fromEntries(
      Object.entries(shippingAddress).map(([key, value]) => [key, value.trim()]),
    );
    if (Object.values(address).some((value) => !value)) {
      setError('Renseignez tous les champs de l’adresse de livraison.');
      return;
    }
    dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: address });
    navigate('/order');
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Livraison et Paiement</h2>
      {error && (
        <p role="alert" className="text-red-600 mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <ShippingAddress />
          </div>
          <div>
            <ShippingMethodSelection />
            <PaymentMethodSelection />
          </div>
        </div>
        <hr className="my-4" />
        <div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Passer une commande
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShippingPayment;

import React from 'react';
import { useCart } from '../context/CartContext';

const ShippingAddress = () => {
  const { shippingAddress, dispatch } = useCart();
  // Keep the fields and order summary in sync through the shared cart state.
  const handleAddressChange = ({ target: { name, value } }) => {
    dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { ...shippingAddress, [name]: value } });
  };

  return (
    <div className="border p-4 rounded-md">
      <h3 className="text-lg font-semibold mb-2">Adresse de livraison</h3>
      <div className="space-y-2">
        <div>
          <label htmlFor="street" className="block text-sm font-medium text-gray-700">
            Rue
          </label>
          <input
            type="text"
            id="street"
            name="street"
            value={shippingAddress.street}
            required
            maxLength={200}
            autoComplete="street-address"
            onChange={handleAddressChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            Ville
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={shippingAddress.city}
            required
            maxLength={100}
            autoComplete="address-level2"
            onChange={handleAddressChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            Code Postal
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={shippingAddress.postalCode}
            required
            maxLength={20}
            autoComplete="postal-code"
            onChange={handleAddressChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Pays
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={shippingAddress.country}
            required
            maxLength={100}
            autoComplete="country-name"
            onChange={handleAddressChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ShippingAddress;

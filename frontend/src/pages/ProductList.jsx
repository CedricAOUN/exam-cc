// src/pages/ProductList.js
import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../services/api';
import { useCart } from '../context/CartContext';

/**
 * Public catalogue (routes / and /products): handles loading, empty and error
 * states and lets users add products to the cart.
 */
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { dispatch } = useCart();

  useEffect(() => {
    let active = true;
    fetchProducts()
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error('Invalid products response');
        if (active) setProducts(response.data);
      })
      .catch(() => {
        if (active) setError('Impossible de charger les produits.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addToCart = (product) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: { ...product, id: product._id, quantity: 1 }, // Ajoute +1 à la quantité
    });
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Liste des Produits</h2>
      {loading && <p role="status">Chargement des produits...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p>Aucun produit disponible pour le moment.</p>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <li key={product._id} className="border p-4 rounded shadow">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-gray-500">{product.price} €</p>
            <button
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
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

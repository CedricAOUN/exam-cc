import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

/** Show a safe recovery screen for unmatched URLs and route/render failures. */
export default function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="p-8" role="alert">
      <h1 className="text-2xl font-bold mb-4">
        {notFound ? 'Page introuvable' : 'Impossible d’afficher cette page'}
      </h1>
      <p className="mb-4">
        {notFound
          ? 'Cette adresse ne correspond à aucune page.'
          : 'Une erreur est survenue. Vous pouvez réessayer ou revenir aux produits.'}
      </p>
      <Link to="/products" className="text-blue-600 underline mr-4">
        Voir les produits
      </Link>
      {!notFound && (
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Réessayer
        </button>
      )}
    </main>
  );
}

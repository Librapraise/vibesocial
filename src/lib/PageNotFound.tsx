import React from 'react';
import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-black text-orange-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-zinc-500 max-w-sm mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <button className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">
          Go Back Home
        </button>
      </Link>
    </div>
  );
}

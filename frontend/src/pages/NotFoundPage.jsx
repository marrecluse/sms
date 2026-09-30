// frontend/src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="text-xl font-semibold text-gray-800 mt-4">Page not found</h1>
        <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Go home</Link>
      </div>
    </div>
  );
}

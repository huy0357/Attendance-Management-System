import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm p-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 mb-6 group-hover:bg-blue-100 transition-colors">
         <AlertCircle className="h-12 w-12 text-blue-600" />
      </div>
      <h1 className="text-8xl font-black text-gray-900 tracking-tighter mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
        The page you are looking for doesn't exist or has been moved. Please check the URL or navigate back to the dashboard.
      </p>
      
      <button 
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95"
      >
        <Home className="h-5 w-5" />
        Return to Dashboard
      </button>
    </div>
  );
};

export default NotFoundPage;

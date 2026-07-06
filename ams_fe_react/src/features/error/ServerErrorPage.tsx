import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, ServerCrash } from 'lucide-react';

const ServerErrorPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm p-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-50 mb-6 group-hover:bg-red-100 transition-colors">
         <ServerCrash className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-8xl font-black text-gray-900 tracking-tighter mb-4">500</h1>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Internal Server Error</h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
        We're experiencing some technical difficulties right now. Please try again later or contact our support team if the problem persists.
      </p>
      
      <div className="flex gap-4 items-center justify-center">
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:scale-105 active:scale-95"
        >
          <RefreshCcw className="h-5 w-5" />
          Reload Page
        </button>
        <button 
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 hover:scale-105 active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ServerErrorPage;

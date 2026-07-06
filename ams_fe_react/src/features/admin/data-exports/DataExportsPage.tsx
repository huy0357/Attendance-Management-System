import React from 'react';
import { Database } from 'lucide-react';
import './DataExportsPage.module.scss';

const DataExportsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center data-exports-container">
      <div className="w-20 h-20 mb-6 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
        <Database className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Data Exports</h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md">Feature coming soon...</p>
    </div>
  );
};

export default DataExportsPage;

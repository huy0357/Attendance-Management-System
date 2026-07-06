import React from 'react';
import { Shield } from 'lucide-react';

const RoleManagementPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 mb-6 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
        <Shield className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Management</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Fine-tune system access and permissions. This module is currently under active development.
      </p>
      <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-200">
        Coming Soon
      </div>
    </div>
  );
};

export default RoleManagementPage;

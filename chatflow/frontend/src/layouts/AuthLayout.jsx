import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">ChatFlow</h1>
          <p className="text-gray-500 mt-1">Real-time messaging platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
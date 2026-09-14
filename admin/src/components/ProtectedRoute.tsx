import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0B18] flex flex-col items-center justify-center text-[#F3DEFF]">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 rounded-full border-4 border-[#7C3AED]/20 animate-ping"></div>
          <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
        </div>
        <p className="mt-4 text-sm text-[#A8A0B8] font-medium tracking-wide">Đang xác thực phiên quản trị...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

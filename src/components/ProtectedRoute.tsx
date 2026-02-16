import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userRole: string;
  allowedRoles: string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  userRole, 
  allowedRoles, 
  fallbackPath = '/' 
}: ProtectedRouteProps) {
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <h4 className="font-medium">Access Denied</h4>
              <p>You don't have permission to access this page. This resource is restricted to {allowedRoles.join(', ')} roles only.</p>
              <p className="text-sm">Your current role: <strong>{userRole}</strong></p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
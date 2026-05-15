import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import AppRoutes from './routes/AppRoutes';
const Login = lazy(() => import('./pages/Auth/Login'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
import ProtectedRoute from './components/ProtectedRoute';


function App() {
  const basename = import.meta.env.MODE === 'production' ? '/other/ecommerce-frontend-adminpanel' : '';

  return (
    <Router basename={basename}>


      <Suspense fallback={<div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Private Routes: Wrapped in ProtectedRoute and AdminLayout */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AppRoutes />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />

          {/* Catch-all: Redirect to login or specialized 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>

  );
}

export default App;

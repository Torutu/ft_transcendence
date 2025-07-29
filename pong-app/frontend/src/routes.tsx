import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { isAuthenticated } from './utils/auth';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Explicit lazy imports for each page
const Menu = lazy(() => import('./pages/menu'));
const LoginPage = lazy(() => import('./pages/login'));
const RegisterPage = lazy(() => import('./pages/register'));
const VerifyEmailPage = lazy(() => import('./pages/verify-email'));
const VerifyTwoFactorPage = lazy(() => import('./pages/verify-2fa'));
const ResetPasswordPage = lazy(() => import('./pages/reset-password'));
const TournamentPage = lazy(() => import('./pages/tournament'));
const PlayPage = lazy(() => import('./pages/playasguest'));

export const AppRoutes = () => {
  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    }>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <Routes>
          <Route 
              path="/" 
              element={
                isAuthenticated() ? 
                  <Navigate to="/tournament" replace /> : 
                  <Menu />
              } 
            />
            
          <Route path="/play" element={<PlayPage />} />
          
          {/* Auth routes with layout */}
          <Route element={<Layout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-2fa" element={<VerifyTwoFactorPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
						<Route path="/tournament" element={<TournamentPage />} />

            
            {/* Protected routes */}
            {/* <Route 
              path="/tournament" 
              element={
                isAuthenticated() ? 
                  <TournamentPage /> : 
                  <Navigate to="/login" state={{ from: '/tournament' }} replace />
              } 
            /> */}
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

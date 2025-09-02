// frontend/src/routes.tsx
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

const Menu = lazy(() => import('./pages/home'));
const LoginPage = lazy(() => import('./pages/unauthorised/login'));
const RegisterPage = lazy(() => import('./pages/unauthorised/register'));
const VerifyEmailPage = lazy(() => import('./pages/unauthorised/verify-email'));
const VerifyTwoFactorPage = lazy(() => import('./pages/unauthorised/verify-2fa'));
const ResetPasswordPage = lazy(() => import('./pages/unauthorised/reset-password'));
const TournamentPage = lazy(() => import('./pages/authorised/tournament'));
const ChangePasswordPage = lazy(() => import('./pages/unauthorised/changePassword'));
const PlayPage = lazy(() => import('./pages/playasguest'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/tournament" replace />;
};

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
          <Route path="/" element={<Menu />} />
          <Route path="/play" element={<PlayPage />} />

          <Route element={<Layout />}>
            <Route path="/login" element={
              <PublicRoute><LoginPage /></PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute><RegisterPage /></PublicRoute>
            } />
            <Route path="/verify-email" element={
              <PublicRoute><VerifyEmailPage /></PublicRoute>
            } />
            <Route path="/verify-2fa" element={
              <PublicRoute><VerifyTwoFactorPage /></PublicRoute>
            } />
            <Route path="/reset-password" element={
              <PublicRoute><ResetPasswordPage /></PublicRoute>
            } />
            <Route path="/change-password" element={
              <PublicRoute><ChangePasswordPage /></PublicRoute>
            } />
          </Route>

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/tournament" element={<TournamentPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};
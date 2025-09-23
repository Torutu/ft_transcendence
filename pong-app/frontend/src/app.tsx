
// frontend/src/app.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout, LoadingSpinner, ErrorBoundary } from './components/general';

// Lazy imports with corrected paths
const Home = lazy(() => import('./pages/unauthorised/home')); 
const LoginPage = lazy(() => import('./pages/unauthorised/login'));
const RegisterPage = lazy(() => import('./pages/unauthorised/register'));
const VerifyEmailPage = lazy(() => import('./pages/unauthorised/verify-email'));
const VerifyTwoFactorPage = lazy(() => import('./pages/unauthorised/verify-2fa'));
const ResetPasswordPage = lazy(() => import('./pages/unauthorised/reset-password'));
const ChangePasswordPage = lazy(() => import('./pages/unauthorised/changePassword'));
const PlayPage = lazy(() => import('./pages/game/playPage'));
const LobbyPage = lazy(() => import('./pages/authorised/lobby'));
const TournamentPage = lazy(() => import('./pages/authorised/tournament'));
const QuickmatchLocalPage = lazy(() => import('./pages/authorised/quickmatch-local'));
const QuickmatchRemotePage = lazy(() => import('./pages/authorised/quickmatch-remote'));
const AvatarPage = lazy(() => import('./shared/avatar'));


// Protected Route Component
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

// Public Route Component  
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/lobby" replace />;
};

// Loading Fallback Component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Error Fallback Component
const ErrorFallback = () => (
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
);

const App = () => {
  return (
    <AuthProvider>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes without layout */}
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/avatar" element={<AvatarPage />} />
            <Route path="/:game/:mode/:type/:gameId" element={<PlayPage />} />

            {/* Public routes with layout */}
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
              
              {/* Dynamic game routes */}
              {/* <Route path="/:game/:mode/:gameId" element={<PlayPage />} /> */}
            </Route>

            {/* Protected routes with layout */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/quickmatch-local" element={<QuickmatchLocalPage />} />
              <Route path="/quickmatch-remote" element={<QuickmatchRemotePage />} />
              <Route path="/tournament" element={<TournamentPage />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
};

export default App;
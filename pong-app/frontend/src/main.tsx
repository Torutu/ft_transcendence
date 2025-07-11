import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router';

import Menu from './pages/menu';
import RegisterPage from './pages/register';
import LoginPage from './pages/login';
import ResetPasswordPage from './pages/reset-password';
import PlayPage from './pages/playasguest'; 

import './styles.css';

const App: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-screen relative">
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/play" element={<PlayPage />} /> 
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
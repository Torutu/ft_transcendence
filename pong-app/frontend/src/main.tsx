import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router';

import Menu from './components/Menu';
import RegisterPage from './components/register';
import LoginPage from './components/login';
import ResetPasswordPage from './components/reset-password';

import './styles.css';
import PingPongGame from './PingPongGame';

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameStarted && gameContainerRef.current) {
      new PingPongGame(gameContainerRef.current);
    }
  }, [gameStarted]);

  return (
    <div className="flex flex-col w-full h-screen relative">
      <Routes>
        <Route
          path="/"
          element={
            !gameStarted ? <Menu onPlay={() => setGameStarted(true)} /> : <div ref={gameContainerRef} className="flex-grow relative" />
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
      {gameStarted && <div ref={gameContainerRef} className="flex-grow relative" />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

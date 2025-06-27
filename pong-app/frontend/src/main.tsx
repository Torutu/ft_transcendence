import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Menu from './components/Menu';
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
  {!gameStarted && <Menu onPlay={() => setGameStarted(true)} />}
  <div ref={gameContainerRef} className="flex-grow relative" />
</div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);


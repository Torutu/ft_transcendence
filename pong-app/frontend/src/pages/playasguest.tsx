import React, { useEffect, useRef } from 'react';
import PingPongGame from '../PingPongGame';

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      gameInstance.current = new PingPongGame(containerRef.current);
    }

    return () => {
      if (gameInstance.current) {
        gameInstance.current.dispose?.(); // fix the game dup
        gameInstance.current = null; 
      }
    };
  }, []);

  return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
};

export default PlayPage;

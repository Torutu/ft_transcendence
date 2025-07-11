import React, { useEffect, useRef } from 'react';
import PingPongGame from '../PingPongGame';

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      new PingPongGame(containerRef.current);
    }
  }, []);

  return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
};

export default PlayPage;
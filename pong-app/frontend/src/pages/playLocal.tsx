import React, { useEffect, useRef } from 'react';
import localGame from '../game/localGame';

const PlayLocal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      new localGame(containerRef.current);
    }
  }, []);

  return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
};

export default PlayLocal;
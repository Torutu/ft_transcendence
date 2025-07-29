import React, { useEffect, useRef } from 'react';
import LANGame from '../game/LANGame';

const PlayLAN: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      new LANGame(containerRef.current);
    }
  }, []);

  return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
};

export default PlayLAN;
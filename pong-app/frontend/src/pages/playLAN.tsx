import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import LANGame from '../game/LANGame';

export default function PlayLAN() {
  const { gameId } = useParams<{ gameId: string }>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (gameId){
    const game = new LANGame(containerRef.current, gameId);
    
    return () => game.cleanup();
    }
  }, [gameId]);

  return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
};
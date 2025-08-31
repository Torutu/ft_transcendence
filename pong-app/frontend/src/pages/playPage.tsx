import React, { useEffect, useRef } from 'react';
import PingPongClient from '../PingPongClient';
import { useParams, useNavigate } from 'react-router-dom';
import KeyClashClient from '../keyClashClient';

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pongInstance = useRef<PingPongClient>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const { mode } = useParams<{ mode: "local" | "remote" }>();
  const { game } = useParams<{ game: "pong" | "keyclash" }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (containerRef.current && gameId && mode && game === "pong") {
      pongInstance.current = new PingPongClient(containerRef.current, gameId, mode, navigate);
    }
    else if (containerRef.current && gameId && mode && game === "keyclash") {
      const cleanup = KeyClashClient(containerRef.current, gameId, mode, navigate);
      return cleanup;
    }
    return () => {
      if (pongInstance.current) {
        pongInstance.current.dispose?.(); // fix the game dup
        pongInstance.current = null; 
      }
    };
  }, [gameId, mode, game]);

  if (game === "pong")
    return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
  else
    return (
      <div ref={containerRef} className="game-container">
        <div className="players-row">
          <div className="player" id="p1">
            <div id="prompt1">-</div>
            <div id="score1">Score: 0</div>
          </div>
          <div className="player" id="p2">
            <div id="prompt2">-</div>
            <div id="score2">Score: 0</div>
          </div>
        </div>
    
        <div id="timer">Time Left: 20s</div>
        <div id="start-prompt">Press SPACE to Start</div>
      </div>
    );
};

export default PlayPage;
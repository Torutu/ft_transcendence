import React, { useEffect, useRef, useState } from 'react';
import PingPongClient from '../../utils/PingPongClient';
import KeyClashClient from '../../utils/keyClashClient';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pongInstance = useRef<PingPongClient>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const { mode } = useParams<{ mode: "local" | "remote" }>();
  const { game } = useParams<{ game: "pong" | "keyclash" }>();
  const navigate = useNavigate();
  const location  = useLocation();

  // Track game status: 'waiting', 'in-progress', 'finished'
  const [gameStatus, setGameStatus] = useState<'waiting' | 'in-progress' | 'finished'>('waiting');

  useEffect(() => {
    const name = location.state?.name;

    // Helper to update status from game client
    const onStatusChange = (status: 'waiting' | 'in-progress' | 'finished') => {
      setGameStatus(status);
    };

    if (containerRef.current && gameId && mode && game === "pong") {
      pongInstance.current = new PingPongClient(containerRef.current, gameId, mode, navigate, name, onStatusChange);
    }
    else if (containerRef.current && gameId && mode && game === "keyclash") {
      const cleanup = KeyClashClient(containerRef.current, gameId, mode, navigate, name, onStatusChange);
      return cleanup;
    }
    return () => {
      if (pongInstance.current) {
        pongInstance.current.dispose?.();
        pongInstance.current = null;
      }
    };
  }, [gameId, mode, game, location]);

  // Show button only before game starts or after it ends
  const showBackButton = gameStatus !== "in-progress";

  const backButton = showBackButton ? (
    <button
      onClick={() => navigate("/lobby")}
      className="absolute top-4 left-4 z-50 bg-gray-700 text-white px-4 py-2 rounded shadow hover:bg-gray-800 transition"
      style={{ position: "absolute", top: "16px", left: "16px", zIndex: 9999 }}
    >
      ← Back to Lobby
    </button>
  ) : null;

  if (game === "pong")
    return (
      <div className="relative w-full h-full flex-grow bg-black">
        {backButton}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  else
return (
      <div className="relative w-full h-full flex-grow bg-black">
        {backButton}
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
      </div>
    );
};

export default PlayPage;
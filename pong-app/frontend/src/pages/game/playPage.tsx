import React, { useEffect, useRef } from 'react';
import PingPongClient from '../../utils/PingPongClient';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import KeyClashClient from '../../utils/keyClashClient';

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pongInstance = useRef<PingPongClient>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const { mode } = useParams<{ mode: "local" | "remote" }>();
  const { game } = useParams<{ game: "pong" | "keyclash" }>();
  const { type } = useParams<{ type: "1v1" | "tournament" }>(); 
  const navigate = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    let name: string | null = null;
    let playerId: number | null = null;
    if (location.state?.name)
      name = location.state.name;
    if (location.state.user)
      name = location.state.user;
    if (location.state?.playerId)
      playerId = location.state.playerId;
    if (location.state.userId)
      playerId = location.state.userId;
    if (containerRef.current && gameId && mode && type && game === "pong") {
      pongInstance.current = new PingPongClient(containerRef.current, gameId, mode, type, navigate, name, playerId);
      return () => {
        if (pongInstance.current) {
          pongInstance.current.dispose?.(); // fix the game dup
          pongInstance.current = null; 
        }      
      }
    }
    else if (containerRef.current && gameId && mode && type && game === "keyclash") {
      const cleanup = KeyClashClient(containerRef.current, gameId, mode, type, navigate, name, playerId);
      return cleanup;
    }
    else {
      alert("No such page");
      navigate("/");
    }
  }, [gameId, mode, game, type, location]);

  if (game === "pong")
    return <div ref={containerRef} className="flex-grow relative w-full h-100vh overflow-hidden bg-black" />;
  else if (game === "keyclash")
    return (
      <div ref={containerRef} className="flex-grow relative w-full h-full bg-black">
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
  else return; 
};

export default PlayPage;
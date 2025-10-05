import React, { useEffect, useRef } from "react";
import PingPongClient from "../../utils/PingPongClient";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import KeyClashClient from "../../utils/keyClashClient";

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pongInstance = useRef<PingPongClient>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const { mode } = useParams<{ mode: "local" | "remote" }>();
  const { game } = useParams<{ game: "pong" | "keyclash" }>();
  const { type } = useParams<{ type: "1v1" | "tournament" }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let name: string | null | { player1: string | null, player2: string | null, player3: string | null, player4: string | null } = null;
    let playerId: number | null = null;
    if (location.state?.name) name = location.state.name;
    else if (location.state.user) name = location.state.user;
    if (location.state?.playerId) playerId = location.state.playerId;
    if (location.state.userId) playerId = location.state.userId;
    if (containerRef.current && gameId && mode && type && game === "pong") {
      pongInstance.current = new PingPongClient(
        containerRef.current,
        gameId,
        mode,
        type,
        navigate,
        name,
        playerId
      );
      return () => {
        if (pongInstance.current) {
          pongInstance.current.dispose?.(); // fix the game dup
          pongInstance.current = null;
        }
      };
    } else if (
      containerRef.current &&
      gameId &&
      mode &&
      type &&
      game === "keyclash"
    ) {
      const cleanup = KeyClashClient(
        containerRef.current,
        gameId,
        mode,
        type,
        navigate,
        name,
        playerId
      );
      return cleanup;
    } else {
      alert("No such page");
      navigate("/");
    }
  }, [gameId, mode, game, type, location]);

  if (game === "pong")
    return (
      <div
        ref={containerRef}
        className="flex-grow relative w-full h-full bg-black"
      />
    );
  else if (game === "keyclash")
    return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-screen bg-black" > 
    <div className="flex flex-col items-center justify-center text-white"> 
      <div className="players-row flex flex-wrap justify-center gap-8 mb-4 w-full max-w-6xl"> 
        <div className="player text-center bg-gray-800 border-2 border-white rounded-lg p-6 w-50 h-50 flex flex-col items-center justify-center" id="p1" > 
          <div id="prompt1" className="text-xl font-bold mb-2">-</div> 
          <div id="score1" className="text-lg">Score: 0
            </div> 
            </div> 
            <div className="player text-center bg-gray-800 border-2 border-white rounded-lg p-6 w-50 h-50 flex flex-col items-center justify-center" id="p2" > 
              <div id="prompt2" className="text-xl font-bold mb-2">-</div> 
              <div id="score2" className="text-lg">Score: 0</div> 
              </div> 
              </div> 
              <div id="timer" className="mb-2">Time Left: 20s</div> 
              <div id="start-prompt">Press SPACE to Start</div> 
              </div> 
              </div>
    );
  else return;
};

export default PlayPage;

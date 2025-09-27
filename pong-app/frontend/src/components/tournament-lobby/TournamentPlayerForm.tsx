import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface TournamentPlayerFormProps {
  onStart: (game: "pong" | "keyclash", players: string[]) => void;
}

export default function TournamentPlayerForm({ onStart }: TournamentPlayerFormProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState(["", "", ""]);
  const [isStarting, setIsStarting] = useState(false);
  
  const allFilled = players.every((p) => p.trim().length > 0);
  
  const handleChange = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };
  
  const makeUniquePlayers = (names: string[]) => {
    const seen = new Map<string, number>();
    return names.map((name, idx) => {
      const trimmed = name.trim();
      const count = seen.get(trimmed) ?? 0;
      seen.set(trimmed, count + 1);
      // if duplicate, append slot position
      if (count > 0) {
        return `${trimmed}-P${idx + 1}`;
      }
      return trimmed;
    });
  };
  
  const startGame = async (game: "pong" | "keyclash") => {
    if (allFilled && !isStarting) {
      setIsStarting(true);
      // Include the authenticated user as player 1, then the 3 entered names
      const allPlayerNames = [
        user?.username || "You",
        ...players
      ];
      const uniquePlayers = makeUniquePlayers(allPlayerNames);
      try {
        await onStart(game, uniquePlayers);
      } finally {
        setIsStarting(false);
      }
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto space-y-4 p-6 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
      <h2 className="text-xl font-semibold text-white text-center mb-6">
        Enter Player Names
      </h2>
      
      {/* Player 1 - Show logged in user (non-editable) */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-200 flex items-center">
          Player 1 (You)
        </label>
        <div className="h-11 w-full rounded-lg bg-gray-600/50 px-4 font-medium text-gray-300 border border-gray-500 flex items-center">
          {user?.username || "You"}
        </div>
      </div>
      
      {/* Players 2-4 - Editable inputs */}
      {players.map((p, idx) => (
        <div key={idx} className="flex flex-col space-y-2">
          <label
            htmlFor={`player-${idx + 2}`}
            className="text-sm font-medium text-gray-200 flex items-center"
          >
            Player {idx + 2}
            <span className="ml-1 text-red-400">*</span>
          </label>
          <input
            id={`player-${idx + 2}`}
            type="text"
            value={p}
            onChange={(e) => handleChange(idx, e.target.value)}
            className="h-11 w-full rounded-lg bg-white/20 backdrop-blur-sm px-4 font-medium text-white
              placeholder-gray-300 outline-none border border-white/30 transition-all duration-200 ease-in-out
              focus:bg-white/30 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            placeholder={`Enter name for Player ${idx + 2}`}
            maxLength={20}
            autoComplete="off"
            disabled={isStarting}
            required
          />
        </div>
      ))}
      
      <div className="flex justify-center space-x-4 pt-6">
        <button
          onClick={() => startGame("pong")}
          disabled={!allFilled || isStarting}
          className={`px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200
            ${allFilled && !isStarting 
              ? "bg-green-500 hover:bg-green-600 hover:scale-105 shadow-lg" 
              : "bg-gray-600 cursor-not-allowed opacity-50"
            }`}
        >
          {isStarting ? "Starting..." : "Start Pong Tournament"}
        </button>
        <button
          onClick={() => startGame("keyclash")}
          disabled={!allFilled || isStarting}
          className={`px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200
            ${allFilled && !isStarting 
              ? "bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-lg" 
              : "bg-gray-600 cursor-not-allowed opacity-50"
            }`}
        >
          {isStarting ? "Starting..." : "Start KeyClash Tournament"}
        </button>
      </div>
    </div>
  );
}
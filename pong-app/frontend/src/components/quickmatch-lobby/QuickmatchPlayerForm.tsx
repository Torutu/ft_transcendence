
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { 
  validatePlayerName, 
  cleanupGameStorage 
} from "../../shared/utils";
import { GameType } from "../../shared/types";

interface QuickmatchPlayerFormProps {
  onCreate: (type: GameType) => void;
  closeForm: () => void;
}

export default function QuickmatchPlayerForm({ onCreate, closeForm }: QuickmatchPlayerFormProps) {
  const location = useLocation();
  const { user } = useAuth();
  
  const loggedInUsername = user?.username || "";
  // Guest player state
  const [guestName, setGuestName] = useState(() => {
    const saved = localStorage.getItem("quickmatch_guestName");
    return saved || "";
  });

  // Guest name change handler
  const handleGuestNameChange = useCallback((newName: string) => {
    
    setGuestName(newName);
    
    if (newName.trim()) {
      localStorage.setItem("quickmatch_guestName", newName);
    } else {
      localStorage.removeItem("quickmatch_guestName");
    }
  }, []);

  // ========== CLEAR GUEST DATA FUNCTION ==========
  const clearGuestData = useCallback(() => {
    console.log("🧹 Clearing guest player data after game end");
    
    // Clear guest name
    setGuestName("");
    localStorage.removeItem("quickmatch_guestName");
    
    console.log("✅ Guest player data cleared successfully");
  }, []);

  // Cleanup on mount and check game state
  useEffect(() => {
    cleanupGameStorage();
  }, []);

  // Validation
  const canStartGame = useCallback(() => {
    const trimmedGuestName = guestName.trim();
    const trimmedLoggedInUsername = loggedInUsername.trim();
    
    return (
      trimmedGuestName.length > 0 && 
      validatePlayerName(trimmedGuestName) &&
      trimmedGuestName.toLowerCase() !== trimmedLoggedInUsername.toLowerCase()
    );
  }, [guestName, loggedInUsername]);

  // Start game
  const startSpecificGame = useCallback((gameType: GameType) => {

    console.log("start?");
    if (!canStartGame()) {
      const trimmedGuestName = guestName.trim();
      
      if (!trimmedGuestName) {
        alert("Please enter a username for Player 2 (Guest)");
        return;
      }
      
      if (!validatePlayerName(trimmedGuestName)) {
        alert("Player 2 username can only contain letters, numbers, spaces, underscores, and hyphens (max 20 characters)");
        return;
      }
      
      if (trimmedGuestName.toLowerCase() === loggedInUsername.toLowerCase()) {
        alert("Player 2 username must be different from your username");
        return;
      }  
      return;
    }

    console.log("creating", gameType);
    onCreate(gameType);
  }, [canStartGame, guestName, loggedInUsername]);

  // Validation message component
  const getValidationMessage = useCallback(() => {

    const trimmedGuestName = guestName.trim();
  
    if (!trimmedGuestName) return "Enter a username for Player 2 (Guest)";
    if (!validatePlayerName(trimmedGuestName)) return "Player 2 username must be valid (letters, numbers, spaces, _, - only, max 20 chars)";
    if (trimmedGuestName.toLowerCase() === loggedInUsername.toLowerCase()) return "Player 2 username must be different from yours";
    return "✅ Ready to start! Choose your game above";
  }, [guestName, loggedInUsername]);

  return (
    <div className="w-full min-h-screen text-white p-8 flex flex-col items-center">
      {/* Close Button */}
      <button
        onClick={() => closeForm()}
        className="absolute top-30 left-6 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md"
      >
        Close
      </button>

      <h1 className="text-4xl font-bold text-center mb-6">
        🏠 Local Quick Match Setup
      </h1>

      <div className="w-full max-w-4xl space-y-6">
        {/* Player Setup Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Setup Players & Avatars</h2>
          
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Player 1 */}
            <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-2">👤 Player 1 (You)</h3>
              <p className="mb-4 text-lg">
                Username: <strong>{loggedInUsername}</strong>
              </p>
            </div>

            {/* VS Separator */}
            <div className="text-4xl font-bold text-yellow-400">VS</div>

            {/* Player 2 - Guest */}
            <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-2">👥 Player 2 (Guest)</h3>

              <input
                type="text"
                placeholder="Enter guest username"
                value={guestName}
                onChange={(e) => handleGuestNameChange(e.target.value)}
                className="mb-4 px-4 py-2 rounded text-pink-400 bg-gray-600 font-bold w-full max-w-sm text-center"
                maxLength={20}
              />

              {/* Validation hints */}
                <div className="text-xs text-gray-400 mb-4 text-center max-w-sm">
                  {guestName.trim() && !validatePlayerName(guestName.trim()) && (
                    <p className="text-red-400">
                      ❌ Only letters, numbers, spaces, underscores, and hyphens allowed (max 20 chars)
                    </p>
                  )}
                  {guestName.trim() && validatePlayerName(guestName.trim()) && guestName.trim().toLowerCase() === loggedInUsername.toLowerCase() && (
                    <p className="text-red-400">
                      ❌ Must be different from your username
                    </p>
                  )}
                  {guestName.trim() && validatePlayerName(guestName.trim()) && guestName.trim().toLowerCase() !== loggedInUsername.toLowerCase() && (
                    <p className="text-green-400">
                      ✅ Valid username!
                    </p>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* Game Selection Buttons */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Game</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => startSpecificGame("pong")}
              disabled={!canStartGame()}
              className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
                !canStartGame()
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              }`}
            >
              {"🏓 Start Ping Pong"}
              {guestName.trim() && (
                <div className="text-base font-normal mt-2">vs {guestName.trim()}</div>
              )}
            </button>

            <button
              onClick={() => startSpecificGame("keyclash")}
              disabled={!canStartGame()}
              className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
                !canStartGame()
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
              }`}
            >
              {"⌨️ Start Key Clash"}
              {guestName.trim() && (
                <div className="text-base font-normal mt-2">vs {guestName.trim()}</div>
              )}
            </button>
          </div>

          {/* Status message */}
            <div className="text-center mt-6">
              <p className={`text-sm ${canStartGame() ? 'text-green-400' : 'text-gray-400'}`}>
                {getValidationMessage()}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
// frontend/src/pages/authorised/quickmatch-local.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { getAvatars } from "../../utils/lobbyApi";
import { 
  validatePlayerName, 
  getStoredAvatarData, 
  saveAvatarData, 
  cleanupGameStorage 
} from "../../shared/utils";
import { Avatar, AvatarData, GameType } from "../../shared/types";

interface GameInfo {
  player1: string;
  player2: string;
  gameType: 'pong' | 'keyclash';
  mode: 'local' | 'remote';
  gameId: string;
  startTime: number;
}

export default function QuickmatchLocalPage() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const loggedInUsername = user?.username || "";
  
  // Check if user is currently in a game
  const [isInGame, setIsInGame] = useState(() => {
    const inGame = localStorage.getItem("userInGame");
    return inGame === "true";
  });

  // Active game info for status display
  const [activeGameInfo, setActiveGameInfo] = useState<GameInfo | null>(() => {
    const gameInfo = localStorage.getItem("activeGameInfo");
    if (gameInfo) {
      try {
        return JSON.parse(gameInfo);
      } catch (e) {
        localStorage.removeItem("activeGameInfo");
      }
    }
    return null;
  });
  
  // Guest player state
  const [guestName, setGuestName] = useState(() => {
    const saved = localStorage.getItem("quickmatch_guestName");
    return saved || "";
  });

  // Avatar state
  const [userAvatar, setUserAvatar] = useState<AvatarData | null>(() => 
    getStoredAvatarData("userAvatar")
  );
  
  const [guestAvatar, setGuestAvatar] = useState<AvatarData | null>(() => 
    getStoredAvatarData("quickmatch_guestAvatar")
  );

  const [availableAvatars, setAvailableAvatars] = useState<Avatar[]>([]);

  // Handle return from avatar selection
  useEffect(() => {
    const state = location.state as {
      selectedAvatar?: { name: string; image: string };
      target?: "user" | "guest";
      fromAvatar?: boolean;
    };

    if (state?.selectedAvatar && state.target && state.fromAvatar) {
      const avatarData = {
        name: state.selectedAvatar.name,
        image: state.selectedAvatar.image
      };
      
      if (state.target === "user") {
        setUserAvatar(avatarData);
        saveAvatarData("userAvatar", avatarData);
      } else {
        setGuestAvatar(avatarData);
        saveAvatarData("quickmatch_guestAvatar", avatarData);
      }
      
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Guest name change handler
  const handleGuestNameChange = useCallback((newName: string) => {
    // Don't allow name changes during game
    if (isInGame) return;
    
    setGuestName(newName);
    
    if (newName.trim()) {
      localStorage.setItem("quickmatch_guestName", newName);
    } else {
      localStorage.removeItem("quickmatch_guestName");
    }
  }, [isInGame]);

  // Avatar change handlers - now navigate to avatar selection page
  const chooseAvatar = useCallback((target: "user" | "guest") => {
    // Don't allow avatar changes during game
    if (isInGame) return;
    
    navigate("/avatar", {
      state: { 
        target, 
        returnTo: "/quickmatch-local",
        fromQuickMatch: true 
      },
      replace: false,
    });
  }, [isInGame, navigate]);


  

  // ========== CLEAR GUEST DATA FUNCTION ==========
  const clearGuestData = useCallback(() => {
    console.log("🧹 Clearing guest player data after game end");
    
    // Clear guest name
    setGuestName("");
    localStorage.removeItem("quickmatch_guestName");
    
    // Clear guest avatar
    setGuestAvatar(null);
    localStorage.removeItem("quickmatch_guestAvatar");

    // Clear any temporary game state
  localStorage.removeItem("userInGame");
  localStorage.removeItem("activeGameInfo");
  localStorage.removeItem("currentGameId");
    
    console.log("✅ Guest player data cleared successfully");
  }, []);

  // Game status handlers
  const handleReturnToGame = useCallback(() => {
    if (activeGameInfo) {
      navigate(`/${activeGameInfo.gameType}/${activeGameInfo.mode}/1v1/${activeGameInfo.gameId}`, {
        state: {
          user: activeGameInfo.player1,
          guest: activeGameInfo.player2,
          userAvatar,
          guestAvatar,
          gameType: activeGameInfo.gameType,
          mode: activeGameInfo.mode,
          type: "1v1",
          fromQuickMatch: true,
          isLocal: true,
          gameId: activeGameInfo.gameId
        }
      });
    }
  }, [activeGameInfo, userAvatar, guestAvatar, navigate]);

  // ========== ENHANCED GAME STATE MONITORING ==========
  useEffect(() => {
    const checkGameStatus = () => {
      const userInGame = localStorage.getItem("userInGame");
      const gameInfo = localStorage.getItem("activeGameInfo");
      
      const wasInGame = isInGame;
      const newIsInGame = userInGame === "true";
      
      setIsInGame(newIsInGame);
      
      // Log state changes for debugging
      if (wasInGame !== newIsInGame) {
        console.log(`🎮 Game state changed: ${wasInGame ? 'IN_GAME' : 'NOT_IN_GAME'} → ${newIsInGame ? 'IN_GAME' : 'NOT_IN_GAME'}`);
      }
      
      if (newIsInGame && gameInfo) {
        try {
          setActiveGameInfo(JSON.parse(gameInfo));
        } catch (e) {
          console.log("🧹 Corrupted game info detected, cleaning up");
          localStorage.removeItem("activeGameInfo");
          setActiveGameInfo(null);
        }
      } else {
        // No active game - clear everything including guest data
        if (activeGameInfo) {
          console.log("✅ Game ended - clearing UI state and guest data");
          setActiveGameInfo(null);
          
          // Clear guest data when game ends
          clearGuestData();
        }
      }
    };

    // Initial check
    checkGameStatus();
    
    // Check every 500ms for faster response
    const interval = setInterval(checkGameStatus, 500);
    
    // Also listen for localStorage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userInGame' || e.key === 'activeGameInfo' || e.key === 'currentGameId') {
        console.log(`📡 localStorage changed: ${e.key} = ${e.newValue}`);
        checkGameStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isInGame, activeGameInfo, clearGuestData]);

  // Initialize avatars and component
  useEffect(() => {
    if (isInitialized) return;
    
    const loadAvatars = async () => {
      try {
        const avatars = await getAvatars();
        setAvailableAvatars(avatars);
        
        if (!userAvatar && avatars.length > 0) {
          const defaultAvatar = { name: avatars[0].id, image: avatars[0].imageUrl };
          setUserAvatar(defaultAvatar);
          saveAvatarData("userAvatar", defaultAvatar);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to load avatars:", error);
        setIsInitialized(true);
      }
    };
    
    loadAvatars();
  }, [isInitialized, userAvatar]);

  // Cleanup on mount and check game state
  useEffect(() => {
    cleanupGameStorage();
  }, []);

  // Socket setup for local games
  useEffect(() => {
    if (!isInitialized) return;
    
    let name: string | null = null;
    let playerId: string | null = null;

    socketRef.current = io("/quickmatch", {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true
    });

    socketRef.current.on("connect", () => {
      name = null;
      playerId = null;
      
      if (user) {
        if (user.username) {
          name = user.username;
        }
        if (user.id) {
          playerId = String(user.id);
        }
      }
      
      socketRef.current?.emit("name", name, playerId, (res: { error: string }) => {
        if (res.error) {
          alert(res.error);
          navigate("/lobby");
        }
      });
    });

    socketRef.current.on("created_game", (gameId, game, mode) => {
      joinGame(gameId, game, mode);
    });

    socketRef.current.on("joined_game", (gameId, game, mode) => {
      console.log("joined_game event received:", { gameId, game, mode });
      
      // Update active game info with real gameId
      const gameInfo: GameInfo = {
        player1: loggedInUsername,
        player2: guestName.trim(),
        gameType: game,
        mode: mode,
        gameId: gameId,
        startTime: Date.now()
      };

      // Mark user as in game and store game info
      localStorage.setItem("userInGame", "true");
      localStorage.setItem("currentGameId", gameId);
      localStorage.setItem("activeGameInfo", JSON.stringify(gameInfo));
      setActiveGameInfo(gameInfo);
      
      socketRef.current?.disconnect();
      socketRef.current = null;
      const type = "1v1";
      
      const navigationState = {
        user: loggedInUsername,
        guest: guestName.trim(),
        userAvatar,
        guestAvatar,
        gameType: game,
        mode: mode,
        type: type,
        fromQuickMatch: true,
        isLocal: true,
        gameId: gameId
      };
      
      console.log("Navigating to local game with state:", navigationState);
      
      navigate(`/${game}/${mode}/${type}/${gameId}`, {
        state: navigationState
      });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isInitialized, user, navigate, loggedInUsername, guestName, userAvatar, guestAvatar]);

  // Validation
  const canStartGame = useCallback(() => {
    const trimmedGuestName = guestName.trim();
    const trimmedLoggedInUsername = loggedInUsername.trim();
    
    return (
      userAvatar && 
      guestAvatar && 
      trimmedGuestName.length > 0 && 
      validatePlayerName(trimmedGuestName) &&
      trimmedGuestName.toLowerCase() !== trimmedLoggedInUsername.toLowerCase()
    );
  }, [guestName, userAvatar, guestAvatar, loggedInUsername]);

  // Start game
  const startSpecificGame = useCallback((gameType: GameType) => {
    // Check if user is already in a game
    if (isInGame) {
      alert("You are already in a game. Please finish or cancel your current game first.");
      return;
    }

    if (!canStartGame()) {
      const trimmedGuestName = guestName.trim();
      
      if (!userAvatar) {
        alert("Please select an avatar for Player 1");
        return;
      }
      
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
      
      if (!guestAvatar) {
        alert("Please select an avatar for Player 2 (Guest)");
        return;
      }
      
      return;
    }

    // Create temporary game info before actual game creation
    const tempGameInfo: GameInfo = {
      player1: loggedInUsername,
      player2: guestName.trim(),
      gameType,
      mode: "local",
      gameId: `temp-${Date.now()}`,
      startTime: Date.now()
    };

    localStorage.setItem("gameType", gameType);
    localStorage.setItem("userInGame", "true");
    localStorage.setItem("activeGameInfo", JSON.stringify(tempGameInfo));
    setIsInGame(true);
    setActiveGameInfo(tempGameInfo);

    socketRef.current?.emit("create_game", gameType, "local");
  }, [canStartGame, guestName, userAvatar, guestAvatar, loggedInUsername, isInGame]);

  const joinGame = (gameId: string, game: GameType, mode: "local") => {
    socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
      if (res.error) alert(res.error);
    });
  };

  // Game status message component (MOVED TO TOP)
  const renderGameStatus = () => {
    if (!isInGame || !activeGameInfo) return null;
    
    const gameId = activeGameInfo.gameId;
    return (
      <div className="bg-blue-900 border border-blue-600 p-4 rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="text-blue-200">🎮 Game in progress - Room: <strong className="text-white">{gameId}</strong></span>
          <button
            onClick={handleReturnToGame}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1"
          >
            🚪 Go to Game Room
          </button>
        </div>
      </div>
    );
  };

  // Validation message component
  const getValidationMessage = useCallback(() => {
    if (isInGame) {
      return null; // Status is now shown at the top
    }

    const trimmedGuestName = guestName.trim();
    
    if (!userAvatar) return "Please select an avatar for Player 1";
    if (!trimmedGuestName) return "Enter a username for Player 2 (Guest)";
    if (!validatePlayerName(trimmedGuestName)) return "Player 2 username must be valid (letters, numbers, spaces, _, - only, max 20 chars)";
    if (trimmedGuestName.toLowerCase() === loggedInUsername.toLowerCase()) return "Player 2 username must be different from yours";
    if (!guestAvatar) return "Choose an avatar for Player 2 (Guest)";
    return "✅ Ready to start! Choose your game above";
  }, [guestName, userAvatar, guestAvatar, loggedInUsername, isInGame]);

  if (!isInitialized) {
    return (
      <div className="w-full min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading game setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-white p-8 flex flex-col items-center">
      {/* Back Button */}
      <button
        onClick={() => navigate("/lobby")}
        className="absolute top-30 left-6 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md"
      >
        🔙 Back to Lobby
      </button>

      <h1 className="text-4xl font-bold text-center mb-6">
        🏠 Local Quick Match Setup
      </h1>

      {/* Game Status Display - Now right under the title */}
      {renderGameStatus()}

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

              {userAvatar ? (
                <>
                  <img
                    src={userAvatar.image}
                    alt={userAvatar.name}
                    className="w-32 h-32 rounded-full border-4 border-blue-400 mb-2 object-cover"
                  />
                  <p className="capitalize mb-4">{userAvatar.name}</p>
                </>
              ) : (
                <p className="mb-4 italic text-gray-400">No avatar selected</p>
              )}

              <button
                onClick={() => chooseAvatar("user")}
                disabled={isInGame}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  isInGame 
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Choose Avatar
              </button>
              {isInGame && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  🔒 Avatar locked during game
                </p>
              )}
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
                disabled={isInGame}
              />
              
              {isInGame && (
                <p className="text-xs text-gray-400 mb-2 text-center">
                  🔒 Username locked during game
                </p>
              )}

              {/* Validation hints - only show when not in game */}
              {!isInGame && (
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
              )}

              {guestAvatar ? (
                <>
                  <img
                    src={guestAvatar.image}
                    alt={guestAvatar.name}
                    className="w-32 h-32 rounded-full border-4 border-pink-400 mb-2 object-cover"
                  />
                  <p className="capitalize mb-4">{guestAvatar.name}</p>
                </>
              ) : (
                <p className="mb-4 italic text-gray-400">No avatar selected</p>
              )}

              <button
                onClick={() => chooseAvatar("guest")}
                disabled={isInGame}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  isInGame 
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                    : "bg-pink-600 hover:bg-pink-700"
                }`}
              >
                Choose Avatar
              </button>
              {isInGame && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  🔒 Avatar locked during game
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Game Selection Buttons */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Game</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => startSpecificGame("pong")}
              disabled={isInGame || !canStartGame()}
              className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
                isInGame || !canStartGame()
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              }`}
            >
              {isInGame ? "🎮 Game In Progress" : "🏓 Start Ping Pong"}
              {guestName.trim() && !isInGame && (
                <div className="text-base font-normal mt-2">vs {guestName.trim()}</div>
              )}
            </button>

            <button
              onClick={() => startSpecificGame("keyclash")}
              disabled={isInGame || !canStartGame()}
              className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
                isInGame || !canStartGame()
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
              }`}
            >
              {isInGame ? "🎮 Game In Progress" : "⌨️ Start Key Clash"}
              {guestName.trim() && !isInGame && (
                <div className="text-base font-normal mt-2">vs {guestName.trim()}</div>
              )}
            </button>
          </div>

          {/* Status message - Only show when NOT in game */}
          {!isInGame && (
            <div className="text-center mt-6">
              <p className={`text-sm ${canStartGame() ? 'text-green-400' : 'text-gray-400'}`}>
                {getValidationMessage()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
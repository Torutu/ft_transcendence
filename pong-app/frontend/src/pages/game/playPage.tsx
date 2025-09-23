// frontend/src/pages/game/playPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import PingPongClient from '../../utils/PingPongClient';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import KeyClashClient from '../../utils/keyClashClient';

interface PlayPageLocationState {
  user: string;
  guest: string;
  userAvatar: { name: string; image: string };
  guestAvatar: { name: string; image: string };
  gameType: "pong" | "keyclash";
  mode: "local" | "remote";
  type: "1v1" | "tournament";
  fromQuickMatch?: boolean;        // <- For local games
  fromRemoteInvitation?: boolean;  // <- For remote games  
  isLocal?: boolean;
  isRemote?: boolean;
  gameId: string;
  yourSide?: "left" | "right";
}

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pongInstance = useRef<PingPongClient>(null);
  const gameCleanupRef = useRef<(() => void) | null>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const { mode } = useParams<{ mode: "local" | "remote" }>();
  const { game } = useParams<{ game: "pong" | "keyclash" }>();
  const { type } = useParams<{ type: "1v1" | "tournament" }>(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for cancel confirmation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlayerSelectionModal, setShowPlayerSelectionModal] = useState(false);
  const [gameHasEnded, setGameHasEnded] = useState(false);
  
  // Game status tracking
  const [gameStatus, setGameStatus] = useState<"waiting" | "starting" | "in-progress" | "finished" | "paused">("waiting");
  const [playerNames, setPlayerNames] = useState<{player1: string | null, player2: string | null}>({player1: null, player2: null});

  // ========== CORE CLEANUP FUNCTION ==========
  const clearGameState = () => {
    console.log("🧹 Clearing game state...");
    
    // Clear all localStorage related to current game
    localStorage.removeItem("userInGame");
    localStorage.removeItem("activeGameInfo");
    localStorage.removeItem("currentGameId");
    localStorage.removeItem("gameType");
    
    // Clean up any pairing data (for remote games)
    localStorage.removeItem("pairingData");
    
    // Mark game as ended to prevent multiple cleanups
    setGameHasEnded(true);
    
    console.log("✅ Game state cleared successfully");
  };

  // ========== GAME END CALLBACK FOR CLIENTS ==========
  const handleGameEnd = () => {
    if (gameHasEnded) return; // Prevent multiple calls
    
    console.log("🎯 Game ended - callback triggered from game client");
    clearGameState();
  };

  // ========== GAME STATUS UPDATE CALLBACK ==========
  const handleStatusUpdate = (status: "waiting" | "starting" | "in-progress" | "finished" | "paused", players?: {player1: string | null, player2: string | null}) => {
    console.log("📊 Game status updated:", status);
    setGameStatus(status);
    if (players) {
      setPlayerNames(players);
    }
  };

  // ========== NAVIGATION TO LOBBY ==========
  const navigateToLobby = () => {
    // Clean up game instances before navigating
    if (pongInstance.current) {
      pongInstance.current.dispose?.();
      pongInstance.current = null; 
    }
    
    if (gameCleanupRef.current) {
      gameCleanupRef.current();
      gameCleanupRef.current = null;
    }
    
    // Clear game state if game hasn't ended naturally
    if (!gameHasEnded) {
      clearGameState();
    }
    
    navigate("/lobby");
  };

  // ========== CANCEL GAME LOGIC ==========
  const saveCancelResult = async (losingPlayer: string, winningPlayer: string) => {
  try {
    const state = location.state as PlayPageLocationState;
    
    const gameData = {
      gameType: game,
      mode: mode,
      player1Data: {
        username: playerNames.player1 || "Player 1",
        avatar: "default",
        score: playerNames.player1 === losingPlayer ? 0 : 1,
        isWinner: playerNames.player1 === winningPlayer
      },
      player2Data: {
        username: playerNames.player2 || "Player 2", 
        avatar: "default",
        score: playerNames.player2 === losingPlayer ? 0 : 1,
        isWinner: playerNames.player2 === winningPlayer
      },
      duration: 0,
      rounds: [], // Empty rounds for cancelled games
      gameId: gameId,
      timestamp: new Date().toISOString(),
      winner: winningPlayer,
      finalScore: playerNames.player1 === winningPlayer ? "1 - 0" : "0 - 1",
      userIsPlayer1: playerNames.player1 === (playerNames.player1 || "Player 1"),
      cancelled: true,
      cancelledBy: losingPlayer
    };

    const response = await fetch('/api/games/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gameData),
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to save cancel result');
    } else {
      console.log('✅ Cancel result saved successfully');
    }
  } catch (error) {
    console.error('❌ Error saving cancel result:', error);
  }
};

  // ========== WINDOW/TAB CLOSE DETECTION ==========
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear game state when user closes tab/window
      clearGameState();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("👁️ Tab became hidden");
      } else {
        console.log("👁️ Tab became visible");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Function to handle game cancellation
  const handleCancelGame = () => {
    console.log("❌ User requested to cancel game");
    
    const state = location.state as PlayPageLocationState;
    const isLocal = state?.isLocal || state?.fromQuickMatch;
    const isRemote = state?.isRemote || state?.fromRemoteInvitation;
    
    if (isLocal) {
      // For local games: Ask which player is clicking cancel
      setShowPlayerSelectionModal(true);
    } else if (isRemote) {
      // For remote games: Current user loses automatically
      const currentUser = state?.user || playerNames.player1 || "Player 1";
      const opponent = state?.guest || playerNames.player2 || "Player 2";
      
      console.log(`❌ Remote cancel: ${currentUser} loses, ${opponent} wins`);
      
      // Save cancel result
      saveCancelResult(currentUser, opponent);
      
      // Clear game state and navigate
      clearGameState();
      cleanupAndNavigate();
    } else {
      // Fallback: just cancel without win/loss
      clearGameState();
      cleanupAndNavigate();
    }
  };

  const handleLocalCancel = (cancellingPlayer: "player1" | "player2") => {
    const p1Name = playerNames.player1 || "Player 1";
    const p2Name = playerNames.player2 || "Player 2";
    
    const losingPlayerName = cancellingPlayer === "player1" ? p1Name : p2Name;
    const winningPlayerName = cancellingPlayer === "player1" ? p2Name : p1Name;
    
    console.log(`❌ Local cancel: ${losingPlayerName} loses, ${winningPlayerName} wins`);
    
    // Save cancel result
    saveCancelResult(losingPlayerName, winningPlayerName);
    
    // Close modal and proceed
    setShowPlayerSelectionModal(false);
    clearGameState();
    cleanupAndNavigate();
  };

  const cleanupAndNavigate = () => {
    // Clean up game instances
    if (pongInstance.current) {
      pongInstance.current.dispose?.();
      pongInstance.current = null; 
    }
    
    if (gameCleanupRef.current) {
      gameCleanupRef.current();
      gameCleanupRef.current = null;
    }
    
    // Navigate back to appropriate lobby
    const state = location.state as PlayPageLocationState;
    if (state?.isLocal || state?.fromQuickMatch) {
      navigate("/quickmatch-local");
    } else if (state?.isRemote || state?.fromRemoteInvitation) {
      navigate("/quickmatch-remote");
    } else {
      navigate("/lobby");
    }
  };

  const confirmCancelGame = () => {
    setShowCancelModal(false);
    handleCancelGame();
  };

  // ========== GAME INITIALIZATION ==========
  useEffect(() => {
    if (containerRef.current && gameId && mode && type && game) {
      // Extract player names from location state
      const state = location.state as PlayPageLocationState;
      let gamePlayerNames: { player1: string | null, player2: string | null, player3: string | null, player4: string | null } = {
        player1: null,
        player2: null,
        player3: null,
        player4: null
      };

      // ===== Handle both LOCAL and REMOTE quickmatch games =====
      if (state && 
          ((state.fromQuickMatch && state.isLocal) ||           // Local games
           (state.fromRemoteInvitation && state.isRemote))) {   // Remote games
        
        console.log("🎮 Initializing game from quickmatch:", { 
          user: state.user, 
          guest: state.guest, 
          mode: mode,
          isLocal: state.isLocal,
          isRemote: state.isRemote 
        });
        
        // Use names from quickmatch page (both local and remote)
        gamePlayerNames.player1 = state.user;
        gamePlayerNames.player2 = state.guest;
        
        // Set player names for cancel tracking
        setPlayerNames({
          player1: state.user,
          player2: state.guest
        });
        
        if (game === "pong") {
          pongInstance.current = new PingPongClient(
            containerRef.current, 
            gameId, 
            mode, 
            type, 
            navigate, 
            gamePlayerNames, // Pass the names object
            handleGameEnd, // Pass the game end callback
            handleStatusUpdate // Pass the status update callback
          );
        } else if (game === "keyclash") {
          const cleanup = KeyClashClient(
            containerRef.current, 
            gameId, 
            mode, 
            type, 
            navigate, 
            gamePlayerNames, // Pass the names object
            handleGameEnd, // Pass the game end callback
            handleStatusUpdate // Pass the status update callback
          );
          gameCleanupRef.current = cleanup;
          return cleanup;
        }
      } else {
        // ===== ORIGINAL: Legacy approach for non-quickmatch games =====
        console.log("🎮 Initializing game with legacy approach");
        
        let name: string | null = null;
        if (location.state?.name) {
          name = location.state.name;
        }
        
        if (game === "pong") {
          pongInstance.current = new PingPongClient(
            containerRef.current, 
            gameId, 
            mode, 
            type, 
            navigate, 
            name,
            handleGameEnd, // Pass the game end callback
            handleStatusUpdate // Pass the status update callback
          );
        } else if (game === "keyclash") {
          const cleanup = KeyClashClient(
            containerRef.current, 
            gameId, 
            mode, 
            type, 
            navigate, 
            name,
            handleGameEnd, // Pass the game end callback
            handleStatusUpdate // Pass the status update callback
          );
          gameCleanupRef.current = cleanup;
          return cleanup;
        }
      }
      
      return () => {
        console.log("🧹 Component cleanup - disposing game instances");
        if (pongInstance.current) {
          pongInstance.current.dispose?.();
          pongInstance.current = null; 
        }
        if (gameCleanupRef.current) {
          gameCleanupRef.current();
          gameCleanupRef.current = null;
        }
      }
    } else {
      console.error("❌ Missing required parameters:", { gameId, mode, game, type });
      alert("Invalid game parameters");
      navigate("/");
    }
  }, [gameId, mode, game, type, location, navigate]);

  // ========== ERROR BOUNDARY FOR GAME ROOM NOT FOUND ==========
  useEffect(() => {
    // Listen for any error messages from the game clients
    const handleGameError = (event: any) => {
      if (event.detail && event.detail.includes("Can't find")) {
        console.log("🚨 Game room not found - clearing stale state");
        clearGameState();
      }
    };

    // Custom event listener (if your game clients dispatch these)
    window.addEventListener('gameError', handleGameError);
    
    return () => {
      window.removeEventListener('gameError', handleGameError);
    };
  }, []);

  // ========== IMPROVED BUTTON LOGIC ==========
  // Show Cancel button only during active gameplay
  const showCancelButton = gameStatus === "in-progress" || gameStatus === "paused";
  
  // Show Back to Lobby button before playing (waiting) and after finishing (finished)
  const showBackToLobbyButton = gameStatus === "waiting" || gameStatus === "finished";

  if (game === "pong") {
    return (
      <div className="relative w-full h-full">
        {/* Back to Lobby Button - Show before playing and after finishing */}
        {showBackToLobbyButton && (
          <button
            onClick={navigateToLobby}
            className="absolute top-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200"
          >
            🏠 Back to Lobby
          </button>
        )}

        {/* Cancel Button - Only show during active gameplay */}
        {showCancelButton && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200"
          >
            ❌ Cancel Game
          </button>
        )}

        {/* Game Container */}
        <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4">Cancel Game?</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to cancel this game? <strong>You will lose this match.</strong> This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmCancelGame}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
                >
                  Yes, I Lose
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
                >
                  Continue Playing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Local Player Selection Modal */}
        {showPlayerSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4">Which Player is Canceling?</h3>
              <p className="text-gray-300 mb-6">
                The player who clicked cancel will lose this match:
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleLocalCancel("player1")}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {playerNames.player1 || "Player 1"} (Loses)
                </button>
                <button
                  onClick={() => handleLocalCancel("player2")}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {playerNames.player2 || "Player 2"} (Loses)
                </button>
                <button
                  onClick={() => setShowPlayerSelectionModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (game === "keyclash") {
    return (
      <div className="relative w-full h-full">
        {/* Back to Lobby Button - Show before playing and after finishing */}
        {showBackToLobbyButton && (
          <button
            onClick={navigateToLobby}
            className="absolute top-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200"
          >
            🏠 Back to Lobby
          </button>
        )}

        {/* Cancel Button - Only show during active gameplay */}
        {showCancelButton && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200"
          >
            ❌ Cancel Game
          </button>
        )}

        {/* Game Container */}
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

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4">Cancel Game?</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to cancel this game? <strong>You will lose this match.</strong> This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmCancelGame}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
                >
                  Yes, I Lose
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
                >
                  Continue Playing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Local Player Selection Modal */}
        {showPlayerSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4">Which Player is Canceling?</h3>
              <p className="text-gray-300 mb-6">
                The player who clicked cancel will lose this match:
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleLocalCancel("player1")}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {playerNames.player1 || "Player 1"} (Loses)
                </button>
                <button
                  onClick={() => handleLocalCancel("player2")}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {playerNames.player2 || "Player 2"} (Loses)
                </button>
                <button
                  onClick={() => setShowPlayerSelectionModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    return null;
  }
};

export default PlayPage;
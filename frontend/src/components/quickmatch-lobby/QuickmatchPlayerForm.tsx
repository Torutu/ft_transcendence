// frontend/src/components/quickmatch-lobby/QuickmatchPlayerForm.tsx
import { useEffect, useState, useCallback } from "react";
import { AvatarData, GameType } from "../../shared/types";
import AvatarPage from "../../pages/general/avatar";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";

interface QuickmatchPlayerFormProps {
  username: string | null;
  onCreate: (type: GameType) => void;
  closeForm: () => void;
}

export default function QuickmatchPlayerForm({ onCreate, closeForm, username }: QuickmatchPlayerFormProps) {
  const { user } = useAuth();
  // Avatar selection form
  const avatarForm = document.getElementById("avatarForm");
  const [target, setTarget] = useState("user");

  // Guest player state
  const [guestName, setGuestName] = useState(() => {
    const saved = localStorage.getItem("quickmatch_guestName");
    return saved || "";
  });

  // Avatar state
  const [userAvatar, setUserAvatar] = useState<AvatarData | null>(() => {
    const saved = localStorage.getItem("userAvatar");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  
  const [guestAvatar, setGuestAvatar] = useState<AvatarData | null>(() => {
    const saved = localStorage.getItem("quickmatch_guestAvatar");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Track which avatars are already selected
  const selectedAvatars = new Set<string>();

  // Guest name change handler
  const handleGuestNameChange = useCallback((newName: string) => {
    setGuestName(newName);
    
    if (newName.trim()) {
      localStorage.setItem("quickmatch_guestName", newName);
    } else {
      localStorage.removeItem("quickmatch_guestName");
    }
  }, []);

  // Load avatars from API
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const response = await api.get('/user/avatars');
        
        if (!userAvatar && response.data.length > 0) {
          const defaultAvatar = { 
            name: response.data[0].id, 
            image: response.data[0].imageUrl 
          };
          setUserAvatar(defaultAvatar);
          localStorage.setItem("userAvatar", JSON.stringify(defaultAvatar));
        }
      } catch (error) {
        console.error("Failed to load avatars:", error);
      }
    };
    
    loadAvatars();
  }, [userAvatar]);

 // Cleanup on mount
  useEffect(() => {
    localStorage.removeItem("userInGame");
    localStorage.removeItem("activeGameInfo");
    localStorage.removeItem("currentGameId");
  }, []);

  // Validation
  const canStartGame = useCallback(() => {
    const trimmedGuestName = guestName.trim();
    const trimmedUsername = username?.trim();
    
    // Validate name
    if (!trimmedUsername || !trimmedGuestName || trimmedGuestName.length > 20) return false;
    if (!/^[A-Za-z0-9 _-]+$/.test(trimmedGuestName)) return false;
    if (trimmedGuestName.toLowerCase() === trimmedUsername.toLowerCase()) return false;
    
    // return userAvatar && guestAvatar;
	return true;
  }, [guestName, userAvatar, guestAvatar, username]);

  // Start game
  const startSpecificGame = useCallback((gameType: GameType) => {
    if (!canStartGame()) {
      const trimmedGuestName = guestName.trim();
      
      if (!trimmedGuestName) {
        alert("Please enter a username for Player 2 (Guest)");
        return;
      }
      if (trimmedGuestName.length > 20 || !/^[A-Za-z0-9 _-]+$/.test(trimmedGuestName)) {
        alert("Player 2 username can only contain letters, numbers, spaces, underscores, and hyphens (max 20 characters)");
        return;
      }
      if (trimmedGuestName.toLowerCase() === username?.toLowerCase()) {
        alert("Player 2 username must be different from your username");
        return;
      }  
      return;
    }
    onCreate(gameType);
  }, [canStartGame, guestName, username, onCreate]);

  // Validation message
  const getValidationMessage = useCallback(() => {
    const trimmedGuestName = guestName.trim();
    
    if (!trimmedGuestName) return "Enter a username for Player 2 (Guest)";
    if (trimmedGuestName.length > 20 || !/^[A-Za-z0-9 _-]+$/.test(trimmedGuestName)) {
      return "Player 2 username must be valid (letters, numbers, spaces, _, - only, max 20 chars)";
    }
    if (trimmedGuestName.toLowerCase() === username?.toLowerCase()) {
      return "Player 2 username must be different from yours";
    }
    return "Ready to start! Choose your game above";
  }, [guestName, username]);


	const showAvatarForm = (target: "user" | "guest") => {
    setTarget(target);
    if (avatarForm) avatarForm.style.display = "block";
  };

	const closeAvatarForm = () => {
    if (avatarForm) avatarForm.style.display = "none";
  };
  
  return (
    <div className="w-full min-h-screen text-white p-8 flex flex-col items-center">
      <button
        onClick={() => closeForm()}
        className="absolute top-30 left-6 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md"
      >
        Close
      </button>

      { user && 
        <div id="avatarForm">
          <AvatarPage closeForm={closeAvatarForm}
                      target={target}
                      setUserAvatar={setUserAvatar}
                      setGuestAvatar={setGuestAvatar}
                      selectedAvatars={selectedAvatars}
          />
        </div>
      }
      <h1 className="text-4xl font-bold text-center mb-6">
        🏠 Local Quick Match Setup
      </h1>

      <div className="w-full max-w-4xl space-y-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Setup Players & Avatars</h2>
          
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-2">👤 Player 1 (You)</h3>
              <p className="mb-4 text-lg">
                Username: <strong>{username}</strong>
              </p>
              {user && userAvatar ? (
                  <>
                    <img
                      src={userAvatar.image}
                      alt={userAvatar.name}
                      className="w-32 h-32 rounded-full border-4 border-blue-400 mb-2 object-cover"
                    />
                    <p className="capitalize mb-4">{userAvatar.name}</p>
                  </>
                ) : ( user &&
                  <p className="mb-4 italic text-gray-400">No avatar selected</p>
              )}
              {user && (
                <button
                  onClick={() => showAvatarForm("user")}
                  className={"px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700"}
                >
                  Choose Avatar
                </button>
                )}  
            </div>

            <div className="text-4xl font-bold text-yellow-400">VS</div>

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

              <div className="text-xs text-gray-400 mb-4 text-center max-w-sm">
                {guestName.trim() && (guestName.trim().length > 20 || !/^[A-Za-z0-9 _-]+$/.test(guestName.trim())) && (
                  <p className="text-red-400">
                    Only letters, numbers, spaces, underscores, and hyphens allowed (max 20 chars)
                  </p>
                )}
                {guestName.trim() && /^[A-Za-z0-9 _-]+$/.test(guestName.trim()) && guestName.trim().length <= 20 && guestName.trim().toLowerCase() === username?.toLowerCase() && (
                  <p className="text-red-400">
                    Must be different from your username
                  </p>
                )}
                {guestName.trim() && /^[A-Za-z0-9 _-]+$/.test(guestName.trim()) && guestName.trim().length <= 20 && guestName.trim().toLowerCase() !== username?.toLowerCase() && (
                  <p className="text-green-400">
                    Valid username!
                  </p>
                )}
              </div>

              {user && guestAvatar ? (
                <>
                  <img
                    src={guestAvatar.image}
                    alt={guestAvatar.name}
                    className="w-32 h-32 rounded-full border-4 border-pink-400 mb-2 object-cover"
                  />
                  <p className="capitalize mb-4">{guestAvatar.name}</p>
                </>
                ) : ( user &&
                  <p className="mb-4 italic text-gray-400">No avatar selected</p>
                )}
              {user &&
                <button
                  onClick={() => showAvatarForm("guest")}
                  className={"px-4 py-2 rounded-lg font-semibold bg-pink-600 hover:bg-pink-700"}
                >
                  Choose Avatar
                </button>
              }
            </div>
          </div>

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

            <div className="text-center mt-6">
              <p className={`text-sm ${canStartGame() ? 'text-green-400' : 'text-gray-400'}`}>
                {getValidationMessage()}
              </p>
            </div>
          </div>            
        </div>
      </div>
    </div>
  );
}
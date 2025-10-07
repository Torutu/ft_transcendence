// frontend/src/components/quickmatch-lobby/QuickmatchRemoteForm.tsx
import { Socket } from "socket.io-client";
import { 
  GameType, 
  Player, 
  OnlineUser,
  Invitation, 
  SentInvitation,
  Avatar,
  AvatarData
} from "../../shared/types";
import AvatarPage from "../../pages/general/avatar";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";

interface QuickmatchRemoteFormProps {
  name: string | null;
  selectedOpponent: OnlineUser | null;
  isPaired: () => boolean;
  pairedGameType: GameType | null;
  formatGameType: (gameType: GameType) => string;
  startSpecificGame: (gameType: GameType) => void;
  getValidationMessage: () => string;
  otherPlayers: Player[];
  sentInvitations: SentInvitation[];
  receivedInvitations: Invitation[];
  invitationTimers: Record<string, number>;
  setSelectedOpponent: React.Dispatch<React.SetStateAction<OnlineUser | null>>;
  respondToInvitation: (invitationId: string, response: "accept" | "decline") => void;
  cancelInvitation: (invitationId: string) => void;
  setPairedGameType: React.Dispatch<React.SetStateAction<GameType | null>>;
  setInvitationMessage: React.Dispatch<React.SetStateAction<string>>;
  setShowInvitationModal: React.Dispatch<React.SetStateAction<boolean>>;
  showInvitationModal: boolean;
  invitationMessage: string;
  closeForm: () => void;
  socket: Socket | null;
}

export default function QuickmatchRemoteForm({ socket, name, selectedOpponent, isPaired, pairedGameType, 
                                                formatGameType, startSpecificGame, showInvitationModal,
                                                getValidationMessage, otherPlayers, sentInvitations,
                                                receivedInvitations, invitationTimers, setSelectedOpponent,
                                                respondToInvitation, cancelInvitation, setPairedGameType,
                                                setInvitationMessage, setShowInvitationModal, closeForm,
                                                invitationMessage 
                                              }: QuickmatchRemoteFormProps) 
{
  const { user } = useAuth();
  // Avatar selection form
  const avatarForm = document.getElementById("remoteAvatarForm");

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
  
  const [opponentAvatar, setOpponentAvatar] = useState<AvatarData | null>(() => {
    const saved = localStorage.getItem("quickmatch_opponentAvatar");
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

	const showAvatarForm = () => {
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

      {showInvitationModal && (
        <div className="fixed top-40 right-40 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <p>{invitationMessage}</p>
        </div>
      )}

      { user && (
        <div id="remoteAvatarForm">
          <AvatarPage closeForm={closeAvatarForm}
                      target={"user"}
                      setUserAvatar={setUserAvatar}
                      setGuestAvatar={setUserAvatar}
                      selectedAvatars={selectedAvatars}
                      />
        </div> )
      }

      <h1 className="text-4xl font-bold text-center mb-6">
        🌐 Remote Quick Match Setup
      </h1>

      <div className="w-full max-w-7xl flex gap-6">
        <div className="w-2/3 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Opponent</h2>
            
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2">👤 Player 1 (You)</h3>
                <p className="mb-4 text-lg">
                  Username: <strong>{name}</strong>
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
                {user &&
                  <button
                    onClick={() => showAvatarForm()}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold"
                  >
                    Choose Avatar
                  </button>
                }
              </div>

              <div className="text-4xl font-bold text-yellow-400">VS</div>

              <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2">🎯 Player 2 (Opponent)</h3>
                
                {selectedOpponent ? (
                  <>
                    <p className="mb-4 text-lg">
                      <strong>{selectedOpponent.name}</strong>
                    </p>

                    <div className="w-32 h-32 rounded-full border-4 border-green-400 mb-4 flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-400 text-white text-4xl font-bold">
                      {selectedOpponent.name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Their avatar will be set by them</p>

                    {isPaired() ? (
                      <div className="bg-green-800 p-3 rounded-lg text-sm text-center mt-4">
                        <div className="text-green-200 font-medium">🎯 Successfully Paired!</div>
                        {pairedGameType && (
                          <div className="text-xs text-green-300 mt-1">
                            Paired for: <strong>{formatGameType(pairedGameType)}</strong>
                          </div>
                        )}
                        <div className="text-xs text-green-300 mt-1">Ready to start games together</div>
                      </div>
                    ) : (
                      <div className="bg-blue-800 p-3 rounded-lg text-sm text-center mt-4">
                        <div className="text-blue-200 font-medium">🎯 Opponent Selected</div>
                        <div className="text-xs text-blue-300 mt-1">Choose a game to send invitation</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-4xl mb-4">
                      ?
                    </div>
                    <p className="text-gray-400 mb-2">Click any player from the online list →</p>
                    <p className="text-xs text-gray-500">Your selection will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Game</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => startSpecificGame("pong")}
                className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
                  "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                }`}
              >
				🏓 { !selectedOpponent && !isPaired() && "Start Open" }
					{ isPaired() && selectedOpponent && "Start" }
					{ !isPaired() && selectedOpponent && "Invite for"} Ping Pong
                {selectedOpponent && (
                  <div className="text-base font-normal mt-2">
                    {isPaired() ? "vs" : "invite"} {selectedOpponent.name}
                  </div>
                )}
              </button>

              <button
                onClick={() => startSpecificGame("keyclash")}
                className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
                  "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                }`}
              >
                ⌨️ { !selectedOpponent && !isPaired() && "Start Open" }
					{ isPaired() && selectedOpponent && "Start" }
					{ !isPaired() && selectedOpponent && "Invite for" } Key Clash
                {selectedOpponent && (
                  <div className="text-base font-normal mt-2">
                    {isPaired() ? "vs" : "invite"} {selectedOpponent.name}
                  </div>
                )}
              </button>
            </div>

            {/* Dynamic status message */}
            <div className="text-center mt-4">
              <p className={`text-sm ${
                (isPaired() ? 'text-green-400 font-medium' : 'text-blue-400') 
              }`}>
                {getValidationMessage()}
              </p>
            </div>
          </div>
        </div>

        <div className="w-1/3">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg sticky top-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🌐 Players available</h2>
            <p className="text-center text-gray-400 text-sm mb-4">
              Click any player to select them ({otherPlayers.length} online)
            </p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {otherPlayers.length > 0 ? (
                otherPlayers.map(player => {
                  const sentInvitation = sentInvitations.find(inv => inv.to.socketId === player.socketId);
                  const receivedInvitation = receivedInvitations.find(inv => inv.from.socketId === player.socketId);
                  
                  const isPairedWithThisPlayer = selectedOpponent && isPaired() && 
                                                 selectedOpponent.socketId === player.socketId;

                  return (
                    <div key={player.socketId} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                          {player.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-green-400">• Online</p>
                          {receivedInvitation && (
                            <p className="text-xs text-blue-400">• Wants to play {formatGameType(receivedInvitation.gameType)}!</p>
                          )}
                          {isPairedWithThisPlayer && (
                            <p className="text-xs text-green-400">🎯 Paired with you!</p>
                          )}
                        </div>
                      </div>
                      
                      {receivedInvitation ? (
                        <div>
                          <div className={`flex gap-2 mb-2 ${
                            invitationTimers[receivedInvitation.id] <= 30 ? 'animate-pulse' : ''
                          }`}>
                            <button
                              onClick={() => {
                                setSelectedOpponent(player);
                                setTimeout(() => {
                                  respondToInvitation(receivedInvitation.id, "accept");
                                }, 100);
                              }}
                              className={`px-3 py-1 rounded text-sm font-medium flex-1 ${
                                invitationTimers[receivedInvitation.id] <= 30 
                                  ? 'bg-green-700 hover:bg-green-800 text-white' 
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              ✅ Accept
                            </button>
                            <button
                              onClick={() => respondToInvitation(receivedInvitation.id, "decline")}
                              className={`px-3 py-1 rounded text-sm font-medium flex-1 ${
                                invitationTimers[receivedInvitation.id] <= 30 
                                  ? 'bg-red-700 hover:bg-red-800 text-white' 
                                  : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                            >
                              ❌ Decline
                            </button>
                          </div>
                          {invitationTimers[receivedInvitation.id] !== undefined && invitationTimers[receivedInvitation.id] >= 0 && (
                            <div className="text-center">
                              <span className={`text-xs ${
                                invitationTimers[receivedInvitation.id] <= 30 ? 'text-red-300 animate-pulse' : 'text-blue-300'
                              }`}>
                                Expires in {Math.floor(invitationTimers[receivedInvitation.id] / 60)}:{String(invitationTimers[receivedInvitation.id] % 60).padStart(2, '0')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : sentInvitation ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded text-sm font-medium flex-1 text-center ${
                              invitationTimers[sentInvitation.id] <= 30 ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-black'
                            }`}>
                              Pending
                            </span>
                            <button
                              onClick={() => cancelInvitation(sentInvitation.id)}
                              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                          {invitationTimers[sentInvitation.id] !== undefined && invitationTimers[sentInvitation.id] >= 0 && (
                            <div className="text-center">
                              <span className={`text-xs ${
                                invitationTimers[sentInvitation.id] <= 30 ? 'text-red-300 animate-pulse' : 'text-yellow-300'
                              }`}>
                                {Math.floor(invitationTimers[sentInvitation.id] / 60)}:{String(invitationTimers[sentInvitation.id] % 60).padStart(2, '0')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : isPairedWithThisPlayer ? (
                        <button
                          onClick={() => {
                            if (!socket) return;
                            socket.emit("cancel_pairing", (result: any) => {
                              if (result.error) {
                                alert(result.error);
                              } else {
                                setSelectedOpponent(null);
                                setPairedGameType(null);
                                localStorage.removeItem("pairingData");
                                setInvitationMessage("Pairing cancelled. You can select a new opponent.");
                                setShowInvitationModal(true);
                                setTimeout(() => setShowInvitationModal(false), 2000);
                              }
                            });
                          }}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium w-full"
                        >
                          🔗 Cancel Pairing
                        </button>
                      ) : (
                        selectedOpponent?.socketId === player.socketId ?
                        <button
                          onClick={() => {
                             setSelectedOpponent(null) 
                          }}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium w-full"
                        >
                           Remove Selection
                        </button>
                        : <button
                        onClick={() => {
                           setSelectedOpponent(player);
                        }}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium w-full"
                      >
                         Select Opponent
                      </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-4xl mb-2">👻</p>
                  <p>No other players online</p>
                  <p className="text-sm mt-1">Share the game with friends!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
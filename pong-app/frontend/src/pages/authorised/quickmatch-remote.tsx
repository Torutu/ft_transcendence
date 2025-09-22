// // frontend/src/pages/authorised/quickmatch-remote.tsx
// import { useEffect, useState, useRef, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import { io, Socket } from "socket.io-client";
// import { useAuth } from "../../contexts/AuthContext";
// import { getAvatars } from "../../utils/lobbyApi";
// import { AvatarSelector } from "../../components/shared/AvatarSelector";
// import { 
//   getStoredAvatarData, 
//   saveAvatarData, 
//   getNextAvatar,
//   cleanupGameStorage 
// } from "../../shared/utils";
// import { 
//   Avatar, 
//   AvatarData, 
//   GameType, 
//   Player, 
//   OnlineUser, 
//   GameRoom, 
//   Invitation, 
//   SentInvitation 
// } from "../../shared/types";

// // ========== ADDED: GameInfo interface for status tracking ==========
// interface GameInfo {
//   player1: string;
//   player2: string;
//   gameType: 'pong' | 'keyclash';
//   mode: 'local' | 'remote';
//   gameId: string;
//   startTime: number;
// }

// export default function QuickmatchRemotePage() {
//   const socketRef = useRef<Socket | null>(null);
//   const navigate = useNavigate();
//   const { user } = useAuth();
  
//   const [isInitialized, setIsInitialized] = useState(false);
//   const loggedInUsername = user?.username || "";
  
//   // Lobby state
//   const [players, setPlayers] = useState<Player[]>([]);
//   const [pongGames, setPongGames] = useState<GameRoom[]>([]);
//   const [keyClashGames, setKeyClashGames] = useState<GameRoom[]>([]);
  
//   // Invitation state
//   const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
//   const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
//   const [showInvitationModal, setShowInvitationModal] = useState(false);
//   const [invitationMessage, setInvitationMessage] = useState("");
//   const [invitationTimers, setInvitationTimers] = useState<Record<string, number>>({});
  
//   // Game selection state
//   const [selectedGameType, setSelectedGameType] = useState<GameType>("pong");
//   const [selectedOpponent, setSelectedOpponent] = useState<OnlineUser | null>(null);
//   const [pairedGameType, setPairedGameType] = useState<GameType | null>(null); // Track invited game type
  
//   // Check if user is currently in a game
//   const [isInGame, setIsInGame] = useState(() => {
//     const inGame = localStorage.getItem("userInGame");
//     return inGame === "true";
//   });

//   // ========== ADDED: Active game info for status display ==========
//   const [activeGameInfo, setActiveGameInfo] = useState<GameInfo | null>(() => {
//     const gameInfo = localStorage.getItem("activeGameInfo");
//     if (gameInfo) {
//       try {
//         return JSON.parse(gameInfo);
//       } catch (e) {
//         localStorage.removeItem("activeGameInfo");
//       }
//     }
//     return null;
//   });
  
//   // Avatar state
//   const [userAvatar, setUserAvatar] = useState<AvatarData | null>(() => 
//     getStoredAvatarData("userAvatar")
//   );
  
//   const [opponentAvatar, setOpponentAvatar] = useState<AvatarData | null>(() => 
//     getStoredAvatarData("opponentAvatar")
//   );

//   const [availableAvatars, setAvailableAvatars] = useState<Avatar[]>([]);

//    // Filter out current user from players list
//   const otherPlayers = players.filter(p => p.name !== loggedInUsername);

//   // Format game type for display
//   const formatGameType = (gameType: GameType): string => {
//     switch (gameType) {
//       case "pong":
//         return "Ping Pong";
//       case "keyclash":
//         return "Key Clash";
//       default:
//         return gameType;
//     }
//   };

//   // Avatar change handlers
//   const handleUserAvatarChange = useCallback((newAvatar: AvatarData | null) => {
//     setUserAvatar(newAvatar);
//     saveAvatarData("userAvatar", newAvatar);
//   }, []);

//   const handleOpponentAvatarChange = useCallback((newAvatar: AvatarData | null) => {
//     setOpponentAvatar(newAvatar);
//     saveAvatarData("opponentAvatar", newAvatar);
//   }, []);

//   // ========== ADDED: Game status handlers ==========
//   const handleReturnToGame = useCallback(() => {
//     if (activeGameInfo) {
//       navigate(`/${activeGameInfo.gameType}/${activeGameInfo.mode}/1v1/${activeGameInfo.gameId}`, {
//         state: {
//           user: activeGameInfo.player1,
//           guest: activeGameInfo.player2,
//           userAvatar: userAvatar || { name: "default", image: "/avatars/av1.jpeg" },
//           guestAvatar: { name: "default", image: "/avatars/av2.jpeg" },
//           gameType: activeGameInfo.gameType,
//           mode: activeGameInfo.mode,
//           type: "1v1",
//           fromRemoteInvitation: true,
//           isRemote: true,
//           gameId: activeGameInfo.gameId
//         }
//       });
//     }
//   }, [activeGameInfo, userAvatar, navigate]);

//   // ========== ADDED: Simple game state monitoring ==========
//   useEffect(() => {
//     const checkGameStatus = () => {
//       const userInGame = localStorage.getItem("userInGame");
//       const gameInfo = localStorage.getItem("activeGameInfo");
      
//       setIsInGame(userInGame === "true");
      
//       if (userInGame === "true" && gameInfo) {
//         try {
//           setActiveGameInfo(JSON.parse(gameInfo));
//         } catch (e) {
//           localStorage.removeItem("activeGameInfo");
//           setActiveGameInfo(null);
//         }
//       } else {
//         // Game ended - clear opponent selection
//         if (activeGameInfo) {
//           setActiveGameInfo(null);
//           setSelectedOpponent(null);
//           setPairedGameType(null);
//           localStorage.removeItem("pairingData");
//         }
//       }
//     };

//     checkGameStatus();
//     const interval = setInterval(checkGameStatus, 1000);
    
//     return () => clearInterval(interval);
//   }, [activeGameInfo]); // Minimal dependencies

//   // Debug logging for invitation states
//   useEffect(() => {
//     console.log("Sent invitations updated:", sentInvitations);
//   }, [sentInvitations]);

//   useEffect(() => {
//     console.log("Received invitations updated:", receivedInvitations);
//   }, [receivedInvitations]);

//   useEffect(() => {
//     console.log("Invitation timers updated:", invitationTimers);
//   }, [invitationTimers]);

//   // Initialize avatars and component
//   useEffect(() => {
//     if (isInitialized) return;
    
//     const loadAvatars = async () => {
//       try {
//         const avatars = await getAvatars();
//         setAvailableAvatars(avatars);
        
//         if (!userAvatar && avatars.length > 0) {
//           const defaultAvatar = { name: avatars[0].id, image: avatars[0].imageUrl };
//           handleUserAvatarChange(defaultAvatar);
//         }

//         setIsInitialized(true);
//       } catch (error) {
//         console.error("Failed to load avatars:", error);
//         setIsInitialized(true);
//       }
//     };
    
//     loadAvatars();
//   }, [isInitialized, userAvatar, handleUserAvatarChange]);

//   // Cleanup on mount and unmount
//   useEffect(() => {
//     cleanupGameStorage();
//     // Also cleanup any stale pairing data on mount
//     const pairingData = localStorage.getItem("pairingData");
//     if (pairingData) {
//       try {
//         const pairing = JSON.parse(pairingData);
//         // If pairing is older than 10 minutes, clean it up
//         if (Date.now() - pairing.timestamp > 600000) {
//           localStorage.removeItem("pairingData");
//           setPairedGameType(null);
//         } else if (pairing.gameType) {
//           // Restore paired game type
//           setPairedGameType(pairing.gameType);
//         }
//       } catch (e) {
//         localStorage.removeItem("pairingData");
//         setPairedGameType(null);
//       }
//     }

//     // Check if user is currently in a game
//     const userInGame = localStorage.getItem("userInGame");
//     setIsInGame(userInGame === "true");
//   }, []);

//   // Cleanup pairing data on unmount
//   useEffect(() => {
//     return () => {
//       // Clean up game state if leaving the page without starting a game
//       const userInGame = localStorage.getItem("userInGame");
//       const currentGameId = localStorage.getItem("currentGameId");
      
//       // If user is marked as in game but we're leaving this page, 
//       // it might be a navigation away from lobby - keep the state
//       // Only clear if it's been a long time or invalid state
//     };
//   }, []);

//   // Add window beforeunload handler to clear game state if needed
//   useEffect(() => {
//     const handleBeforeUnload = () => {
//       // Don't clear game state on page refresh - user might be in actual game
//     };

//     window.addEventListener('beforeunload', handleBeforeUnload);
//     return () => window.removeEventListener('beforeunload', handleBeforeUnload);
//   }, []);

//   // Clear selected opponent if they're no longer in the online list
// useEffect(() => {
//   if (selectedOpponent) {
//     const isOpponentStillOnline = otherPlayers.some(
//       player => player.socketId === selectedOpponent.socketId
//     );
    
//     if (!isOpponentStillOnline) {
//       console.log(`Selected opponent ${selectedOpponent.name} is no longer online - clearing selection`);
//       setSelectedOpponent(null);
//     }
//   }
// }, [otherPlayers, selectedOpponent]);

//     useEffect(() => {
//   // Clear selected opponent if no players are available online
//   if (otherPlayers.length === 0 && selectedOpponent) {
//     console.log("No players online - clearing selected opponent");
//     setSelectedOpponent(null);
//   }
// }, [otherPlayers.length, selectedOpponent]);

//   // Countdown timer for invitations
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setInvitationTimers(prev => {
//         const updated = { ...prev };
//         let hasExpired = false;
        
//         Object.keys(updated).forEach(invitationId => {
//           if (updated[invitationId] > 0) {
//             updated[invitationId] -= 1;
//             if (updated[invitationId] % 10 === 0) {
//               console.log(`Invitation ${invitationId} timer: ${updated[invitationId]}s remaining`);
//             }
//           } else if (updated[invitationId] === 0) {
//             hasExpired = true;
//             console.log(`Invitation ${invitationId} expired!`);
            
//             const sentInvitation = sentInvitations.find(inv => inv.id === invitationId);
//             const receivedInvitation = receivedInvitations.find(inv => inv.id === invitationId);
            
//             if (sentInvitation) {
//               setSentInvitations(current => current.filter(inv => inv.id !== invitationId));
//               setInvitationMessage("⏰ Your invitation expired (2 minutes timeout)");
//               setShowInvitationModal(true);
//               setTimeout(() => setShowInvitationModal(false), 3000);
//             }
            
//             if (receivedInvitation) {
//               setReceivedInvitations(current => current.filter(inv => inv.id !== invitationId));
//               setInvitationMessage("⏰ Game invitation expired");
//               setShowInvitationModal(true);
//               setTimeout(() => setShowInvitationModal(false), 3000);
//             }
            
//             delete updated[invitationId];
//           }
//         });
        
//         return updated;
//       });
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [sentInvitations, receivedInvitations]);

//   // Socket setup for remote games
//   useEffect(() => {
//     if (!isInitialized) return;
    
//     let name: string | null = null;
//     let playerId: string | null = null;

//     socketRef.current = io("/quickmatch", {
//       path: "/socket.io",
//       transports: ["websocket"],
//       secure: true
//     });

//     socketRef.current.on("connect", () => {
//       console.log("=== SOCKET CONNECTION DEBUG ===");
//   console.log("Socket connected with ID:", socketRef.current?.id);
//   console.log("User object:", user);
//   console.log("Username:", loggedInUsername);
//       name = null;
//       playerId = null;
      
//       if (user) {
//         if (user.username) {
//           name = user.username;
//         }
//         if (user.id) {
//           playerId = String(user.id);
//         }
//       }

//       console.log("Emitting name with:", { name, playerId });
      
//       socketRef.current?.emit("name", name, playerId, (res: { error: string }) => {
//         if (res.error) {
//           alert(res.error);
//           navigate("/lobby");
//         }
//       });
//     });

//     socketRef.current.on("lobby_update", (data) => {
//       setPlayers(data.players);
//       setPongGames(data.pongGames);
//       setKeyClashGames(data.keyClashGames);
//     });

//     socketRef.current.on("created_game", (gameId, game, mode) => {
//       joinGame(gameId, game, mode);
//     });

//     socketRef.current.on("invitation_sent", (data: {
//       id: string;
//       to: { socketId: string; name: string };
//       gameType: GameType;
//     }) => {
//       console.log("Received invitation_sent:", data);
      
//       setSentInvitations(prev => {
//         const tempInvitation = prev.find(inv => 
//           inv.to.socketId === data.to.socketId && inv.id.startsWith('temp-')
//         );
        
//         const filtered = prev.filter(inv => 
//           !(inv.to.socketId === data.to.socketId && inv.id.startsWith('temp-'))
//         );
        
//         return [...filtered, {
//           id: data.id,
//           to: data.to,
//           gameType: data.gameType,
//           timestamp: Date.now()
//         }];
//       });

//       setInvitationTimers(prev => {
//         const updated = { ...prev };
//         const tempIds = Object.keys(updated).filter(id => id.startsWith('temp-'));
//         const tempTimer = tempIds.length > 0 ? updated[tempIds[tempIds.length - 1]] : 120;
        
//         console.log(`Transferring timer from temp invitation (${tempTimer}s) to ${data.id}`);
//         tempIds.forEach(tempId => delete updated[tempId]);
//         updated[data.id] = tempTimer;
        
//         return updated;
//       });
//     });

//     socketRef.current.on("invitation_received", (invitation: Invitation) => {
//       console.log("Received invitation_received:", invitation);
//       setReceivedInvitations(prev => [...prev, invitation]);
      
//       setInvitationTimers(prev => {
//         console.log(`Starting timer for received invitation ${invitation.id}: 120 seconds`);
//         return {
//           ...prev,
//           [invitation.id]: 120
//         };
//       });
      
//       setInvitationMessage(`${invitation.from.name} invited you to play ${formatGameType(invitation.gameType)}!`);
//       setShowInvitationModal(true);
      
//       setTimeout(() => {
//         setShowInvitationModal(false);
//       }, 3000);
//     });

//     // Handle players being paired (step 1: pairing confirmed)
//     socketRef.current.on("players_paired", (data: {
//       pairId: string;
//       player1: { socketId: string; name: string };
//       player2: { socketId: string; name: string };
//       yourRole: "sender" | "receiver";
//       opponent: { socketId: string; name: string };
//       timestamp: number;
//     }) => {
//       console.log("Players paired received:", data);
      
//       // Clear invitations since we're now paired
//       setReceivedInvitations([]);
//       setSentInvitations([]);
//       setInvitationTimers({});
      
//       // Set the opponent as selected
//       const opponentUser: OnlineUser = {
//         socketId: data.opponent.socketId,
//         name: data.opponent.name
//       };
//       setSelectedOpponent(opponentUser);
      
//       // Store pairing data for when game starts
//       const pairingData = { ...data };
      
//       // Get the game type from recent invitation
//       const recentInvitation = sentInvitations.find(inv => inv.to.socketId === data.opponent.socketId) ||
//                               receivedInvitations.find(inv => inv.from.socketId === data.opponent.socketId);
      
//       if (recentInvitation) {
//         setPairedGameType(recentInvitation.gameType);
//         pairingData.gameType = recentInvitation.gameType;
//       }
      
//       localStorage.setItem("pairingData", JSON.stringify(pairingData));
      
//       const gameTypeText = recentInvitation ? formatGameType(recentInvitation.gameType) : "game";
//       setInvitationMessage(`✅ You are now paired with ${data.opponent.name} for ${gameTypeText}!`);
//       setShowInvitationModal(true);
//       setTimeout(() => setShowInvitationModal(false), 3000);
//     });

//     // Handle game setup complete (step 2: game room created, navigate to game)
//     socketRef.current.on("game_setup_complete", (gameData: {
//       gameId: string;
//       gameType: string;
//       mode: string;
//       type: string;
//       yourRole: "sender" | "receiver";
//       yourSide: "left" | "right";
//       senderData: { name: string; socketId: string };
//       receiverData: { name: string; socketId: string };
//     }) => {
//       console.log("Game setup complete received:", gameData);
      
//       // ========== ADDED: Store game info for status tracking ==========
//       const gameInfo: GameInfo = {
//         player1: gameData.yourRole === "sender" ? gameData.senderData.name : gameData.receiverData.name,
//         player2: gameData.yourRole === "sender" ? gameData.receiverData.name : gameData.senderData.name,
//         gameType: gameData.gameType as GameType,
//         mode: gameData.mode as 'local' | 'remote',
//         gameId: gameData.gameId,
//         startTime: Date.now()
//       };

//       // Mark user as in game
//       localStorage.setItem("userInGame", "true");
//       localStorage.setItem("currentGameId", gameData.gameId);
//       localStorage.setItem("activeGameInfo", JSON.stringify(gameInfo)); // ADDED
      
//       let navigationState;
      
//       if (gameData.yourRole === "sender") {
//         navigationState = {
//           user: gameData.senderData.name,
//           guest: gameData.receiverData.name,
//           userAvatar: userAvatar || { name: "default", image: "/avatars/av1.jpeg" },
//           guestAvatar: { name: "default", image: "/avatars/av2.jpeg" }, // Default avatar for opponent
//           gameType: gameData.gameType,
//           mode: gameData.mode,
//           type: gameData.type,
//           fromRemoteInvitation: true,
//           isRemote: true,
//           yourSide: gameData.yourSide,
//           gameId: gameData.gameId
//         };
//       } else {
//         navigationState = {
//           user: gameData.receiverData.name,
//           guest: gameData.senderData.name,
//           userAvatar: userAvatar || { name: "default", image: "/avatars/av1.jpeg" },
//           guestAvatar: { name: "default", image: "/avatars/av1.jpeg" }, // Default avatar for opponent
//           gameType: gameData.gameType,
//           mode: gameData.mode,
//           type: gameData.type,
//           fromRemoteInvitation: true,
//           isRemote: true,
//           yourSide: gameData.yourSide,
//           gameId: gameData.gameId
//         };
//       }
      
//       console.log("Navigation state prepared:", navigationState);
      
//       setInvitationMessage("🎮 Game starting...");
//       setShowInvitationModal(true);
      
//       setTimeout(() => {
//         console.log("Navigating to game...");
//         // Clean up pairing data
//         localStorage.removeItem("pairingData");
        
//         socketRef.current?.disconnect();
//         socketRef.current = null;
        
//         navigate(`/${gameData.gameType}/${gameData.mode}/${gameData.type}/${gameData.gameId}`, {
//           state: navigationState
//         });
//       }, 1000);
//     });

//     socketRef.current.on("invitation_declined", (data: { id: string; by: string }) => {
//       console.log("Invitation declined:", data);
//       setSentInvitations(prev => prev.filter(inv => inv.id !== data.id));
      
//       setInvitationTimers(prev => {
//         const updated = { ...prev };
//         delete updated[data.id];
//         return updated;
//       });
      
//       // Clear selected opponent and paired game type when invitation is declined
//       setSelectedOpponent(null);
//       setPairedGameType(null);
      
//       setInvitationMessage(`${data.by} declined your invitation.`);
//       setShowInvitationModal(true);
//       setTimeout(() => setShowInvitationModal(false), 2000);
//     });

//     socketRef.current.on("invitation_expired", (data: { id: string }) => {
//       console.log("Invitation expired from server:", data);
      
//       const wasSentInvitation = sentInvitations.some(inv => inv.id === data.id);
      
//       setReceivedInvitations(prev => prev.filter(inv => inv.id !== data.id));
//       setSentInvitations(prev => prev.filter(inv => inv.id !== data.id));
      
//       setInvitationTimers(prev => {
//         const updated = { ...prev };
//         delete updated[data.id];
//         return updated;
//       });
      
//       if (wasSentInvitation) {
//         setInvitationMessage("⏰ Your invitation expired (2 minutes timeout)");
//       } else {
//         setInvitationMessage("⏰ Game invitation expired");
//       }
//       setShowInvitationModal(true);
//       setTimeout(() => setShowInvitationModal(false), 3000);
//     });

//     socketRef.current.on("pairing_expired", (data: { pairId: string }) => {
//       console.log("Pairing expired:", data);
//       setSelectedOpponent(null);
//       setPairedGameType(null);
//       localStorage.removeItem("pairingData");
//       setInvitationMessage("⏰ Pairing expired. You can select a new opponent.");
//       setShowInvitationModal(true);
//       setTimeout(() => setShowInvitationModal(false), 3000);
//     });

//     socketRef.current.on("pairing_cancelled", (data: { pairId: string; reason?: string }) => {
//       console.log("Pairing cancelled:", data);
//       setSelectedOpponent(null);
//       setPairedGameType(null);
//       localStorage.removeItem("pairingData");
//       setInvitationMessage(`❌ Pairing cancelled: ${data.reason || "Unknown reason"}`);
//       setShowInvitationModal(true);
//       setTimeout(() => setShowInvitationModal(false), 3000);
//     });

//     socketRef.current.on("invitation_cancelled", (data: { id: string; reason?: string; by?: string }) => {
//       console.log("Invitation cancelled:", data);
//       setReceivedInvitations(prev => prev.filter(inv => inv.id !== data.id));
//       if (data.reason) {
//         setInvitationMessage(`Invitation cancelled: ${data.reason}`);
//         setShowInvitationModal(true);
//         setTimeout(() => setShowInvitationModal(false), 2000);
//       }
//     });

//     return () => {
//       socketRef.current?.disconnect();
//       socketRef.current = null;
//     };
//   }, [isInitialized, user, navigate, loggedInUsername, userAvatar]);

//   // Send invitation with specific game type
//   const sendPlayRequest = (opponent: OnlineUser, gameType: GameType) => {
//     if (!socketRef.current) return;

//     console.log("sendPlayRequest called for:", opponent.name, "gameType:", gameType);

//     const tempInvitation: SentInvitation = {
//       id: `temp-${Date.now()}`,
//       to: { socketId: opponent.socketId, name: opponent.name },
//       gameType: gameType,
//       timestamp: Date.now()
//     };
    
//     setSentInvitations(prev => [...prev, tempInvitation]);

//     setInvitationTimers(prev => {
//       console.log(`Starting timer for invitation ${tempInvitation.id}: 120 seconds`);
//       return {
//         ...prev,
//         [tempInvitation.id]: 120
//       };
//     });

//     socketRef.current.emit("send_invitation", opponent.socketId, gameType, (response: any) => {
//       console.log("send_invitation response:", response);
      
//       if (response.error) {
//         setSentInvitations(prev => prev.filter(inv => inv.id !== tempInvitation.id));
//         setInvitationTimers(prev => {
//           const updated = { ...prev };
//           delete updated[tempInvitation.id];
//           return updated;
//         });
//         alert(response.error);
//       } else {
//         setInvitationMessage(`Invitation sent to ${opponent.name} for ${formatGameType(gameType)}!`);
//         setShowInvitationModal(true);
//         setTimeout(() => setShowInvitationModal(false), 2000);
//       }
//     });
//   };

//   // Respond to invitation
//   const respondToInvitation = (invitationId: string, response: "accept" | "decline") => {
//     if (!socketRef.current) return;

//     console.log("=== RESPOND TO INVITATION START ===");
//     console.log("Invitation ID:", invitationId);
//     console.log("Response:", response);

//     socketRef.current.emit("respond_to_invitation", invitationId, response, (result: any) => {
//       console.log("Response result:", result);
      
//       if (result.error) {
//         console.log("Error in response:", result.error);
//         alert(result.error);
//       } else {
//         console.log("Successfully responded to invitation");
        
//         setReceivedInvitations(prev => {
//           const filtered = prev.filter(inv => inv.id !== invitationId);
//           console.log("Received invitations after cleanup:", filtered.length);
//           return filtered;
//         });
        
//         setInvitationTimers(prev => {
//           const updated = { ...prev };
//           delete updated[invitationId];
//           console.log("Timers after cleanup:", Object.keys(updated).length);
//           return updated;
//         });
        
//         if (response === "accept") {
//           console.log("Invitation accepted - waiting for players_paired...");
//           setInvitationMessage("Pairing players...");
//           setShowInvitationModal(true);
//         } else {
//           console.log("Invitation declined");
//           setInvitationMessage("Invitation declined.");
//           setShowInvitationModal(true);
//           setTimeout(() => setShowInvitationModal(false), 1500);
//         }
//       }
//       console.log("=== RESPOND TO INVITATION END ===");
//     });
//   };

//   // Cancel sent invitation
//   const cancelInvitation = (invitationId: string) => {
//     if (!socketRef.current) return;

//     socketRef.current.emit("cancel_invitation", invitationId, (result: any) => {
//       if (result.error) {
//         alert(result.error);
//       } else {
//         setSentInvitations(prev => prev.filter(inv => inv.id !== invitationId));
//         setInvitationTimers(prev => {
//           const updated = { ...prev };
//           delete updated[invitationId];
//           return updated;
//         });
//         setSelectedOpponent(null);
//         setInvitationMessage("Invitation cancelled.");
//         setShowInvitationModal(true);
//         setTimeout(() => setShowInvitationModal(false), 1500);
//       }
//     });
//   };

//   // Avatar selection
//   const chooseAvatar = useCallback(() => {
//     const nextAvatar = getNextAvatar(availableAvatars, userAvatar);
    
//     if (nextAvatar) {
//       handleUserAvatarChange(nextAvatar);
//     }
//   }, [availableAvatars, userAvatar, handleUserAvatarChange]);

//   // Validation
//   const canStartGame = useCallback(() => {
//     return userAvatar && selectedOpponent; // No need to check opponent avatar
//   }, [userAvatar, selectedOpponent]);

//   const joinGame = (gameId: string, game: GameType, mode: "remote") => {
//     socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
//       if (res.error) alert(res.error);
//     });
//   };

//   // Check if currently paired
//   const isPaired = useCallback(() => {
//     const pairingData = localStorage.getItem("pairingData");
//     if (pairingData && selectedOpponent) {
//       try {
//         const pairing = JSON.parse(pairingData);
//         return pairing.opponent.socketId === selectedOpponent.socketId;
//       } catch (e) {
//         localStorage.removeItem("pairingData");
//         setPairedGameType(null);
//       }
//     }
//     return false;
//   }, [selectedOpponent]);

//   // Function to clear game state when game ends
//   const clearGameState = useCallback(() => {
//     localStorage.removeItem("userInGame");
//     localStorage.removeItem("currentGameId");
//     setIsInGame(false);
//   }, []);

//   // Function to check current game status
//   const checkGameStatus = useCallback(() => {
//     const userInGame = localStorage.getItem("userInGame");
//     const currentGameId = localStorage.getItem("currentGameId");
    
//     if (userInGame === "true" && currentGameId) {
//       return { inGame: true, gameId: currentGameId };
//     }
//     return { inGame: false, gameId: null };
//   }, []);

//   // Start game
//   const startSpecificGame = useCallback((gameType: GameType) => {
//     // Check if user is already in a game
//     if (isInGame) {
//       const currentGameId = localStorage.getItem("currentGameId");
//       const confirm = window.confirm(
//         `You are already in a game (${currentGameId}). Do you want to leave that game and start a new one?`
//       );
//       if (!confirm) return;
      
//       // Clear current game state
//       localStorage.removeItem("userInGame");
//       localStorage.removeItem("currentGameId");
//       setIsInGame(false);
//     }

//     if (!canStartGame()) {
//       alert("Please select an opponent and ensure you have an avatar selected");
//       return;
//     }

//     // Check if paired and game type matches
//     if (isPaired() && pairedGameType && pairedGameType !== gameType) {
//       alert(`You are paired for ${formatGameType(pairedGameType)}. Please click "Start ${formatGameType(pairedGameType)}" instead.`);
//       return;
//     }

//     setSelectedGameType(gameType);
//     localStorage.setItem("gameType", gameType);

//     // Check if we're already paired with this opponent
//     const pairingData = localStorage.getItem("pairingData");
//     if (pairingData && selectedOpponent) {
//       try {
//         const pairing = JSON.parse(pairingData);
//         const isPaired = pairing.opponent.socketId === selectedOpponent.socketId;
        
//         if (isPaired) {
//           console.log("Already paired! Starting game directly:", gameType);
          
//           if (!socketRef.current) {
//             alert("Connection lost. Please refresh and try again.");
//             return;
//           }
          
//           // Send start_paired_game event
//           socketRef.current.emit("start_paired_game", gameType, (response: any) => {
//             if (response.error) {
//               console.error("Error starting paired game:", response.error);
//               alert(response.error);
//               // Clear pairing data on error
//               localStorage.removeItem("pairingData");
//               setSelectedOpponent(null);
//               setPairedGameType(null);
//             } else {
//               console.log("Paired game starting...");
//               setInvitationMessage("🎮 Starting game...");
//               setShowInvitationModal(true);
//             }
//           });
//           return;
//         }
//       } catch (e) {
//         console.error("Error parsing pairing data:", e);
//         localStorage.removeItem("pairingData");
//       }
//     }

//     // Not paired yet, send invitation as usual
//     if (selectedOpponent) {
//       console.log("Sending invitation for remote game to:", selectedOpponent.name);
//       sendPlayRequest(selectedOpponent, gameType); // Pass gameType here
//     } else {
//       console.log("No opponent selected for remote game");
//       alert("Please select an opponent first");
//     }
//   }, [canStartGame, selectedOpponent, isInGame, pairedGameType, isPaired]);

//   // ========== ADDED: Game status banner ==========
//   const renderGameStatus = () => {
//     if (!isInGame || !activeGameInfo) return null;
    
//     const gameId = activeGameInfo.gameId;
//     return (
//       <div className="bg-blue-900 border border-blue-600 p-4 rounded-lg mb-6">
//         <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
//           <span className="text-blue-200">🎮 Game in progress - Room: <strong className="text-white">{gameId}</strong></span>
//           <button
//             onClick={handleReturnToGame}
//             className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1"
//           >
//             🚪 Go to Game Room
//           </button>
//         </div>
//       </div>
//     );
//   };

//   // Validation message
//   const getValidationMessage = useCallback(() => {
//     if (isInGame) {
//       const { gameId } = checkGameStatus();
//       return `⚠️ Already in game (${gameId}). New games will end current game.`;
//     }
    
//     if (!userAvatar) return "Please select your avatar";
//     if (!selectedOpponent) return "Please select an opponent from the online players list";
    
//     // Check if paired
//     if (isPaired()) {
//       if (pairedGameType) {
//         return `🎯 Paired for ${formatGameType(pairedGameType)}! Click "Start ${formatGameType(pairedGameType)}" above`;
//       }
//       return "🎯 Paired and ready! Choose your game above to start playing";
//     }
    
//     return "✅ Ready to invite! Choose your game above to send invitation";
//   }, [userAvatar, selectedOpponent, isPaired, pairedGameType, isInGame, checkGameStatus]);

//   if (!isInitialized) {
//     return (
//       <div className="w-full min-h-screen text-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
//           <p className="text-lg">Loading game setup...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full min-h-screen text-white p-8 flex flex-col items-center">
//       {/* Back Button */}
//       <button
//         onClick={() => navigate("/lobby")}
//         className="absolute top-30 left-6 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md"
//       >
//         🔙 Back to Lobby
//       </button>

//       {/* Invitation Notification Modal */}
//       {showInvitationModal && (
//         <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
//           <p>{invitationMessage}</p>
//         </div>
//       )}

//       {/* Pending Invitations Badge */}
//       {receivedInvitations.length > 0 && (
//         <div className="fixed top-6 right-6 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-40">
//           {receivedInvitations.length}
//         </div>
//       )}

//       <h1 className="text-4xl font-bold text-center mb-6">
//         🌐 Remote Quick Match Setup
//       </h1>

//       {/* ========== ADDED: Game Status Display ========== */}
//       {renderGameStatus()}

//       <div className="w-full max-w-7xl flex gap-6">
//         {/* Left Column - Main Content */}
//         <div className="w-2/3 space-y-6">
//           {/* Player Setup Section */}
//           <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
//             <h2 className="text-2xl font-bold mb-6 text-center">Choose Players & Avatars</h2>
            
//             <div className="flex flex-col lg:flex-row gap-8 items-center">
//               {/* Player 1 */}
//               <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
//                 <h3 className="text-2xl font-bold mb-2">👤 Player 1 (You)</h3>
//                 <p className="mb-4 text-lg">
//                   Username: <strong>{loggedInUsername}</strong>
//                 </p>

//                 <AvatarSelector
//                   avatar={userAvatar}
//                   onChooseAvatar={chooseAvatar}
//                   borderColor="border-blue-400"
//                   buttonColor="bg-blue-600"
//                   buttonHoverColor="bg-blue-700"
//                 />
//               </div>

//               {/* VS Separator */}
//               <div className="text-4xl font-bold text-yellow-400">VS</div>

//               {/* Player 2 - Selected Opponent */}
//               <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
//                 <h3 className="text-2xl font-bold mb-2">🎯 Player 2 (Opponent)</h3>
                
//                 {selectedOpponent ? (
//                   <>
//                     <p className="mb-4 text-lg">
//                       <strong>{selectedOpponent.name}</strong>
//                     </p>

//                     {/* Display opponent's avatar (not changeable by player 1) */}
//                     <div className="w-32 h-32 rounded-full border-4 border-green-400 mb-4 flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-400 text-white text-4xl font-bold">
//                       {selectedOpponent.name.charAt(0).toUpperCase()}
//                     </div>
//                     <p className="text-sm text-gray-400 mb-4">Their avatar will be set by them</p>
                    
//                     {/* Pure status display - no action buttons */}
//                     {isPaired() ? (
//                       <div className="bg-green-800 p-3 rounded-lg text-sm text-center mt-4">
//                         <div className="text-green-200 font-medium">🎯 Successfully Paired!</div>
//                         {pairedGameType && (
//                           <div className="text-xs text-green-300 mt-1">
//                             Paired for: <strong>{formatGameType(pairedGameType)}</strong>
//                           </div>
//                         )}
//                         <div className="text-xs text-green-300 mt-1">Ready to start games together</div>
//                       </div>
//                     ) : (
//                       <div className="bg-blue-800 p-3 rounded-lg text-sm text-center mt-4">
//                         <div className="text-blue-200 font-medium">🎯 Opponent Selected</div>
//                         <div className="text-xs text-blue-300 mt-1">Choose a game to send invitation</div>
//                       </div>
//                     )}
//                   </>
//                 ) : (
//                   <div className="text-center">
//                     <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-4xl mb-4">
//                       ?
//                     </div>
//                     <p className="text-gray-400 mb-2">Click any player from the online list →</p>
//                     <p className="text-xs text-gray-500">Your selection will appear here</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Game Selection Buttons */}
//           <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
//             <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Game</h2>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <button
//                 onClick={() => startSpecificGame("pong")}
//                 disabled={!canStartGame()}
//                 className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
//                   !canStartGame()
//                     ? "bg-gray-600 text-gray-400 cursor-not-allowed"
//                     : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
//                 }`}
//               >
//                 🏓 {isPaired() ? "Start" : "Invite for"} Ping Pong
//                 {selectedOpponent && (
//                   <div className="text-base font-normal mt-2">
//                     {isPaired() ? "vs" : "invite"} {selectedOpponent.name}
//                   </div>
//                 )}
//               </button>

//               <button
//                 onClick={() => startSpecificGame("keyclash")}
//                 disabled={!canStartGame()}
//                 className={`p-6 rounded-xl text-xl font-bold shadow-lg transition-all ${
//                   !canStartGame()
//                     ? "bg-gray-600 text-gray-400 cursor-not-allowed"
//                     : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
//                 }`}
//               >
//                 ⌨️ {isPaired() ? "Start" : "Invite for"} Key Clash
//                 {selectedOpponent && (
//                   <div className="text-base font-normal mt-2">
//                     {isPaired() ? "vs" : "invite"} {selectedOpponent.name}
//                   </div>
//                 )}
//               </button>
//             </div>

//             {/* Dynamic status message */}
//             <div className="text-center mt-4">
//               <p className={`text-sm ${
//                 canStartGame() 
//                   ? (isPaired() ? 'text-green-400 font-medium' : 'text-blue-400') 
//                   : 'text-gray-400'
//               }`}>
//                 {getValidationMessage()}
//               </p>
//             </div>
//           </div>

//           {/* Quick Join Games Section */}
//           {(pongGames.length > 0 || keyClashGames.length > 0) && (
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {pongGames.length > 0 && (
//                 <div className="bg-gray-800 rounded-xl p-6">
//                   <h3 className="text-xl font-semibold mb-4">🏓 Quick Join Pong Games</h3>
//                   <p className="text-sm text-gray-400 mb-3">Join games without invitations</p>
//                   <div className="space-y-2 max-h-32 overflow-y-auto">
//                     {pongGames.map(game => (
//                       <div
//                         key={game.id}
//                         onClick={() => {
//                           if (game.status === "waiting") joinGame(game.id, "pong", "remote");
//                         }}
//                         className={`p-3 rounded border cursor-pointer ${
//                           game.status === "waiting" 
//                             ? "bg-green-900 border-green-600 hover:bg-green-800" 
//                             : "bg-gray-700 border-gray-600"
//                         }`}
//                       >
//                         <div className="text-sm font-medium">Room-{game.id}</div>
//                         <div className="text-xs text-gray-400">
//                           {game.players.length}/2 players • {game.status}
//                         </div>
//                         {game.players.length > 0 && (
//                           <div className="text-xs mt-1">
//                             {game.players.map(p => p.name).join(", ")}
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {keyClashGames.length > 0 && (
//                 <div className="bg-gray-800 rounded-xl p-6">
//                   <h3 className="text-xl font-semibold mb-4">⌨️ Quick Join Key Clash Games</h3>
//                   <p className="text-sm text-gray-400 mb-3">Join games without invitations</p>
//                   <div className="space-y-2 max-h-32 overflow-y-auto">
//                     {keyClashGames.map(game => (
//                       <div
//                         key={game.id}
//                         onClick={() => {
//                           if (game.status === "waiting") joinGame(game.id, "keyclash", "remote");
//                         }}
//                         className={`p-3 rounded border cursor-pointer ${
//                           game.status === "waiting" 
//                             ? "bg-purple-900 border-purple-600 hover:bg-purple-800" 
//                             : "bg-gray-700 border-gray-600"
//                         }`}
//                       >
//                         <div className="text-sm font-medium">Room-{game.id}</div>
//                         <div className="text-xs text-gray-400">
//                           {game.players.length}/2 players • {game.status}
//                         </div>
//                         {game.players.length > 0 && (
//                           <div className="text-xs mt-1">
//                             {game.players.map(p => p.name).join(", ")}
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Right Column - Online Users */}
//         <div className="w-1/3">
//           <div className="bg-gray-800 p-6 rounded-xl shadow-lg sticky top-6">
//             <h2 className="text-2xl font-bold mb-4 text-center">🌐 Online Players</h2>
//             <p className="text-center text-gray-400 text-sm mb-4">
//               Click any player to select them ({otherPlayers.length} online)
//             </p>
            
//             <div className="space-y-3 max-h-96 overflow-y-auto">
//               {otherPlayers.length > 0 ? (
//                 otherPlayers.map(player => {
//                   const sentInvitation = sentInvitations.find(inv => inv.to.socketId === player.socketId);
//                   const receivedInvitation = receivedInvitations.find(inv => inv.from.socketId === player.socketId);
                  
//                   // Check if this player is the one we're paired with
//                   const isPairedWithThisPlayer = selectedOpponent && isPaired() && 
//                                                  selectedOpponent.socketId === player.socketId;

//                    console.log(`=== PLAYER ${player.name} RENDER DEBUG ===`);
//     console.log("Player socketId:", player.socketId);
//     console.log("My socketId:", socketRef.current?.id);
//     console.log("sentInvitation found:", !!sentInvitation);
//     console.log("receivedInvitation found:", !!receivedInvitation);
//     console.log("isPairedWithThisPlayer:", isPairedWithThisPlayer);
//     console.log("All receivedInvitations:", receivedInvitations);
                  
//                   return (
//                     <div key={player.socketId} className="bg-gray-700 p-4 rounded-lg">
//                       <div className="flex items-center gap-3 mb-3">
//                         <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
//                           {player.name.charAt(0).toUpperCase()}
//                         </div>
//                         <div>
//                           <p className="font-semibold">{player.name}</p>
//                           <p className="text-xs text-green-400">• Online</p>
//                           {receivedInvitation && (
//                             <p className="text-xs text-blue-400">• Wants to play {formatGameType(receivedInvitation.gameType)}!</p>
//                           )}
//                           {isPairedWithThisPlayer && (
//                             <p className="text-xs text-green-400">🎯 Paired with you!</p>
//                           )}
//                         </div>
//                       </div>
                      
//                       {receivedInvitation ? (
//                         <div>
//                           <div className={`flex gap-2 mb-2 ${
//                             invitationTimers[receivedInvitation.id] <= 30 ? 'animate-pulse' : ''
//                           }`}>
//                             <button
//                               onClick={() => {
//                                 setSelectedOpponent(player);
//                                 setTimeout(() => {
//                                   respondToInvitation(receivedInvitation.id, "accept");
//                                 }, 100);
//                               }}
//                               className={`px-3 py-1 rounded text-sm font-medium flex-1 ${
//                                 invitationTimers[receivedInvitation.id] <= 30 
//                                   ? 'bg-green-700 hover:bg-green-800 text-white' 
//                                   : 'bg-green-600 hover:bg-green-700 text-white'
//                               }`}
//                             >
//                               ✅ Accept
//                             </button>
//                             <button
//                               onClick={() => respondToInvitation(receivedInvitation.id, "decline")}
//                               className={`px-3 py-1 rounded text-sm font-medium flex-1 ${
//                                 invitationTimers[receivedInvitation.id] <= 30 
//                                   ? 'bg-red-700 hover:bg-red-800 text-white' 
//                                   : 'bg-red-600 hover:bg-red-700 text-white'
//                               }`}
//                             >
//                               ❌ Decline
//                             </button>
//                           </div>
//                           {invitationTimers[receivedInvitation.id] !== undefined && invitationTimers[receivedInvitation.id] >= 0 && (
//                             <div className="text-center">
//                               <span className={`text-xs ${
//                                 invitationTimers[receivedInvitation.id] <= 30 ? 'text-red-300 animate-pulse' : 'text-blue-300'
//                               }`}>
//                                 Expires in {Math.floor(invitationTimers[receivedInvitation.id] / 60)}:{String(invitationTimers[receivedInvitation.id] % 60).padStart(2, '0')}
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       ) : sentInvitation ? (
//                         <div>
//                           <div className="flex items-center gap-2 mb-2">
//                             <span className={`px-3 py-1 rounded text-sm font-medium flex-1 text-center ${
//                               invitationTimers[sentInvitation.id] <= 30 ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-black'
//                             }`}>
//                               Pending
//                             </span>
//                             <button
//                               onClick={() => cancelInvitation(sentInvitation.id)}
//                               className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
//                             >
//                               Cancel
//                             </button>
//                           </div>
//                           {invitationTimers[sentInvitation.id] !== undefined && invitationTimers[sentInvitation.id] >= 0 && (
//                             <div className="text-center">
//                               <span className={`text-xs ${
//                                 invitationTimers[sentInvitation.id] <= 30 ? 'text-red-300 animate-pulse' : 'text-yellow-300'
//                               }`}>
//                                 {Math.floor(invitationTimers[sentInvitation.id] / 60)}:{String(invitationTimers[sentInvitation.id] % 60).padStart(2, '0')}
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       ) : isPairedWithThisPlayer ? (
//                         <button
//                           onClick={() => {
//                             if (!socketRef.current) return;
//                             socketRef.current.emit("cancel_pairing", (result: any) => {
//                               if (result.error) {
//                                 alert(result.error);
//                               } else {
//                                 setSelectedOpponent(null);
//                                 setPairedGameType(null);
//                                 localStorage.removeItem("pairingData");
//                                 setInvitationMessage("Pairing cancelled. You can select a new opponent.");
//                                 setShowInvitationModal(true);
//                                 setTimeout(() => setShowInvitationModal(false), 2000);
//                               }
//                             });
//                           }}
//                           className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium w-full"
//                         >
//                           🔗 Cancel Pairing
//                         </button>
//                       ) : (
//                         <button
//                           onClick={() => {
//                             // Auto-replace current selection (user chooses game type later)
//                             setSelectedOpponent(player);
//                           }}
//                           className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium w-full"
//                         >
//                           Select Opponent
//                         </button>
//                       )}
//                     </div>
//                   );
//                 })
//               ) : (
//                 <div className="text-center text-gray-400 py-8">
//                   <p className="text-4xl mb-2">👻</p>
//                   <p>No other players online</p>
//                   <p className="text-sm mt-1">Share the game with friends!</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }




// frontend/src/pages/authorised/quickmatch-remote.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { getAvatars } from "../../utils/lobbyApi";
import { 
  getStoredAvatarData, 
  saveAvatarData, 
  cleanupGameStorage 
} from "../../shared/utils";
import { 
  Avatar, 
  AvatarData, 
  GameType, 
  Player, 
  OnlineUser, 
  GameRoom, 
  Invitation, 
  SentInvitation 
} from "../../shared/types";

// ========== ADDED: GameInfo interface for status tracking ==========
interface GameInfo {
  player1: string;
  player2: string;
  gameType: 'pong' | 'keyclash';
  mode: 'local' | 'remote';
  gameId: string;
  startTime: number;
}

export default function QuickmatchRemotePage() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const loggedInUsername = user?.username || "";
  
  // Lobby state
  const [players, setPlayers] = useState<Player[]>([]);
  const [pongGames, setPongGames] = useState<GameRoom[]>([]);
  const [keyClashGames, setKeyClashGames] = useState<GameRoom[]>([]);
  
  // Invitation state
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationTimers, setInvitationTimers] = useState<Record<string, number>>({});
  
  // Game selection state
  const [selectedGameType, setSelectedGameType] = useState<GameType>("pong");
  const [selectedOpponent, setSelectedOpponent] = useState<OnlineUser | null>(null);
  const [pairedGameType, setPairedGameType] = useState<GameType | null>(null); // Track invited game type
  
  // Check if user is currently in a game
  const [isInGame, setIsInGame] = useState(() => {
    const inGame = localStorage.getItem("userInGame");
    return inGame === "true";
  });

  // ========== ADDED: Active game info for status display ==========
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
  
  // Avatar state
  const [userAvatar, setUserAvatar] = useState<AvatarData | null>(() => 
    getStoredAvatarData("userAvatar")
  );
  
  const [opponentAvatar, setOpponentAvatar] = useState<AvatarData | null>(() => 
    getStoredAvatarData("opponentAvatar")
  );

  const [availableAvatars, setAvailableAvatars] = useState<Avatar[]>([]);

  // Filter out current user from players list
  const otherPlayers = players.filter(p => p.name !== loggedInUsername);

  // Format game type for display
  const formatGameType = (gameType: GameType): string => {
    switch (gameType) {
      case "pong":
        return "Ping Pong";
      case "keyclash":
        return "Key Clash";
      default:
        return gameType;
    }
  };

  // Handle return from avatar selection
  useEffect(() => {
    const state = location.state as {
      selectedAvatar?: { name: string; image: string };
      target?: "user" | "guest";
      fromAvatar?: boolean;
    };

    if (state?.selectedAvatar && state.target && state.fromAvatar) {
      if (state.target === "user") {
        setUserAvatar(state.selectedAvatar);
        saveAvatarData("userAvatar", state.selectedAvatar);
      }
      
      // Clear the state to prevent re-processing
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Avatar change handlers
  const handleUserAvatarChange = useCallback((newAvatar: AvatarData | null) => {
    setUserAvatar(newAvatar);
    saveAvatarData("userAvatar", newAvatar);
  }, []);

  const handleOpponentAvatarChange = useCallback((newAvatar: AvatarData | null) => {
    setOpponentAvatar(newAvatar);
    saveAvatarData("opponentAvatar", newAvatar);
  }, []);

  // ========== ADDED: Game status handlers ==========
  const handleReturnToGame = useCallback(() => {
    if (activeGameInfo) {
      navigate(`/${activeGameInfo.gameType}/${activeGameInfo.mode}/1v1/${activeGameInfo.gameId}`, {
        state: {
          user: activeGameInfo.player1,
          guest: activeGameInfo.player2,
          userAvatar: userAvatar || { name: "default", image: "/avatars/av1.jpeg" },
          guestAvatar: { name: "default", image: "/avatars/av2.jpeg" },
          gameType: activeGameInfo.gameType,
          mode: activeGameInfo.mode,
          type: "1v1",
          fromRemoteInvitation: true,
          isRemote: true,
          gameId: activeGameInfo.gameId
        }
      });
    }
  }, [activeGameInfo, userAvatar, navigate]);

  // ========== ADDED: Simple game state monitoring ==========
  useEffect(() => {
    const checkGameStatus = () => {
      const userInGame = localStorage.getItem("userInGame");
      const gameInfo = localStorage.getItem("activeGameInfo");
      
      setIsInGame(userInGame === "true");
      
      if (userInGame === "true" && gameInfo) {
        try {
          setActiveGameInfo(JSON.parse(gameInfo));
        } catch (e) {
          localStorage.removeItem("activeGameInfo");
          setActiveGameInfo(null);
        }
      } else {
        // Game ended - clear opponent selection
        if (activeGameInfo) {
          setActiveGameInfo(null);
          setSelectedOpponent(null);
          setPairedGameType(null);
          localStorage.removeItem("pairingData");
        }
      }
    };

    checkGameStatus();
    const interval = setInterval(checkGameStatus, 1000);
    
    return () => clearInterval(interval);
  }, [activeGameInfo]); // Minimal dependencies

  // Debug logging for invitation states
  useEffect(() => {
    console.log("Sent invitations updated:", sentInvitations);
  }, [sentInvitations]);

  useEffect(() => {
    console.log("Received invitations updated:", receivedInvitations);
  }, [receivedInvitations]);

  useEffect(() => {
    console.log("Invitation timers updated:", invitationTimers);
  }, [invitationTimers]);

  // Initialize avatars and component
  useEffect(() => {
    if (isInitialized) return;
    
    const loadAvatars = async () => {
      try {
        const avatars = await getAvatars();
        setAvailableAvatars(avatars);
        
        if (!userAvatar && avatars.length > 0) {
          const defaultAvatar = { name: avatars[0].id, image: avatars[0].imageUrl };
          handleUserAvatarChange(defaultAvatar);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to load avatars:", error);
        setIsInitialized(true);
      }
    };
    
    loadAvatars();
  }, [isInitialized, userAvatar, handleUserAvatarChange]);

  // Cleanup on mount and unmount
  useEffect(() => {
    cleanupGameStorage();
    // Also cleanup any stale pairing data on mount
    const pairingData = localStorage.getItem("pairingData");
    if (pairingData) {
      try {
        const pairing = JSON.parse(pairingData);
        // If pairing is older than 10 minutes, clean it up
        if (Date.now() - pairing.timestamp > 600000) {
          localStorage.removeItem("pairingData");
          setPairedGameType(null);
        } else if (pairing.gameType) {
          // Restore paired game type
          setPairedGameType(pairing.gameType);
        }
      } catch (e) {
        localStorage.removeItem("pairingData");
        setPairedGameType(null);
      }
    }

    // Check if user is currently in a game
    const userInGame = localStorage.getItem("userInGame");
    setIsInGame(userInGame === "true");
  }, []);

  // Cleanup pairing data on unmount
  useEffect(() => {
    return () => {
      // Clean up game state if leaving the page without starting a game
      const userInGame = localStorage.getItem("userInGame");
      const currentGameId = localStorage.getItem("currentGameId");
      
      // If user is marked as in game but we're leaving this page, 
      // it might be a navigation away from lobby - keep the state
      // Only clear if it's been a long time or invalid state
    };
  }, []);

  // Add window beforeunload handler to clear game state if needed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't clear game state on page refresh - user might be in actual game
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Clear selected opponent if they're no longer in the online list
  useEffect(() => {
    if (selectedOpponent) {
      const isOpponentStillOnline = otherPlayers.some(
        player => player.socketId === selectedOpponent.socketId
      );
      
      if (!isOpponentStillOnline) {
        console.log(`Selected opponent ${selectedOpponent.name} is no longer online - clearing selection`);
        setSelectedOpponent(null);
      }
    }
  }, [otherPlayers, selectedOpponent]);

  useEffect(() => {
    // Clear selected opponent if no players are available online
    if (otherPlayers.length === 0 && selectedOpponent) {
      console.log("No players online - clearing selected opponent");
      setSelectedOpponent(null);
    }
  }, [otherPlayers.length, selectedOpponent]);

  // Countdown timer for invitations
  useEffect(() => {
    const interval = setInterval(() => {
      setInvitationTimers(prev => {
        const updated = { ...prev };
        let hasExpired = false;
        
        Object.keys(updated).forEach(invitationId => {
          if (updated[invitationId] > 0) {
            updated[invitationId] -= 1;
            if (updated[invitationId] % 10 === 0) {
              console.log(`Invitation ${invitationId} timer: ${updated[invitationId]}s remaining`);
            }
          } else if (updated[invitationId] === 0) {
            hasExpired = true;
            console.log(`Invitation ${invitationId} expired!`);
            
            const sentInvitation = sentInvitations.find(inv => inv.id === invitationId);
            const receivedInvitation = receivedInvitations.find(inv => inv.id === invitationId);
            
            if (sentInvitation) {
              setSentInvitations(current => current.filter(inv => inv.id !== invitationId));
              setInvitationMessage("⏰ Your invitation expired (2 minutes timeout)");
              setShowInvitationModal(true);
              setTimeout(() => setShowInvitationModal(false), 3000);
            }
            
            if (receivedInvitation) {
              setReceivedInvitations(current => current.filter(inv => inv.id !== invitationId));
              setInvitationMessage("⏰ Game invitation expired");
              setShowInvitationModal(true);
              setTimeout(() => setShowInvitationModal(false), 3000);
            }
            
            delete updated[invitationId];
          }
        });
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sentInvitations, receivedInvitations]);

  // Socket setup for remote games
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
      console.log("=== SOCKET CONNECTION DEBUG ===");
      console.log("Socket connected with ID:", socketRef.current?.id);
      console.log("User object:", user);
      console.log("Username:", loggedInUsername);
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

      console.log("Emitting name with:", { name, playerId });
      
      socketRef.current?.emit("name", name, playerId, (res: { error: string }) => {
        if (res.error) {
          alert(res.error);
          navigate("/lobby");
        }
      });
    });

    socketRef.current.on("lobby_update", (data) => {
      setPlayers(data.players);
      setPongGames(data.pongGames);
      setKeyClashGames(data.keyClashGames);
    });

    socketRef.current.on("created_game", (gameId, game, mode) => {
      joinGame(gameId, game, mode);
    });

    socketRef.current.on("invitation_sent", (data: {
      id: string;
      to: { socketId: string; name: string };
      gameType: GameType;
    }) => {
      console.log("Received invitation_sent:", data);
      
      setSentInvitations(prev => {
        const tempInvitation = prev.find(inv => 
          inv.to.socketId === data.to.socketId && inv.id.startsWith('temp-')
        );
        
        const filtered = prev.filter(inv => 
          !(inv.to.socketId === data.to.socketId && inv.id.startsWith('temp-'))
        );
        
        return [...filtered, {
          id: data.id,
          to: data.to,
          gameType: data.gameType,
          timestamp: Date.now()
        }];
      });

      setInvitationTimers(prev => {
        const updated = { ...prev };
        const tempIds = Object.keys(updated).filter(id => id.startsWith('temp-'));
        const tempTimer = tempIds.length > 0 ? updated[tempIds[tempIds.length - 1]] : 120;
        
        console.log(`Transferring timer from temp invitation (${tempTimer}s) to ${data.id}`);
        tempIds.forEach(tempId => delete updated[tempId]);
        updated[data.id] = tempTimer;
        
        return updated;
      });
    });

    socketRef.current.on("invitation_received", (invitation: Invitation) => {
      console.log("Received invitation_received:", invitation);
      setReceivedInvitations(prev => [...prev, invitation]);
      
      setInvitationTimers(prev => {
        console.log(`Starting timer for received invitation ${invitation.id}: 120 seconds`);
        return {
          ...prev,
          [invitation.id]: 120
        };
      });
      
      setInvitationMessage(`${invitation.from.name} invited you to play ${formatGameType(invitation.gameType)}!`);
      setShowInvitationModal(true);
      
      setTimeout(() => {
        setShowInvitationModal(false);
      }, 3000);
    });

    // Handle players being paired (step 1: pairing confirmed)
    socketRef.current.on("players_paired", (data: {
      pairId: string;
      player1: { socketId: string; name: string };
      player2: { socketId: string; name: string };
      yourRole: "sender" | "receiver";
      opponent: { socketId: string; name: string };
      timestamp: number;
    }) => {
      console.log("Players paired received:", data);
      
      // Clear invitations since we're now paired
      setReceivedInvitations([]);
      setSentInvitations([]);
      setInvitationTimers({});
      
      // Set the opponent as selected
      const opponentUser: OnlineUser = {
        socketId: data.opponent.socketId,
        name: data.opponent.name
      };
      setSelectedOpponent(opponentUser);
      
      // Store pairing data for when game starts
      const pairingData = { ...data };
      
      // Get the game type from recent invitation
      const recentInvitation = sentInvitations.find(inv => inv.to.socketId === data.opponent.socketId) ||
                              receivedInvitations.find(inv => inv.from.socketId === data.opponent.socketId);
      
      if (recentInvitation) {
        setPairedGameType(recentInvitation.gameType);
        pairingData.gameType = recentInvitation.gameType;
      }
      
      localStorage.setItem("pairingData", JSON.stringify(pairingData));
      
      const gameTypeText = recentInvitation ? formatGameType(recentInvitation.gameType) : "game";
      setInvitationMessage(`✅ You are now paired with ${data.opponent.name} for ${gameTypeText}!`);
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 3000);
    });

    // Handle game setup complete (step 2: game room created, navigate to game)
    socketRef.current.on("game_setup_complete", (gameData: {
      gameId: string;
      gameType: string;
      mode: string;
      type: string;
      yourRole: "sender" | "receiver";
      yourSide: "left" | "right";
      senderData: { name: string; socketId: string };
      receiverData: { name: string; socketId: string };
    }) => {
      console.log("Game setup complete received:", gameData);
      
      // ========== ADDED: Store game info for status tracking ==========
      const gameInfo: GameInfo = {
        player1: gameData.yourRole === "sender" ? gameData.senderData.name : gameData.receiverData.name,
        player2: gameData.yourRole === "sender" ? gameData.receiverData.name : gameData.senderData.name,
        gameType: gameData.gameType as GameType,
        mode: gameData.mode as 'local' | 'remote',
        gameId: gameData.gameId,
        startTime: Date.now()
      };

      // Mark user as in game
      localStorage.setItem("userInGame", "true");
      localStorage.setItem("currentGameId", gameData.gameId);
      localStorage.setItem("activeGameInfo", JSON.stringify(gameInfo)); // ADDED
      
      let navigationState;
      
      if (gameData.yourRole === "sender") {
        navigationState = {
          user: gameData.senderData.name,
          guest: gameData.receiverData.name,
          userAvatar: userAvatar || { name: "default", image: "/avatars/av1.jpeg" },
          guestAvatar: { name: "default", image: "/avatars/av2.jpeg" }, // Default avatar for opponent
          gameType: gameData.gameType,
          mode: gameData.mode,
          type: gameData.type,
          fromRemoteInvitation: true,
          isRemote: true,
          yourSide: gameData.yourSide,
          gameId: gameData.gameId
        };
      } else {
        navigationState = {
          user: gameData.receiverData.name,
          guest: gameData.senderData.name,
          userAvatar: userAvatar || { name: "default", image: "/avatars/av1.jpeg" },
          guestAvatar: { name: "default", image: "/avatars/av1.jpeg" }, // Default avatar for opponent
          gameType: gameData.gameType,
          mode: gameData.mode,
          type: gameData.type,
          fromRemoteInvitation: true,
          isRemote: true,
          yourSide: gameData.yourSide,
          gameId: gameData.gameId
        };
      }
      
      console.log("Navigation state prepared:", navigationState);
      
      setInvitationMessage("🎮 Game starting...");
      setShowInvitationModal(true);
      
      setTimeout(() => {
        console.log("Navigating to game...");
        // Clean up pairing data
        localStorage.removeItem("pairingData");
        
        socketRef.current?.disconnect();
        socketRef.current = null;
        
        navigate(`/${gameData.gameType}/${gameData.mode}/${gameData.type}/${gameData.gameId}`, {
          state: navigationState
        });
      }, 1000);
    });

    socketRef.current.on("invitation_declined", (data: { id: string; by: string }) => {
      console.log("Invitation declined:", data);
      setSentInvitations(prev => prev.filter(inv => inv.id !== data.id));
      
      setInvitationTimers(prev => {
        const updated = { ...prev };
        delete updated[data.id];
        return updated;
      });
      
      // Clear selected opponent and paired game type when invitation is declined
      setSelectedOpponent(null);
      setPairedGameType(null);
      
      setInvitationMessage(`${data.by} declined your invitation.`);
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 2000);
    });

    socketRef.current.on("invitation_expired", (data: { id: string }) => {
      console.log("Invitation expired from server:", data);
      
      const wasSentInvitation = sentInvitations.some(inv => inv.id === data.id);
      
      setReceivedInvitations(prev => prev.filter(inv => inv.id !== data.id));
      setSentInvitations(prev => prev.filter(inv => inv.id !== data.id));
      
      setInvitationTimers(prev => {
        const updated = { ...prev };
        delete updated[data.id];
        return updated;
      });
      
      if (wasSentInvitation) {
        setInvitationMessage("⏰ Your invitation expired (2 minutes timeout)");
      } else {
        setInvitationMessage("⏰ Game invitation expired");
      }
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 3000);
    });

    socketRef.current.on("pairing_expired", (data: { pairId: string }) => {
      console.log("Pairing expired:", data);
      setSelectedOpponent(null);
      setPairedGameType(null);
      localStorage.removeItem("pairingData");
      setInvitationMessage("⏰ Pairing expired. You can select a new opponent.");
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 3000);
    });

    socketRef.current.on("pairing_cancelled", (data: { pairId: string; reason?: string }) => {
      console.log("Pairing cancelled:", data);
      setSelectedOpponent(null);
      setPairedGameType(null);
      localStorage.removeItem("pairingData");
      setInvitationMessage(`❌ Pairing cancelled: ${data.reason || "Unknown reason"}`);
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 3000);
    });

    socketRef.current.on("invitation_cancelled", (data: { id: string; reason?: string; by?: string }) => {
      console.log("Invitation cancelled:", data);
      setReceivedInvitations(prev => prev.filter(inv => inv.id !== data.id));
      if (data.reason) {
        setInvitationMessage(`Invitation cancelled: ${data.reason}`);
        setShowInvitationModal(true);
        setTimeout(() => setShowInvitationModal(false), 2000);
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isInitialized, user, navigate, loggedInUsername, userAvatar]);

  // Send invitation with specific game type
  const sendPlayRequest = (opponent: OnlineUser, gameType: GameType) => {
    if (!socketRef.current) return;

    console.log("sendPlayRequest called for:", opponent.name, "gameType:", gameType);

    const tempInvitation: SentInvitation = {
      id: `temp-${Date.now()}`,
      to: { socketId: opponent.socketId, name: opponent.name },
      gameType: gameType,
      timestamp: Date.now()
    };
    
    setSentInvitations(prev => [...prev, tempInvitation]);

    setInvitationTimers(prev => {
      console.log(`Starting timer for invitation ${tempInvitation.id}: 120 seconds`);
      return {
        ...prev,
        [tempInvitation.id]: 120
      };
    });

    socketRef.current.emit("send_invitation", opponent.socketId, gameType, (response: any) => {
      console.log("send_invitation response:", response);
      
      if (response.error) {
        setSentInvitations(prev => prev.filter(inv => inv.id !== tempInvitation.id));
        setInvitationTimers(prev => {
          const updated = { ...prev };
          delete updated[tempInvitation.id];
          return updated;
        });
        alert(response.error);
      } else {
        setInvitationMessage(`Invitation sent to ${opponent.name} for ${formatGameType(gameType)}!`);
        setShowInvitationModal(true);
        setTimeout(() => setShowInvitationModal(false), 2000);
      }
    });
  };

  // Respond to invitation
  const respondToInvitation = (invitationId: string, response: "accept" | "decline") => {
    if (!socketRef.current) return;

    console.log("=== RESPOND TO INVITATION START ===");
    console.log("Invitation ID:", invitationId);
    console.log("Response:", response);

    socketRef.current.emit("respond_to_invitation", invitationId, response, (result: any) => {
      console.log("Response result:", result);
      
      if (result.error) {
        console.log("Error in response:", result.error);
        alert(result.error);
      } else {
        console.log("Successfully responded to invitation");
        
        setReceivedInvitations(prev => {
          const filtered = prev.filter(inv => inv.id !== invitationId);
          console.log("Received invitations after cleanup:", filtered.length);
          return filtered;
        });
        
        setInvitationTimers(prev => {
          const updated = { ...prev };
          delete updated[invitationId];
          console.log("Timers after cleanup:", Object.keys(updated).length);
          return updated;
        });
        
        if (response === "accept") {
          console.log("Invitation accepted - waiting for players_paired...");
          setInvitationMessage("Pairing players...");
          setShowInvitationModal(true);
        } else {
          console.log("Invitation declined");
          setInvitationMessage("Invitation declined.");
          setShowInvitationModal(true);
          setTimeout(() => setShowInvitationModal(false), 1500);
        }
      }
      console.log("=== RESPOND TO INVITATION END ===");
    });
  };

  // Cancel sent invitation
  const cancelInvitation = (invitationId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit("cancel_invitation", invitationId, (result: any) => {
      if (result.error) {
        alert(result.error);
      } else {
        setSentInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        setInvitationTimers(prev => {
          const updated = { ...prev };
          delete updated[invitationId];
          return updated;
        });
        setSelectedOpponent(null);
        setInvitationMessage("Invitation cancelled.");
        setShowInvitationModal(true);
        setTimeout(() => setShowInvitationModal(false), 1500);
      }
    });
  };

  // Avatar selection - UPDATED to navigate to separate page
  const chooseAvatar = useCallback(() => {
    navigate("/avatar", {
      state: { 
        target: "user", 
        returnTo: "/quickmatch-remote",
        fromQuickMatch: true 
      },
      replace: false,
    });
  }, [navigate]);

  // Validation
  const canStartGame = useCallback(() => {
    return userAvatar && selectedOpponent; // No need to check opponent avatar
  }, [userAvatar, selectedOpponent]);

  const joinGame = (gameId: string, game: GameType, mode: "remote") => {
    socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
      if (res.error) alert(res.error);
    });
  };

  // Check if currently paired
  const isPaired = useCallback(() => {
    const pairingData = localStorage.getItem("pairingData");
    if (pairingData && selectedOpponent) {
      try {
        const pairing = JSON.parse(pairingData);
        return pairing.opponent.socketId === selectedOpponent.socketId;
      } catch (e) {
        localStorage.removeItem("pairingData");
        setPairedGameType(null);
      }
    }
    return false;
  }, [selectedOpponent]);

  // Function to clear game state when game ends
  const clearGameState = useCallback(() => {
    localStorage.removeItem("userInGame");
    localStorage.removeItem("currentGameId");
    setIsInGame(false);
  }, []);

  // Function to check current game status
  const checkGameStatus = useCallback(() => {
    const userInGame = localStorage.getItem("userInGame");
    const currentGameId = localStorage.getItem("currentGameId");
    
    if (userInGame === "true" && currentGameId) {
      return { inGame: true, gameId: currentGameId };
    }
    return { inGame: false, gameId: null };
  }, []);

  // Start game
  const startSpecificGame = useCallback((gameType: GameType) => {
    // Check if user is already in a game
    if (isInGame) {
      const currentGameId = localStorage.getItem("currentGameId");
      const confirm = window.confirm(
        `You are already in a game (${currentGameId}). Do you want to leave that game and start a new one?`
      );
      if (!confirm) return;
      
      // Clear current game state
      localStorage.removeItem("userInGame");
      localStorage.removeItem("currentGameId");
      setIsInGame(false);
    }

    if (!canStartGame()) {
      alert("Please select an opponent and ensure you have an avatar selected");
      return;
    }

    // Check if paired and game type matches
    if (isPaired() && pairedGameType && pairedGameType !== gameType) {
      alert(`You are paired for ${formatGameType(pairedGameType)}. Please click "Start ${formatGameType(pairedGameType)}" instead.`);
      return;
    }

    setSelectedGameType(gameType);
    localStorage.setItem("gameType", gameType);

    // Check if we're already paired with this opponent
    const pairingData = localStorage.getItem("pairingData");
    if (pairingData && selectedOpponent) {
      try {
        const pairing = JSON.parse(pairingData);
        const isPaired = pairing.opponent.socketId === selectedOpponent.socketId;
        
        if (isPaired) {
          console.log("Already paired! Starting game directly:", gameType);
          
          if (!socketRef.current) {
            alert("Connection lost. Please refresh and try again.");
            return;
          }
          
          // Send start_paired_game event
          socketRef.current.emit("start_paired_game", gameType, (response: any) => {
            if (response.error) {
              console.error("Error starting paired game:", response.error);
              alert(response.error);
              // Clear pairing data on error
              localStorage.removeItem("pairingData");
              setSelectedOpponent(null);
              setPairedGameType(null);
            } else {
              console.log("Paired game starting...");
              setInvitationMessage("🎮 Starting game...");
              setShowInvitationModal(true);
            }
          });
          return;
        }
      } catch (e) {
        console.error("Error parsing pairing data:", e);
        localStorage.removeItem("pairingData");
      }
    }

    // Not paired yet, send invitation as usual
    if (selectedOpponent) {
      console.log("Sending invitation for remote game to:", selectedOpponent.name);
      sendPlayRequest(selectedOpponent, gameType); // Pass gameType here
    } else {
      console.log("No opponent selected for remote game");
      alert("Please select an opponent first");
    }
  }, [canStartGame, selectedOpponent, isInGame, pairedGameType, isPaired]);

  // ========== ADDED: Game status banner ==========
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

  // Validation message
  const getValidationMessage = useCallback(() => {
    if (isInGame) {
      const { gameId } = checkGameStatus();
      return `⚠️ Already in game (${gameId}). New games will end current game.`;
    }
    
    if (!userAvatar) return "Please select your avatar";
    if (!selectedOpponent) return "Please select an opponent from the online players list";
    
    // Check if paired
    if (isPaired()) {
      if (pairedGameType) {
        return `🎯 Paired for ${formatGameType(pairedGameType)}! Click "Start ${formatGameType(pairedGameType)}" above`;
      }
      return "🎯 Paired and ready! Choose your game above to start playing";
    }
    
    return "✅ Ready to invite! Choose your game above to send invitation";
  }, [userAvatar, selectedOpponent, isPaired, pairedGameType, isInGame, checkGameStatus]);

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

      {/* Invitation Notification Modal */}
      {showInvitationModal && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <p>{invitationMessage}</p>
        </div>
      )}

      {/* Pending Invitations Badge */}
      {receivedInvitations.length > 0 && (
        <div className="fixed top-6 right-6 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-40">
          {receivedInvitations.length}
        </div>
      )}

      <h1 className="text-4xl font-bold text-center mb-6">
        🌐 Remote Quick Match Setup
      </h1>

      {/* ========== ADDED: Game Status Display ========== */}
      {renderGameStatus()}

      <div className="w-full max-w-7xl flex gap-6">
        {/* Left Column - Main Content */}
        <div className="w-2/3 space-y-6">
          {/* Player Setup Section */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Choose Players & Avatars</h2>
            
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Player 1 */}
              <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2">👤 Player 1 (You)</h3>
                <p className="mb-4 text-lg">
                  Username: <strong>{loggedInUsername}</strong>
                </p>

                {/* UPDATED Avatar Display */}
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
                  onClick={chooseAvatar}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold"
                >
                  Choose Avatar
                </button>
              </div>

              {/* VS Separator */}
              <div className="text-4xl font-bold text-yellow-400">VS</div>

              {/* Player 2 - Selected Opponent */}
              <div className="bg-gray-700 p-6 w-full lg:w-1/2 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2">🎯 Player 2 (Opponent)</h3>
                
                {selectedOpponent ? (
                  <>
                    <p className="mb-4 text-lg">
                      <strong>{selectedOpponent.name}</strong>
                    </p>

                    {/* Display opponent's avatar (not changeable by player 1) */}
                    <div className="w-32 h-32 rounded-full border-4 border-green-400 mb-4 flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-400 text-white text-4xl font-bold">
                      {selectedOpponent.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Their avatar will be set by them</p>
                    
                    {/* Pure status display - no action buttons */}
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
                🏓 {isPaired() ? "Start" : "Invite for"} Ping Pong
                {selectedOpponent && (
                  <div className="text-base font-normal mt-2">
                    {isPaired() ? "vs" : "invite"} {selectedOpponent.name}
                  </div>
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
                ⌨️ {isPaired() ? "Start" : "Invite for"} Key Clash
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
                canStartGame() 
                  ? (isPaired() ? 'text-green-400 font-medium' : 'text-blue-400') 
                  : 'text-gray-400'
              }`}>
                {getValidationMessage()}
              </p>
            </div>
          </div>

          {/* Quick Join Games Section */}
          {(pongGames.length > 0 || keyClashGames.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pongGames.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">🏓 Quick Join Pong Games</h3>
                  <p className="text-sm text-gray-400 mb-3">Join games without invitations</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pongGames.map(game => (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (game.status === "waiting") joinGame(game.id, "pong", "remote");
                        }}
                        className={`p-3 rounded border cursor-pointer ${
                          game.status === "waiting" 
                            ? "bg-green-900 border-green-600 hover:bg-green-800" 
                            : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="text-sm font-medium">Room-{game.id}</div>
                        <div className="text-xs text-gray-400">
                          {game.players.length}/2 players • {game.status}
                        </div>
                        {game.players.length > 0 && (
                          <div className="text-xs mt-1">
                            {game.players.map(p => p.name).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {keyClashGames.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">⌨️ Quick Join Key Clash Games</h3>
                  <p className="text-sm text-gray-400 mb-3">Join games without invitations</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {keyClashGames.map(game => (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (game.status === "waiting") joinGame(game.id, "keyclash", "remote");
                        }}
                        className={`p-3 rounded border cursor-pointer ${
                          game.status === "waiting" 
                            ? "bg-purple-900 border-purple-600 hover:bg-purple-800" 
                            : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="text-sm font-medium">Room-{game.id}</div>
                        <div className="text-xs text-gray-400">
                          {game.players.length}/2 players • {game.status}
                        </div>
                        {game.players.length > 0 && (
                          <div className="text-xs mt-1">
                            {game.players.map(p => p.name).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Online Users */}
        <div className="w-1/3">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg sticky top-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🌐 Online Players</h2>
            <p className="text-center text-gray-400 text-sm mb-4">
              Click any player to select them ({otherPlayers.length} online)
            </p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {otherPlayers.length > 0 ? (
                otherPlayers.map(player => {
                  const sentInvitation = sentInvitations.find(inv => inv.to.socketId === player.socketId);
                  const receivedInvitation = receivedInvitations.find(inv => inv.from.socketId === player.socketId);
                  
                  // Check if this player is the one we're paired with
                  const isPairedWithThisPlayer = selectedOpponent && isPaired() && 
                                                 selectedOpponent.socketId === player.socketId;

                  console.log(`=== PLAYER ${player.name} RENDER DEBUG ===`);
                  console.log("Player socketId:", player.socketId);
                  console.log("My socketId:", socketRef.current?.id);
                  console.log("sentInvitation found:", !!sentInvitation);
                  console.log("receivedInvitation found:", !!receivedInvitation);
                  console.log("isPairedWithThisPlayer:", isPairedWithThisPlayer);
                  console.log("All receivedInvitations:", receivedInvitations);
                  
                  return (
                    <div key={player.socketId} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                          {player.name.charAt(0).toUpperCase()}
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
                            if (!socketRef.current) return;
                            socketRef.current.emit("cancel_pairing", (result: any) => {
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
                        <button
                          onClick={() => {
                            // Auto-replace current selection (user chooses game type later)
                            setSelectedOpponent(player);
                          }}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium w-full"
                        >
                          Select Opponent
                        </button>
                      )}
                    </div>
                  );
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
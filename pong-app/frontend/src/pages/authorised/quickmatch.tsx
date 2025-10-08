import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import QuickmatchPlayerForm from "../../components/quickmatch-lobby/QuickmatchPlayerForm";
import QuickmatchRemoteForm from "../../components/quickmatch-lobby/QuickmatchRemoteForm";
import { 
  GameType, 
  Player, 
  OnlineUser, 
  GameRoom, 
  Invitation, 
  SentInvitation,
  AvatarData
} from "../../shared/types";

export default function QuickmatchPage() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerId: number | null = user?.id || null;
  const [name, setName] = useState<string | null>(user?.nickname || user?.username || null);
  
   // Lobby state
  const [players, setPlayers] = useState<Player[]>([]);
  const [pongGames, setPongGames] = useState<GameRoom[]>([]);
  const [keyClashGames, setKeyClashGames] = useState<GameRoom[]>([]);
  const otherPlayers = players.filter(p => p.socketId !== socketRef.current?.id);  
  
  // Invitation state
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationTimers, setInvitationTimers] = useState<Record<string, number>>({});
  
  // Game selection state
  const [selectedGameType, setSelectedGameType] = useState<GameType>("pong");
  const [selectedOpponent, setSelectedOpponent] = useState<OnlineUser | null>(null);
  const [pairedGameType, setPairedGameType] = useState<GameType | null>(null);

  // Game creation forms
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);

  const openLocal = () => setShowLocalModal(true);
  const closeLocal = () => setShowLocalModal(false);
  const openRemote = () => setShowRemoteModal(true);
  const closeRemote = () => setShowRemoteModal(false);

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

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLocalModal) closeLocal();
        if (showRemoteModal) closeRemote();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showLocalModal, showRemoteModal]);

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

  useEffect(() => {
    socketRef.current = io("/quickmatch", {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true
    });

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("name", name, playerId, (res: { error: string }) => {
        if (res.error) {
          alert(res.error);
          navigate("/lobby")
        }
      });
    });

    socketRef.current.on("guestName", (guestName) => {
      setName(guestName);
    })

    socketRef.current.on("lobby_update", (data) => {
      setPlayers(data.players);
      setPongGames(data.pongGames);
      setKeyClashGames(data.keyClashGames)
    });

    socketRef.current.on("created_game", (gameId, game, mode) => {
      try {
				// Get guest name from localStorage
				const storedGuest = localStorage.getItem('quickmatch_guestName');
				console.log("📦 Retrieved stored guest:", storedGuest);

				const playerNames = {
					player1: name,
					player2: storedGuest
        };
        if (socketRef.current) {
          console.log("🔌 Disconnecting socket...");
          socketRef.current.disconnect();
          socketRef.current = null;
        }
			
        const type = "1v1";
        const routePath = `/${game}/${mode}/${type}/${gameId}`;
        console.log("🎯 Navigating to:", routePath);
			
        navigate(routePath, { 
          state: { 
            name: playerNames,
            playerId: playerId,
            gameType: game,
            mode: mode,
            type: type,
            gameId: gameId,
          } 
        });
        console.log("✅ Navigation completed");
        
      } catch (error: any) {
          console.error("❌ Error in created_game handler:", error);
        	alert("Navigation failed: " + error.message);
      	}
    })

    socketRef.current.on("joined_game", (gameId, game, mode) => {
      socketRef.current?.disconnect();
      socketRef.current = null;
	    const type = "1v1";
      navigate(`/${game}/${mode}/${type}/${gameId}`, { state: { name: name, playerId: playerId } });
    });

    socketRef.current?.on("invitation_sent", (data: {
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

    socketRef.current?.on("invitation_received", (invitation: Invitation) => {
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
    socketRef.current?.on("players_paired", (data: {
      pairId: string;
      player1: { socketId: string; name: string; playerId: number };
      player2: { socketId: string; name: string; playerId: number };
      yourRole: "sender" | "receiver";
      opponent: { socketId: string; name: string; playerId: number };
      gameType: "pong" | "keyclash";
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
        name: data.opponent.name,
        playerId: data.opponent.playerId
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
    socketRef.current?.on("game_setup_complete", (gameData: {
      gameId: string;
      gameType: string;
      mode: string;
      type: string;
      yourRole: "sender" | "receiver";
      yourSide: "left" | "right";
      senderData: { name: string; socketId: string; playerId: number };
      receiverData: { name: string; socketId: string; playerId: number };
    }) => {
      console.log("Game setup complete received:", gameData);

      
      let navigationState;
      
      if (gameData.yourRole === "sender") {
        navigationState = {
          user: gameData.senderData.name,
          userId: gameData.senderData.playerId,
          guest: gameData.receiverData.name,
          guestId: gameData.receiverData.playerId,
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
          userId: gameData.receiverData.playerId,
          guest: gameData.senderData.name,
          guestId: gameData.senderData.playerId,
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

    socketRef.current?.on("invitation_declined", (data: { id: string; by: string }) => {
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

    socketRef.current?.on("invitation_expired", (data: { id: string }) => {
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

    socketRef.current?.on("pairing_expired", (data: { pairId: string }) => {
      console.log("Pairing expired:", data);
      setSelectedOpponent(null);
      setPairedGameType(null);
      localStorage.removeItem("pairingData");
      setInvitationMessage("⏰ Pairing expired. You can select a new opponent.");
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 3000);
    });

    socketRef.current?.on("pairing_cancelled", (data: { pairId: string; reason?: string }) => {
      console.log("Pairing cancelled:", data);
      setSelectedOpponent(null);
      setPairedGameType(null);
      localStorage.removeItem("pairingData");
      setInvitationMessage(`❌ Pairing cancelled: ${data.reason || "Unknown reason"}`);
      setShowInvitationModal(true);
      setTimeout(() => setShowInvitationModal(false), 3000);
    });

    socketRef.current?.on("invitation_cancelled", (data: { id: string; reason?: string; by?: string }) => {
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
  }, [user, name, userAvatar]);

  const createRemotePong = () => {
    socketRef.current?.emit("create_game", "pong", "remote");
  };
  const createRemoteKeyClash = () => {
    socketRef.current?.emit("create_game", "keyclash", "remote");
  };
  const createLocalGame = (type: GameType) => {
    socketRef.current?.emit("create_game", type, "local");
  }

  const joinGame = (gameId: string, game: "pong" | "keyclash", mode: "local" | "remote") => {
    socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
      if (res.error) alert(res.error);
    });
  };

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

  // Cleanup  any stale pairing data on mount
  useEffect(() => {
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

  // Start game
  const startSpecificGame = useCallback((gameType: GameType) => {

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
      sendPlayRequest(selectedOpponent, gameType);
    } else {
      if (gameType === "pong")
        createRemotePong();
      else
        createRemoteKeyClash();
    }
  }, [selectedOpponent, pairedGameType, isPaired]);

  // Validation message
  const getValidationMessage = useCallback(() => {
    if (isPaired()) {
      if (pairedGameType) {
        return `🎯 Paired for ${formatGameType(pairedGameType)}! Click "Start ${formatGameType(pairedGameType)}" above`;
      }
      return "🎯 Paired and ready! Choose your game above to start playing";
    }
    
    return "Invite an opponent or start an open game!";
  }, [selectedOpponent, isPaired, pairedGameType]);

  const [stars, setStars] = useState<{ x: number; y: number; char: string }[]>([]);
  useEffect(() => {
    const starChars = ["*", "+", "•", "✦", "✧"];
    const newStars = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      char: starChars[Math.floor(Math.random() * starChars.length)],
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {showInvitationModal && (
          <div className="fixed top-20 md:top-40 right-4 md:right-40 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
            <p>{invitationMessage}</p>
          </div>
        )}

        {/* ===== Header ===== */}
        <header className="py-4 md:py-6">
          <div className="mb-3 md:mb-0 md:relative md:text-center">
            <button
              onClick={() => navigate('/lobby')}
              className="w-full md:w-auto md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2 bg-orange-500 hover:bg-orange-600 px-3 md:px-4 py-2 rounded-lg font-semibold shadow-md text-sm md:text-base transition-colors"
            >
              ← Back to Lobby
            </button>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 mt-3 md:mt-0">Quick Match Lobby</h1>
            <p className="text-sm md:text-base text-gray-300">
              Play matches locally or online with friends and other players
            </p>
          </div>
        </header>

        {/* ===== Main Body ===== */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* === Left Column === */}
          <div className="flex-1 space-y-6">
            {/* Local Quick Match Section */}
            <section className="bg-gray-800 rounded-lg border border-gray-600 p-4 md:p-6">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold mb-1">Play on your device</h2>
                  <p className="text-xs md:text-sm text-gray-400">1v1 local match</p>
                </div>
                <button
                  onClick={openLocal}
                  className="px-4 md:px-6 py-2 md:py-3 bg-green-500 hover:bg-green-600 text-white text-sm md:text-base font-semibold rounded-lg transition-colors w-full lg:w-auto"
                >
                  Create A Local Quickmatch
                </button>
              </div>
            </section>

            {/* Remote Quick Match Section */}
            {socketRef.current && (
              <section className="bg-gray-800 rounded-lg border border-gray-600 p-4 md:p-6">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-1">Play online</h2>
                    <p className="text-xs md:text-sm text-gray-400">1v1 remote match</p>
                  </div>
                  <button
                    onClick={openRemote}
                    className="px-4 md:px-6 py-2 md:py-3 bg-green-500 hover:bg-green-600 text-white text-sm md:text-base font-semibold rounded-lg transition-colors w-full lg:w-auto"
                  >
                    Create A Remote Quickmatch
                  </button>
                </div>
              </section>
            )}

            {/* Local Modal */}
            {showLocalModal && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50"
                  onClick={closeLocal}
                  aria-hidden="true"
                />
                <div className="fixed inset-0 z-50 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center p-2 md:p-4">
                    <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-gray-900 rounded-xl shadow-2xl">
                      <QuickmatchPlayerForm
                        onCreate={createLocalGame}
                        closeForm={closeLocal}
                        username={name}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Remote Modal */}
            {showRemoteModal && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50"
                  onClick={closeRemote}
                  aria-hidden="true"
                />
                <div className="fixed inset-0 z-50 overflow-y-auto">
                  <div className="flex min-h-full items-start justify-center p-2 md:p-4">
                    <div className="w-full max-w-7xl max-h-[95vh] overflow-y-auto my-2 md:my-4 bg-gray-900 rounded-xl shadow-2xl">
                      <QuickmatchRemoteForm
                        socket={socketRef.current}
                        name={name}
                        selectedOpponent={selectedOpponent}
                        isPaired={isPaired}
                        pairedGameType={pairedGameType}
                        formatGameType={formatGameType}
                        startSpecificGame={startSpecificGame}
                        getValidationMessage={getValidationMessage}
                        otherPlayers={otherPlayers}
                        sentInvitations={sentInvitations}
                        receivedInvitations={receivedInvitations}
                        invitationTimers={invitationTimers}
                        setSelectedOpponent={setSelectedOpponent}
                        respondToInvitation={respondToInvitation}
                        cancelInvitation={cancelInvitation}
                        setPairedGameType={setPairedGameType}
                        setInvitationMessage={setInvitationMessage}
                        setShowInvitationModal={setShowInvitationModal}
                        closeForm={closeRemote}
                        showInvitationModal={showInvitationModal}
                        invitationMessage={invitationMessage}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quick Join Games Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">🏓 Quick Join Pong Games</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-3">Join games without invitations</p>
                {pongGames.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pongGames.map((game) => (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (game.status === "waiting") joinGame(game.id, "pong", "remote");
                        }}
                        className={`p-2 md:p-3 rounded border cursor-pointer ${
                          game.status === "waiting"
                            ? "bg-green-900 border-green-600 hover:bg-green-800"
                            : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="text-xs md:text-sm font-medium">Room-{game.id}</div>
                        <div className="text-xs text-gray-400">
                          {game.players.length}/2 players • {game.status}
                        </div>
                        {game.players.length > 0 && (
                          <div className="text-xs mt-1">{game.players.map((p) => p.name).join(", ")}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-6 md:py-8">
                    <p className="text-3xl md:text-4xl mb-2">👻</p>
                    <p className="text-sm md:text-base">No active games</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">⌨️ Quick Join Key Clash Games</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-3">Join games without invitations</p>
                {keyClashGames.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {keyClashGames.map((game) => (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (game.status === "waiting") joinGame(game.id, "keyclash", "remote");
                        }}
                        className={`p-2 md:p-3 rounded border cursor-pointer ${
                          game.status === "waiting"
                            ? "bg-purple-900 border-purple-600 hover:bg-purple-800"
                            : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="text-xs md:text-sm font-medium">Room-{game.id}</div>
                        <div className="text-xs text-gray-400">
                          {game.players.length}/2 players • {game.status}
                        </div>
                        {game.players.length > 0 && (
                          <div className="text-xs mt-1">{game.players.map((p) => p.name).join(", ")}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-6 md:py-8">
                    <p className="text-3xl md:text-4xl mb-2">👻</p>
                    <p className="text-sm md:text-base">No active games</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === Right Sidebar === */}
          <aside className="w-full lg:w-80 bg-gray-800 rounded-lg border border-gray-600 p-4 md:p-6 self-start">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">🌐 Players in Lobby</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {players.length > 0 ? (
                players.map((player) => {
                  const sentInvitation = sentInvitations.find((inv) => inv.to.socketId === player.socketId);
                  const receivedInvitation = receivedInvitations.find((inv) => inv.from.socketId === player.socketId);
                  const isPairedWithThisPlayer = selectedOpponent && isPaired() && selectedOpponent.socketId === player.socketId;
                  const isYou = player.socketId === socketRef.current?.id;

                  return (
                    <div key={player.socketId} className="bg-gray-700 p-3 md:p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
                          {player.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm md:text-base font-semibold">
                            {player.name} {isYou && <i className="font-medium text-xs display-inline">(you)</i>}
                          </p>
                          <p className="text-xs text-green-400">• Online</p>
                          {receivedInvitation && (
                            <p className="text-xs text-blue-400">• Wants to play {formatGameType(receivedInvitation.gameType)}!</p>
                          )}
                          {isPairedWithThisPlayer && <p className="text-xs text-green-400">🎯 Paired with you!</p>}
                        </div>
                      </div>

                      {receivedInvitation ? (
                        <div>
                          <div className={`flex gap-2 mb-2 ${invitationTimers[receivedInvitation.id] <= 30 ? "animate-pulse" : ""}`}>
                            <button
                              onClick={() => {
                                setSelectedOpponent(player);
                                openRemote();
                                setTimeout(() => {
                                  respondToInvitation(receivedInvitation.id, "accept");
                                }, 100);
                              }}
                              className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-medium flex-1 ${
                                invitationTimers[receivedInvitation.id] <= 30 ? "bg-green-700 hover:bg-green-800 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                            >
                              ✅ Accept
                            </button>
                            <button
                              onClick={() => respondToInvitation(receivedInvitation.id, "decline")}
                              className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-medium flex-1 ${
                                invitationTimers[receivedInvitation.id] <= 30 ? "bg-red-700 hover:bg-red-800 text-white" : "bg-red-600 hover:bg-red-700 text-white"
                              }`}
                            >
                              ❌ Decline
                            </button>
                          </div>
                          {invitationTimers[receivedInvitation.id] !== undefined && invitationTimers[receivedInvitation.id] >= 0 && (
                            <div className="text-center">
                              <span className={`text-xs ${invitationTimers[receivedInvitation.id] <= 30 ? "text-red-300 animate-pulse" : "text-blue-300"}`}>
                                Expires in {Math.floor(invitationTimers[receivedInvitation.id] / 60)}:{String(invitationTimers[receivedInvitation.id] % 60).padStart(2, "0")}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : sentInvitation ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-medium flex-1 text-center ${invitationTimers[sentInvitation.id] <= 30 ? "bg-red-500 text-white animate-pulse" : "bg-yellow-500 text-black"}`}>
                              Pending
                            </span>
                            <button onClick={() => cancelInvitation(sentInvitation.id)} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs">
                              Cancel
                            </button>
                          </div>
                          {invitationTimers[sentInvitation.id] !== undefined && invitationTimers[sentInvitation.id] >= 0 && (
                            <div className="text-center">
                              <span className={`text-xs ${invitationTimers[sentInvitation.id] <= 30 ? "text-red-300 animate-pulse" : "text-yellow-300"}`}>
                                {Math.floor(invitationTimers[sentInvitation.id] / 60)}:{String(invitationTimers[sentInvitation.id] % 60).padStart(2, "0")}
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
                          className="bg-red-600 hover:bg-red-700 px-2 md:px-3 py-1 rounded text-xs md:text-sm font-medium w-full"
                        >
                          🔗 Cancel Pairing
                        </button>
                      ) : (
                        <></>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-6 md:py-8">
                  <p className="text-3xl md:text-4xl mb-2">👻</p>
                  <p className="text-sm md:text-base">No players here?</p>
                  <p className="text-xs md:text-sm mt-1">Share the game with friends!</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
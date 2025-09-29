import { Server, Socket } from "socket.io";
import { playersOnline, pongRooms, keyClashRooms, getLobbyState } from "./gameData";
import PingPongGame from "./PingPongGame";
import { state } from "./KeyClashGame";

interface Invitation {
  id: string;
  from: { socketId: string; name: string | null; playerId: number | null };
  to: { socketId: string; name: string | null; playerId: number | null };
  gameType: "pong" | "keyclash";
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

interface PairedPlayers {
  id: string;
  player1: { socketId: string; name: string | null; playerId: number | null };
  player2: { socketId: string; name: string | null; playerId: number | null };
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

// Store active invitations and paired players
const activeInvitations = new Map<string, Invitation>();
const pairedPlayers = new Map<string, PairedPlayers>();


export function setupLobby(io: Server) {
    const lobbyNamespace = io.of('/quickmatch');

    lobbyNamespace.on("connection", (socket: Socket) => {
      console.log(`Player connected: ${socket.id}`);

      socket.on("name", (name: string | null, playerId: number | null, callback: Function) => {
        if (playerId && playersOnline.some(p => p.playerId === playerId))
          return callback({ error: "You're already in the lobby" });
        if (name)
          socket.data.name = name
        else
          socket.data.name = `Guest-${socket.id.slice(0, 3)}`;

        playersOnline.push({ playerId: playerId, socketId: socket.id, name: socket.data.name, side: null });

        lobbyNamespace.emit("lobby_update", getLobbyState());        
      })

      // Handle sending invitations
      socket.on("send_invitation", (toSocketId: string, gameType: "pong" | "keyclash", callback: Function) => {
        console.log(`Invitation from ${socket.id} to ${toSocketId} for ${gameType}`);
        
        // Find the sender and receiver
        const sender = playersOnline.find(p => p.socketId === socket.id);
        const receiver = playersOnline.find(p => p.socketId === toSocketId);
        
        if (!sender || !receiver) {
          return callback({ error: "Player not found" });
        }

        // Check if receiver is still online
        const receiverSocket = lobbyNamespace.sockets.get(toSocketId);
        if (!receiverSocket) {
          return callback({ error: "Player is no longer online" });
        }

        // Check for existing invitations between these players
        const existingInvitation = Array.from(activeInvitations.values()).find(
          inv => (inv.from.socketId === socket.id && inv.to.socketId === toSocketId) ||
                 (inv.from.socketId === toSocketId && inv.to.socketId === socket.id)
        );

        if (existingInvitation) {
          return callback({ error: "Invitation already pending between these players" });
        }

        // Check if players are already paired
        const existingPair = Array.from(pairedPlayers.values()).find(
          pair => (pair.player1.socketId === socket.id || pair.player2.socketId === socket.id) ||
                  (pair.player1.socketId === toSocketId || pair.player2.socketId === toSocketId)
        );

        if (existingPair) {
          return callback({ error: "One of the players is already paired with someone else" });
        }

        // Create invitation
        const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const invitation: Invitation = {
          id: invitationId,
          from: { socketId: socket.id, name: sender.name, playerId: sender.playerId },
          to: { socketId: toSocketId, name: receiver.name, playerId: receiver.playerId },
          gameType,
          timestamp: Date.now()
        };

        // Set expiration timer (2 minutes)
        const timeout = setTimeout(() => {
          const inv = activeInvitations.get(invitationId);
          if (inv) {
            activeInvitations.delete(invitationId);
            
            // Notify both parties
            socket.emit("invitation_expired", { id: invitationId });
            receiverSocket.emit("invitation_expired", { id: invitationId });
            
            console.log(`Invitation ${invitationId} expired`);
          }
        }, 120000); // 2 minutes

        invitation.timeout = timeout;
        activeInvitations.set(invitationId, invitation);

        // Notify sender that invitation was sent
        socket.emit("invitation_sent", {
          id: invitationId,
          to: invitation.to,
          gameType
        });

        // Notify receiver of incoming invitation
        receiverSocket.emit("invitation_received", {
          id: invitationId,
          from: invitation.from,
          gameType,
          message: `${sender.name} wants to play ${gameType}!`
        });

        console.log(`Invitation ${invitationId} sent from ${sender.name} to ${receiver.name}`);
        callback({ success: true, invitationId });
      });

      // Handle invitation responses
      socket.on("respond_to_invitation", (invitationId: string, response: "accept" | "decline", callback: Function) => {
        console.log(`Response to invitation ${invitationId}: ${response}`);
        
        const invitation = activeInvitations.get(invitationId);
        if (!invitation) {
          return callback({ error: "Invitation not found or expired" });
        }

        // Verify this socket is the intended receiver
        if (invitation.to.socketId !== socket.id) {
          return callback({ error: "Not authorized to respond to this invitation" });
        }

        // Clear the timeout
        if (invitation.timeout) {
          clearTimeout(invitation.timeout);
        }

        // Remove invitation from active list
        activeInvitations.delete(invitationId);

        const senderSocket = lobbyNamespace.sockets.get(invitation.from.socketId);

        if (response === "decline") {
          // Notify sender of decline
          if (senderSocket) {
            senderSocket.emit("invitation_declined", { 
              id: invitationId, 
              by: invitation.to.name 
            });
          }
          
          callback({ success: true });
          console.log(`Invitation ${invitationId} declined`);
          return;
        }

        // Handle acceptance - create pairing (not game room yet)
        if (response === "accept") {
          const pairId = `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create pairing record
          const pairing: PairedPlayers = {
            id: pairId,
            player1: invitation.from,
            player2: invitation.to,
            timestamp: Date.now()
          };

          // Set pairing timeout (5 minutes to start game)
          const pairTimeout = setTimeout(() => {
            const pair = pairedPlayers.get(pairId);
            if (pair) {
              pairedPlayers.delete(pairId);
              
              // Notify both players that pairing expired
              const p1Socket = lobbyNamespace.sockets.get(pair.player1.socketId);
              const p2Socket = lobbyNamespace.sockets.get(pair.player2.socketId);
              
              if (p1Socket) p1Socket.emit("pairing_expired", { pairId });
              if (p2Socket) p2Socket.emit("pairing_expired", { pairId });
              
              console.log(`Pairing ${pairId} expired`);
            }
          }, 300000); // 5 minutes

          pairing.timeout = pairTimeout;
          pairedPlayers.set(pairId, pairing);

          // Notify both players they are now paired
          const pairingData = {
            pairId,
            player1: invitation.from,
            player2: invitation.to,
            timestamp: Date.now()
          };

          if (senderSocket) {
            senderSocket.emit("players_paired", {
              ...pairingData,
              yourRole: "sender",
              opponent: invitation.to
            });
          }

          socket.emit("players_paired", {
            ...pairingData,
            yourRole: "receiver", 
            opponent: invitation.from
          });

          console.log(`Players paired: ${invitation.from.name} and ${invitation.to.name}`);
          callback({ success: true, pairId });
        }
      });

      // Handle starting game after pairing
      socket.on("start_paired_game", (gameType: "pong" | "keyclash", callback: Function) => {
        console.log(`Starting paired game: ${gameType} for ${socket.id}`);
        
        // Find the pairing this player is part of
        const pairing = Array.from(pairedPlayers.values()).find(
          pair => pair.player1.socketId === socket.id || pair.player2.socketId === socket.id
        );

        if (!pairing) {
          return callback({ error: "No active pairing found" });
        }

        // Clear pairing timeout
        if (pairing.timeout) {
          clearTimeout(pairing.timeout);
        }

        // Remove pairing from active list
        pairedPlayers.delete(pairing.id);

        const gameId = Math.random().toString(36).substring(2, 8);
        
        try {
          // Create the appropriate game room
          if (gameType === "pong") {
            const game = new PingPongGame(gameId, "remote", "1v1");
            pongRooms.push(game);
          } else {
            const newKeyClash: state = {
              id: gameId,
              score1: 0,
              score2: 0,
              prompts: ["-", "-"],
              timeLeft: 20,
              players: [],
              matches: [],
              interval: null,
              player1ready: false,
              player2ready: false,
              p1: "player 1",
              p2: "player 2",
              status: "waiting",
              mode: "remote",
              type: "1v1",
              round: 0,
            };
            keyClashRooms.push(newKeyClash);
          }

          // Determine roles (sender is player1/left, receiver is player2/right)
          const isPlayer1 = pairing.player1.socketId === socket.id;
          const player1Data = pairing.player1;
          const player2Data = pairing.player2;

          // Notify both players with game setup data
          const gameSetupData = {
            gameId,
            gameType,
            mode: "remote",
            type: "1v1",
            senderData: player1Data,
            receiverData: player2Data
          };

          // Player 1 (original sender)
          const player1Socket = lobbyNamespace.sockets.get(player1Data.socketId);
          if (player1Socket) {
            player1Socket.emit("game_setup_complete", {
              ...gameSetupData,
              yourRole: "sender",
              yourSide: "left"
            });
          }

          // Player 2 (original receiver)
          const player2Socket = lobbyNamespace.sockets.get(player2Data.socketId);
          if (player2Socket) {
            player2Socket.emit("game_setup_complete", {
              ...gameSetupData,
              yourRole: "receiver",
              yourSide: "right"
            });
          }

          console.log(`Game ${gameId} created from pairing ${pairing.id}`);
          callback({ success: true, gameId });
          
        } catch (error) {
          console.error("Error creating game:", error);
          callback({ error: "Failed to create game" });
        }
      });

      // Handle invitation cancellation
      socket.on("cancel_invitation", (invitationId: string, callback: Function) => {
        console.log(`Cancelling invitation ${invitationId}`);
        
        const invitation = activeInvitations.get(invitationId);
        if (!invitation) {
          return callback({ error: "Invitation not found" });
        }

        // Verify this socket is the sender
        if (invitation.from.socketId !== socket.id) {
          return callback({ error: "Not authorized to cancel this invitation" });
        }

        // Clear timeout
        if (invitation.timeout) {
          clearTimeout(invitation.timeout);
        }

        // Remove invitation
        activeInvitations.delete(invitationId);

        // Notify receiver that invitation was cancelled
        const receiverSocket = lobbyNamespace.sockets.get(invitation.to.socketId);
        if (receiverSocket) {
          receiverSocket.emit("invitation_cancelled", { 
            id: invitationId, 
            reason: "Invitation cancelled by sender",
            by: invitation.from.name 
          });
        }

        callback({ success: true });
        console.log(`Invitation ${invitationId} cancelled`);
      });

      // Handle cancelling pairing
      socket.on("cancel_pairing", (callback: Function) => {
        console.log(`Cancelling pairing for ${socket.id}`);
        
        const pairing = Array.from(pairedPlayers.values()).find(
          pair => pair.player1.socketId === socket.id || pair.player2.socketId === socket.id
        );

        if (!pairing) {
          return callback({ error: "No active pairing found" });
        }

        // Clear timeout
        if (pairing.timeout) {
          clearTimeout(pairing.timeout);
        }

        // Remove pairing
        pairedPlayers.delete(pairing.id);

        // Notify the other player
        const otherSocketId = pairing.player1.socketId === socket.id 
          ? pairing.player2.socketId 
          : pairing.player1.socketId;
        
        const otherSocket = lobbyNamespace.sockets.get(otherSocketId);
        if (otherSocket) {
          otherSocket.emit("pairing_cancelled", { 
            pairId: pairing.id,
            reason: "Pairing cancelled by other player"
          });
        }

        callback({ success: true });
        console.log(`Pairing ${pairing.id} cancelled`);
      });

      socket.on("create_game", (game: "pong" | "keyclash", mode: "local" | "remote") => {
        const id = Math.random().toString(36).substring(2, 6);

        if (game === "pong") pongRooms.push(new PingPongGame(id, mode, "1v1"));
        else {
          let newKeyClash: state = {
            id: id,
            score1: 0,
            score2: 0,
            prompts: ["-", "-"],
            timeLeft: 20,
            players: [],
            matches: [],
            interval: null,
            player1ready: false,
            player2ready: false,
            p1: "player 1",
            p2: "player 2",
            status: "waiting",
            mode: mode,
			      type: "1v1",
            round: 0,
          }
          keyClashRooms.push(newKeyClash);
        }
        socket.emit("created_game", id, game, mode);
      });
  
      socket.on("join_game", (gameId, game, mode, callback) => {
        if (game === "pong") { 
          const gameRoom = pongRooms.find(g => g.getId() === gameId); 
          if (!gameRoom) return callback({ error: "Game not found" });
          if (gameRoom.state.status !== "waiting") return callback({ error: "Game already started" });                
        }
        else { 
          const gameRoom = keyClashRooms.find(g => g.id === gameId);
          if (!gameRoom) return callback({ error: "Game not found" });
          if (gameRoom.status !== "waiting") return callback({ error: "Game already started" });          
        } 
        // remove player from list of players in lobby
        const i = playersOnline.findIndex(p => p.socketId === socket.id);
        if (i !== -1) playersOnline.splice(i, 1);

        lobbyNamespace.emit("lobby_update", getLobbyState());        

        socket.emit("joined_game", gameId, game, mode);
      });
  
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);

        // Clean up any invitations involving this player
        const invitationsToRemove: string[] = [];
        activeInvitations.forEach((invitation, id) => {
          if (invitation.from.socketId === socket.id || invitation.to.socketId === socket.id) {
            // Clear timeout
            if (invitation.timeout) {
              clearTimeout(invitation.timeout);
            }
            
            // Notify the other party
            const otherSocketId = invitation.from.socketId === socket.id 
              ? invitation.to.socketId 
              : invitation.from.socketId;
            
            const otherSocket = lobbyNamespace.sockets.get(otherSocketId);
            if (otherSocket) {
              otherSocket.emit("invitation_cancelled", { 
                id, 
                reason: "Player disconnected" 
              });
            }
            
            invitationsToRemove.push(id);
          }
        });
        
        invitationsToRemove.forEach(id => activeInvitations.delete(id));

        // Clean up any pairings involving this player
        const pairingsToRemove: string[] = [];
        pairedPlayers.forEach((pairing, id) => {
          if (pairing.player1.socketId === socket.id || pairing.player2.socketId === socket.id) {
            // Clear timeout
            if (pairing.timeout) {
              clearTimeout(pairing.timeout);
            }
            
            // Notify the other player
            const otherSocketId = pairing.player1.socketId === socket.id 
              ? pairing.player2.socketId 
              : pairing.player1.socketId;
            
            const otherSocket = lobbyNamespace.sockets.get(otherSocketId);
            if (otherSocket) {
              otherSocket.emit("pairing_cancelled", { 
                pairId: id,
                reason: "Player disconnected"
              });
            }
            
            pairingsToRemove.push(id);
          }
        });
        
        pairingsToRemove.forEach(id => pairedPlayers.delete(id));

        const player = playersOnline.findIndex(p => p.socketId === socket.id);
        if (player !== -1) playersOnline.splice(player, 1);
  
        lobbyNamespace.emit("lobby_update", getLobbyState());
      });
    });
  }
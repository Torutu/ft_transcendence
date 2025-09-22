// // pong-app/backend/src/tournament.ts
// import { Server, Socket } from "socket.io";
// import { playersOnlineTournament, pongTournaments, keyClashTournaments, getTournamentLobbyState } from "./gameData";
// import PingPongGame from "./PingPongGame";
// import { state } from "./KeyClashGame";

// interface TournamentInvitation {
//   id: string;
//   from: { socketId: string; name: string };
//   to: { socketId: string; name: string };
//   gameType: "pong" | "keyclash";
//   timestamp: number;
//   timeout?: NodeJS.Timeout;
// }

// interface TournamentPairedPlayers {
//   id: string;
//   player1: { socketId: string; name: string };
//   player2: { socketId: string; name: string };
//   timestamp: number;
//   timeout?: NodeJS.Timeout;
// }

// // Store active tournament invitations and paired players
// const activeTournamentInvitations = new Map<string, TournamentInvitation>();
// const tournamentPairedPlayers = new Map<string, TournamentPairedPlayers>();

// export function setupTournamentLobby(io: Server) {
//     const tournamentLobbyNamespace = io.of('/tournament');

//     tournamentLobbyNamespace.on("connection", (socket: Socket) => {
//       console.log(`Player connected to tournament: ${socket.id}`);

//       socket.on("name", (name: string | null, playerId: string | null, callback: Function) => {
//         if (playerId && playersOnlineTournament.some(p => p.playerId === playerId))
//           return callback({ error: "You're already in the tournament lobby" });
//         if (name)
//           socket.data.name = name
//         else
//           socket.data.name = `Guest-${socket.id.slice(0, 3)}`;

//         playersOnlineTournament.push({ playerId: playerId, socketId: socket.id, name: socket.data.name });

//         tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());        
//       })

//       // Handle sending tournament invitations
//       socket.on("send_invitation", (toSocketId: string, gameType: "pong" | "keyclash", callback: Function) => {
//         console.log(`Tournament invitation from ${socket.id} to ${toSocketId} for ${gameType}`);
        
//         // Find the sender and receiver
//         const sender = playersOnlineTournament.find(p => p.socketId === socket.id);
//         const receiver = playersOnlineTournament.find(p => p.socketId === toSocketId);
        
//         if (!sender || !receiver) {
//           return callback({ error: "Player not found" });
//         }

//         // Check if receiver is still online
//         const receiverSocket = tournamentLobbyNamespace.sockets.get(toSocketId);
//         if (!receiverSocket) {
//           return callback({ error: "Player is no longer online" });
//         }

//         // Check for existing invitations between these players
//         const existingInvitation = Array.from(activeTournamentInvitations.values()).find(
//           inv => (inv.from.socketId === socket.id && inv.to.socketId === toSocketId) ||
//                  (inv.from.socketId === toSocketId && inv.to.socketId === socket.id)
//         );

//         if (existingInvitation) {
//           return callback({ error: "Tournament invitation already pending between these players" });
//         }

//         // Check if players are already paired for tournament
//         const existingPair = Array.from(tournamentPairedPlayers.values()).find(
//           pair => (pair.player1.socketId === socket.id || pair.player2.socketId === socket.id) ||
//                   (pair.player1.socketId === toSocketId || pair.player2.socketId === toSocketId)
//         );

//         if (existingPair) {
//           return callback({ error: "One of the players is already paired for tournament" });
//         }

//         // Create invitation
//         const invitationId = `tournament_inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         const invitation: TournamentInvitation = {
//           id: invitationId,
//           from: { socketId: socket.id, name: sender.name },
//           to: { socketId: toSocketId, name: receiver.name },
//           gameType,
//           timestamp: Date.now()
//         };

//         // Set expiration timer (2 minutes)
//         const timeout = setTimeout(() => {
//           const inv = activeTournamentInvitations.get(invitationId);
//           if (inv) {
//             activeTournamentInvitations.delete(invitationId);
            
//             // Notify both parties
//             socket.emit("invitation_expired", { id: invitationId });
//             receiverSocket.emit("invitation_expired", { id: invitationId });
            
//             console.log(`Tournament invitation ${invitationId} expired`);
//           }
//         }, 120000); // 2 minutes

//         invitation.timeout = timeout;
//         activeTournamentInvitations.set(invitationId, invitation);

//         // Notify sender that invitation was sent
//         socket.emit("invitation_sent", {
//           id: invitationId,
//           to: invitation.to,
//           gameType
//         });

//         // Notify receiver of incoming invitation
//         receiverSocket.emit("invitation_received", {
//           id: invitationId,
//           from: invitation.from,
//           gameType,
//           message: `${sender.name} wants to play ${gameType} tournament!`
//         });

//         console.log(`Tournament invitation ${invitationId} sent from ${sender.name} to ${receiver.name}`);
//         callback({ success: true, invitationId });
//       });

//     // Handle tournament invitation responses
//     socket.on("respond_to_invitation", (invitationId: string, response: "accept" | "decline", callback: Function) => {
//       console.log(`Response to tournament invitation ${invitationId}: ${response}`);
      
//       const invitation = activeTournamentInvitations.get(invitationId);
//       if (!invitation) {
//         return callback({ error: "Tournament invitation not found or expired" });
//       }

//       // Verify this socket is the intended receiver
//       if (invitation.to.socketId !== socket.id) {
//         return callback({ error: "Not authorized to respond to this tournament invitation" });
//       }

//       // Clear the timeout
//       if (invitation.timeout) {
//         clearTimeout(invitation.timeout);
//       }

//       // Remove invitation from active list
//       activeTournamentInvitations.delete(invitationId);

//       const senderSocket = tournamentLobbyNamespace.sockets.get(invitation.from.socketId);

//       if (response === "decline") {
//         // Notify sender of decline
//         if (senderSocket) {
//           senderSocket.emit("invitation_declined", { 
//             id: invitationId, 
//             by: invitation.to.name 
//           });
//         }
        
//         callback({ success: true });
//         console.log(`Tournament invitation ${invitationId} declined`);
//         return;
//       }

//       // Handle acceptance - create tournament pairing (not game room yet)
//       if (response === "accept") {
//         const pairId = `tournament_pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
//         // Create tournament pairing record
//         const pairing: TournamentPairedPlayers = {
//           id: pairId,
//           player1: invitation.from,
//           player2: invitation.to,
//           timestamp: Date.now()
//         };

//         // Set pairing timeout (5 minutes to start tournament)
//         const pairTimeout = setTimeout(() => {
//           const pair = tournamentPairedPlayers.get(pairId);
//           if (pair) {
//             tournamentPairedPlayers.delete(pairId);
            
//             // Notify both players that tournament pairing expired
//             const p1Socket = tournamentLobbyNamespace.sockets.get(pair.player1.socketId);
//             const p2Socket = tournamentLobbyNamespace.sockets.get(pair.player2.socketId);
            
//             if (p1Socket) p1Socket.emit("pairing_expired", { pairId });
//             if (p2Socket) p2Socket.emit("pairing_expired", { pairId });
            
//             console.log(`Tournament pairing ${pairId} expired`);
//           }
//         }, 300000); // 5 minutes

//         pairing.timeout = pairTimeout;
//         tournamentPairedPlayers.set(pairId, pairing);

//         // Notify both players they are now paired for tournament
//         const pairingData = {
//           pairId,
//           player1: invitation.from,
//           player2: invitation.to,
//           timestamp: Date.now()
//         };

//         if (senderSocket) {
//           senderSocket.emit("players_paired", {
//             ...pairingData,
//             yourRole: "sender",
//             opponent: invitation.to
//           });
//         }

//         socket.emit("players_paired", {
//           ...pairingData,
//           yourRole: "receiver", 
//           opponent: invitation.from
//         });

//         console.log(`Tournament players paired: ${invitation.from.name} and ${invitation.to.name}`);
//         callback({ success: true, pairId });
//       }
//     });

//       // Handle starting tournament game after pairing
//       socket.on("start_paired_game", (gameType: "pong" | "keyclash", callback: Function) => {
//         console.log(`Starting paired tournament game: ${gameType} for ${socket.id}`);
        
//         // Find the tournament pairing this player is part of
//         const pairing = Array.from(tournamentPairedPlayers.values()).find(
//           pair => pair.player1.socketId === socket.id || pair.player2.socketId === socket.id
//         );

//         if (!pairing) {
//           return callback({ error: "No active tournament pairing found" });
//         }

//         // Clear pairing timeout
//         if (pairing.timeout) {
//           clearTimeout(pairing.timeout);
//         }

//         // Remove pairing from active list
//         tournamentPairedPlayers.delete(pairing.id);

//         const gameId = Math.random().toString(36).substring(2, 8);
        
//         try {
//           // Create the appropriate tournament game room
//           if (gameType === "pong") {
//             const game = new PingPongGame(gameId, "remote", "tournament");
//             pongTournaments.push(game);
//           } else {
//             const newKeyClash: state = {
//               id: gameId,
//               score1: 0,
//               score2: 0,
//               prompts: ["-", "-"],
//               timeLeft: 20,
//               players: [],
//               matches: [],
//               interval: null,
//               player1ready: false,
//               player2ready: false,
//               p1: undefined,
//               p2: undefined,
//               status: "waiting",
//               mode: "remote",
//               type: "tournament",
//               round: 0,
//             };
//             keyClashTournaments.push(newKeyClash);
//           }

//           // Determine roles (sender is player1/left, receiver is player2/right)
//           const isPlayer1 = pairing.player1.socketId === socket.id;
//           const player1Data = pairing.player1;
//           const player2Data = pairing.player2;

//           // Notify both players with tournament game setup data
//           const gameSetupData = {
//             gameId,
//             gameType,
//             mode: "remote",
//             type: "tournament",
//             senderData: player1Data,
//             receiverData: player2Data
//           };

//           // Player 1 (original sender)
//           const player1Socket = tournamentLobbyNamespace.sockets.get(player1Data.socketId);
//           if (player1Socket) {
//             player1Socket.emit("game_setup_complete", {
//               ...gameSetupData,
//               yourRole: "sender",
//               yourSide: "left"
//             });
//           }

//           // Player 2 (original receiver)
//           const player2Socket = tournamentLobbyNamespace.sockets.get(player2Data.socketId);
//           if (player2Socket) {
//             player2Socket.emit("game_setup_complete", {
//               ...gameSetupData,
//               yourRole: "receiver",
//               yourSide: "right"
//             });
//           }

//           console.log(`Tournament game ${gameId} created from pairing ${pairing.id}`);
//           callback({ success: true, gameId });
          
//         } catch (error) {
//           console.error("Error creating tournament game:", error);
//           callback({ error: "Failed to create tournament game" });
//         }
//       });

//       // Handle tournament invitation cancellation
//       socket.on("cancel_invitation", (invitationId: string, callback: Function) => {
//         console.log(`Cancelling tournament invitation ${invitationId}`);
        
//         const invitation = activeTournamentInvitations.get(invitationId);
//         if (!invitation) {
//           return callback({ error: "Tournament invitation not found" });
//         }

//         // Verify this socket is the sender
//         if (invitation.from.socketId !== socket.id) {
//           return callback({ error: "Not authorized to cancel this tournament invitation" });
//         }

//         // Clear timeout
//         if (invitation.timeout) {
//           clearTimeout(invitation.timeout);
//         }

//         // Remove invitation
//         activeTournamentInvitations.delete(invitationId);

//         // Notify receiver that invitation was cancelled
//         const receiverSocket = tournamentLobbyNamespace.sockets.get(invitation.to.socketId);
//         if (receiverSocket) {
//           receiverSocket.emit("invitation_cancelled", { 
//             id: invitationId, 
//             reason: "Tournament invitation cancelled by sender",
//             by: invitation.from.name 
//           });
//         }

//         callback({ success: true });
//         console.log(`Tournament invitation ${invitationId} cancelled`);
//       });

//       // Handle cancelling tournament pairing
//       socket.on("cancel_pairing", (callback: Function) => {
//         console.log(`Cancelling tournament pairing for ${socket.id}`);
        
//         const pairing = Array.from(tournamentPairedPlayers.values()).find(
//           pair => pair.player1.socketId === socket.id || pair.player2.socketId === socket.id
//         );

//         if (!pairing) {
//           return callback({ error: "No active tournament pairing found" });
//         }

//         // Clear timeout
//         if (pairing.timeout) {
//           clearTimeout(pairing.timeout);
//         }

//         // Remove pairing
//         tournamentPairedPlayers.delete(pairing.id);

//         // Notify the other player
//         const otherSocketId = pairing.player1.socketId === socket.id 
//           ? pairing.player2.socketId 
//           : pairing.player1.socketId;
        
//         const otherSocket = tournamentLobbyNamespace.sockets.get(otherSocketId);
//         if (otherSocket) {
//           otherSocket.emit("pairing_cancelled", { 
//             pairId: pairing.id,
//             reason: "Tournament pairing cancelled by other player"
//           });
//         }

//         callback({ success: true });
//         console.log(`Tournament pairing ${pairing.id} cancelled`);
//       });
  
//       socket.on("create_game", (game: "pong" | "keyclash", mode: "local" | "remote") => {
//         const id = Math.random().toString(36).substring(2, 6);

//         if (game === "pong") pongTournaments.push(new PingPongGame(id, mode, "tournament"));
//         else {
//           let newKeyClash: state = {
//             id: id,
//             score1: 0,
//             score2: 0,
//             prompts: ["-", "-"],
//             timeLeft: 20,
//             players: [],
//             matches: [],
//             interval: null,
//             player1ready: false,
//             player2ready: false,
//             p1: undefined,
//             p2: undefined,
//             status: "waiting",
//             mode: mode,
// 			      type: "tournament",
//             round: 0,
//           }
//           keyClashTournaments.push(newKeyClash);
//         }
//         socket.emit("created_game", id, game, mode);
//       });
  
//       socket.on("join_game", (gameId, game, mode, callback) => {
//         if (game === "pong") { 
//           const gameRoom = pongTournaments.find(g => g.getId() === gameId); 
//           if (!gameRoom) return callback({ error: "Tournament game not found" });
//           if (gameRoom.state.status !== "waiting") return callback({ error: "Tournament game already started" });                
//         }
//         else { 
//           const gameRoom = keyClashTournaments.find(g => g.id === gameId);
//           if (!gameRoom) return callback({ error: "Tournament game not found" });
//           if (gameRoom.status !== "waiting") return callback({ error: "Tournament game already started" });          
//         } 
//         // remove player from list of players in tournament lobby
//         const i = playersOnlineTournament.findIndex(p => p.socketId === socket.id);
//         if (i !== -1) playersOnlineTournament.splice(i, 1);

//         tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());        

//         socket.emit("joined_game", gameId, game, mode);
//       });
  
//       socket.on("disconnect", () => {
//         console.log(`Player disconnected from tournament: ${socket.id}`);

//         // Clean up any tournament invitations involving this player
//         const invitationsToRemove: string[] = [];
//         activeTournamentInvitations.forEach((invitation, id) => {
//           if (invitation.from.socketId === socket.id || invitation.to.socketId === socket.id) {
//             // Clear timeout
//             if (invitation.timeout) {
//               clearTimeout(invitation.timeout);
//             }
            
//             // Notify the other party
//             const otherSocketId = invitation.from.socketId === socket.id 
//               ? invitation.to.socketId 
//               : invitation.from.socketId;
            
//             const otherSocket = tournamentLobbyNamespace.sockets.get(otherSocketId);
//             if (otherSocket) {
//               otherSocket.emit("invitation_cancelled", { 
//                 id, 
//                 reason: "Player disconnected from tournament" 
//               });
//             }
            
//             invitationsToRemove.push(id);
//           }
//         });
        
//         invitationsToRemove.forEach(id => activeTournamentInvitations.delete(id));

//         // Clean up any tournament pairings involving this player
//         const pairingsToRemove: string[] = [];
//         tournamentPairedPlayers.forEach((pairing, id) => {
//           if (pairing.player1.socketId === socket.id || pairing.player2.socketId === socket.id) {
//             // Clear timeout
//             if (pairing.timeout) {
//               clearTimeout(pairing.timeout);
//             }
            
//             // Notify the other player
//             const otherSocketId = pairing.player1.socketId === socket.id 
//               ? pairing.player2.socketId 
//               : pairing.player1.socketId;
            
//             const otherSocket = tournamentLobbyNamespace.sockets.get(otherSocketId);
//             if (otherSocket) {
//               otherSocket.emit("pairing_cancelled", { 
//                 pairId: id,
//                 reason: "Player disconnected from tournament"
//               });
//             }
            
//             pairingsToRemove.push(id);
//           }
//         });
        
//         pairingsToRemove.forEach(id => tournamentPairedPlayers.delete(id));

//         const player = playersOnlineTournament.findIndex(p => p.socketId === socket.id);
//         if (player !== -1) playersOnlineTournament.splice(player, 1);
  
//         tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
//       });
//     });
// }




// pong-app/backend/src/tournament.ts
import { Server, Socket } from "socket.io";
import { playersOnlineTournament, pongTournaments, keyClashTournaments, getTournamentLobbyState } from "./gameData";
import PingPongGame from "./PingPongGame";
import { state } from "./KeyClashGame";

interface TournamentInvitation {
  id: string;
  from: { socketId: string; name: string };
  to: { socketId: string; name: string };
  gameType: "pong" | "keyclash";
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

interface TournamentPairedPlayers {
  id: string;
  player1: { socketId: string; name: string };
  player2: { socketId: string; name: string };
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

// Store active tournament invitations and paired players
const activeTournamentInvitations = new Map<string, TournamentInvitation>();
const tournamentPairedPlayers = new Map<string, TournamentPairedPlayers>();

export function setupTournamentLobby(io: Server) {
    const tournamentLobbyNamespace = io.of('/tournament');

    tournamentLobbyNamespace.on("connection", (socket: Socket) => {
      console.log(`Player connected to tournament: ${socket.id}`);

      socket.on("name", (name: string | null, playerId: string | null, callback: Function) => {
        if (playerId && playersOnlineTournament.some(p => p.playerId === playerId))
          return callback({ error: "You're already in the tournament lobby" });
        if (name)
          socket.data.name = name
        else
          socket.data.name = `Guest-${socket.id.slice(0, 3)}`;

        playersOnlineTournament.push({ playerId: playerId, socketId: socket.id, name: socket.data.name });

        tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());        
      })

      // Handle sending tournament invitations
      socket.on("send_invitation", (toSocketId: string, gameType: "pong" | "keyclash", callback: Function) => {
        console.log(`Tournament invitation from ${socket.id} to ${toSocketId} for ${gameType}`);
        
        // Find the sender and receiver
        const sender = playersOnlineTournament.find(p => p.socketId === socket.id);
        const receiver = playersOnlineTournament.find(p => p.socketId === toSocketId);
        
        if (!sender || !receiver) {
          return callback({ error: "Player not found" });
        }

        // Check if receiver is still online
        const receiverSocket = tournamentLobbyNamespace.sockets.get(toSocketId);
        if (!receiverSocket) {
          return callback({ error: "Player is no longer online" });
        }

        // Check for existing invitations between these players
        const existingInvitation = Array.from(activeTournamentInvitations.values()).find(
          inv => (inv.from.socketId === socket.id && inv.to.socketId === toSocketId) ||
                 (inv.from.socketId === toSocketId && inv.to.socketId === socket.id)
        );

        if (existingInvitation) {
          return callback({ error: "Tournament invitation already pending between these players" });
        }

        // Check if players are already paired for tournament
        const existingPair = Array.from(tournamentPairedPlayers.values()).find(
          pair => (pair.player1.socketId === socket.id || pair.player2.socketId === socket.id) ||
                  (pair.player1.socketId === toSocketId || pair.player2.socketId === toSocketId)
        );

        if (existingPair) {
          return callback({ error: "One of the players is already paired for tournament" });
        }

        // Create invitation
        const invitationId = `tournament_inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const invitation: TournamentInvitation = {
          id: invitationId,
          from: { socketId: socket.id, name: sender.name },
          to: { socketId: toSocketId, name: receiver.name },
          gameType,
          timestamp: Date.now()
        };

        // Set expiration timer (2 minutes)
        const timeout = setTimeout(() => {
          const inv = activeTournamentInvitations.get(invitationId);
          if (inv) {
            activeTournamentInvitations.delete(invitationId);
            
            // Notify both parties
            socket.emit("invitation_expired", { id: invitationId });
            receiverSocket.emit("invitation_expired", { id: invitationId });
            
            console.log(`Tournament invitation ${invitationId} expired`);
          }
        }, 120000); // 2 minutes

        invitation.timeout = timeout;
        activeTournamentInvitations.set(invitationId, invitation);

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
          message: `${sender.name} wants to play ${gameType} tournament!`
        });

        console.log(`Tournament invitation ${invitationId} sent from ${sender.name} to ${receiver.name}`);
        callback({ success: true, invitationId });
      });

      // Handle tournament invitation responses
      socket.on("respond_to_invitation", (invitationId: string, response: "accept" | "decline", callback: Function) => {
        console.log(`Response to tournament invitation ${invitationId}: ${response}`);
        
        const invitation = activeTournamentInvitations.get(invitationId);
        if (!invitation) {
          return callback({ error: "Tournament invitation not found or expired" });
        }

        // Verify this socket is the intended receiver
        if (invitation.to.socketId !== socket.id) {
          return callback({ error: "Not authorized to respond to this tournament invitation" });
        }

        // Clear the timeout
        if (invitation.timeout) {
          clearTimeout(invitation.timeout);
        }

        // Remove invitation from active list
        activeTournamentInvitations.delete(invitationId);

        const senderSocket = tournamentLobbyNamespace.sockets.get(invitation.from.socketId);

        if (response === "decline") {
          // Notify sender of decline
          if (senderSocket) {
            senderSocket.emit("invitation_declined", { 
              id: invitationId, 
              by: invitation.to.name 
            });
          }
          
          callback({ success: true });
          console.log(`Tournament invitation ${invitationId} declined`);
          return;
        }

        // Handle acceptance - create tournament pairing (not game room yet)
        if (response === "accept") {
          const pairId = `tournament_pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create tournament pairing record
          const pairing: TournamentPairedPlayers = {
            id: pairId,
            player1: invitation.from,
            player2: invitation.to,
            timestamp: Date.now()
          };

          // Set pairing timeout (5 minutes to start tournament)
          const pairTimeout = setTimeout(() => {
            const pair = tournamentPairedPlayers.get(pairId);
            if (pair) {
              tournamentPairedPlayers.delete(pairId);
              
              // Notify both players that tournament pairing expired
              const p1Socket = tournamentLobbyNamespace.sockets.get(pair.player1.socketId);
              const p2Socket = tournamentLobbyNamespace.sockets.get(pair.player2.socketId);
              
              if (p1Socket) p1Socket.emit("pairing_expired", { pairId });
              if (p2Socket) p2Socket.emit("pairing_expired", { pairId });
              
              console.log(`Tournament pairing ${pairId} expired`);
            }
          }, 300000); // 5 minutes

          pairing.timeout = pairTimeout;
          tournamentPairedPlayers.set(pairId, pairing);

          // Notify both players they are now paired for tournament
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

          console.log(`Tournament players paired: ${invitation.from.name} and ${invitation.to.name}`);
          callback({ success: true, pairId });
        }
      });

      // Handle starting tournament game after pairing
      socket.on("start_paired_game", (gameType: "pong" | "keyclash", callback: Function) => {
        console.log(`Starting paired tournament game: ${gameType} for ${socket.id}`);
        
        // Find the tournament pairing this player is part of
        const pairing = Array.from(tournamentPairedPlayers.values()).find(
          pair => pair.player1.socketId === socket.id || pair.player2.socketId === socket.id
        );

        if (!pairing) {
          return callback({ error: "No active tournament pairing found" });
        }

        // Clear pairing timeout
        if (pairing.timeout) {
          clearTimeout(pairing.timeout);
        }

        // Remove pairing from active list
        tournamentPairedPlayers.delete(pairing.id);

        const gameId = Math.random().toString(36).substring(2, 8);
        
        try {
          // Create the appropriate tournament game room
          if (gameType === "pong") {
            const game = new PingPongGame(gameId, "remote", "tournament");
            pongTournaments.push(game);
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
              p1: undefined,
              p2: undefined,
              status: "waiting",
              mode: "remote",
              type: "tournament",
              round: 0,
            };
            keyClashTournaments.push(newKeyClash);
          }

          // Determine roles (sender is player1/left, receiver is player2/right)
          const isPlayer1 = pairing.player1.socketId === socket.id;
          const player1Data = pairing.player1;
          const player2Data = pairing.player2;

          // Notify both players with tournament game setup data
          const gameSetupData = {
            gameId,
            gameType,
            mode: "remote",
            type: "tournament",
            senderData: player1Data,
            receiverData: player2Data
          };

          // Player 1 (original sender)
          const player1Socket = tournamentLobbyNamespace.sockets.get(player1Data.socketId);
          if (player1Socket) {
            player1Socket.emit("game_setup_complete", {
              ...gameSetupData,
              yourRole: "sender",
              yourSide: "left"
            });
          }

          // Player 2 (original receiver)
          const player2Socket = tournamentLobbyNamespace.sockets.get(player2Data.socketId);
          if (player2Socket) {
            player2Socket.emit("game_setup_complete", {
              ...gameSetupData,
              yourRole: "receiver",
              yourSide: "right"
            });
          }

          console.log(`Tournament game ${gameId} created from pairing ${pairing.id}`);
          callback({ success: true, gameId });
          
        } catch (error) {
          console.error("Error creating tournament game:", error);
          callback({ error: "Failed to create tournament game" });
        }
      });

      // Handle tournament invitation cancellation
      socket.on("cancel_invitation", (invitationId: string, callback: Function) => {
        console.log(`Cancelling tournament invitation ${invitationId}`);
        
        const invitation = activeTournamentInvitations.get(invitationId);
        if (!invitation) {
          return callback({ error: "Tournament invitation not found" });
        }

        // Verify this socket is the sender
        if (invitation.from.socketId !== socket.id) {
          return callback({ error: "Not authorized to cancel this tournament invitation" });
        }

        // Clear timeout
        if (invitation.timeout) {
          clearTimeout(invitation.timeout);
        }

        // Remove invitation
        activeTournamentInvitations.delete(invitationId);

        // Notify receiver that invitation was cancelled
        const receiverSocket = tournamentLobbyNamespace.sockets.get(invitation.to.socketId);
        if (receiverSocket) {
          receiverSocket.emit("invitation_cancelled", { 
            id: invitationId, 
            reason: "Tournament invitation cancelled by sender",
            by: invitation.from.name 
          });
        }

        callback({ success: true });
        console.log(`Tournament invitation ${invitationId} cancelled`);
      });

      // Handle cancelling tournament pairing
      socket.on("cancel_pairing", (callback: Function) => {
        console.log(`Cancelling tournament pairing for ${socket.id}`);
        
        const pairing = Array.from(tournamentPairedPlayers.values()).find(
          pair => pair.player1.socketId === socket.id || pair.player2.socketId === socket.id
        );

        if (!pairing) {
          return callback({ error: "No active tournament pairing found" });
        }

        // Clear timeout
        if (pairing.timeout) {
          clearTimeout(pairing.timeout);
        }

        // Remove pairing
        tournamentPairedPlayers.delete(pairing.id);

        // Notify the other player
        const otherSocketId = pairing.player1.socketId === socket.id 
          ? pairing.player2.socketId 
          : pairing.player1.socketId;
        
        const otherSocket = tournamentLobbyNamespace.sockets.get(otherSocketId);
        if (otherSocket) {
          otherSocket.emit("pairing_cancelled", { 
            pairId: pairing.id,
            reason: "Tournament pairing cancelled by other player"
          });
        }

        callback({ success: true });
        console.log(`Tournament pairing ${pairing.id} cancelled`);
      });
  
      socket.on("create_game", (game: "pong" | "keyclash", mode: "local" | "remote") => {
        const id = Math.random().toString(36).substring(2, 6);

        if (game === "pong") pongTournaments.push(new PingPongGame(id, mode, "tournament"));
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
            p1: undefined,
            p2: undefined,
            status: "waiting",
            mode: mode,
			      type: "tournament",
            round: 0,
          }
          keyClashTournaments.push(newKeyClash);
        }
        socket.emit("created_game", id, game, mode);
      });
  
      socket.on("join_game", (gameId, game, mode, callback) => {
        if (game === "pong") { 
          const gameRoom = pongTournaments.find(g => g.getId() === gameId); 
          if (!gameRoom) return callback({ error: "Tournament game not found" });
          if (gameRoom.state.status !== "waiting") return callback({ error: "Tournament game already started" });                
        }
        else { 
          const gameRoom = keyClashTournaments.find(g => g.id === gameId);
          if (!gameRoom) return callback({ error: "Tournament game not found" });
          if (gameRoom.status !== "waiting") return callback({ error: "Tournament game already started" });          
        } 
        // remove player from list of players in tournament lobby
        const i = playersOnlineTournament.findIndex(p => p.socketId === socket.id);
        if (i !== -1) playersOnlineTournament.splice(i, 1);

        tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());        

        socket.emit("joined_game", gameId, game, mode);
      });
  
      socket.on("disconnect", () => {
        console.log(`Player disconnected from tournament: ${socket.id}`);

        // Clean up any tournament invitations involving this player
        const invitationsToRemove: string[] = [];
        activeTournamentInvitations.forEach((invitation, id) => {
          if (invitation.from.socketId === socket.id || invitation.to.socketId === socket.id) {
            // Clear timeout
            if (invitation.timeout) {
              clearTimeout(invitation.timeout);
            }
            
            // Notify the other party
            const otherSocketId = invitation.from.socketId === socket.id 
              ? invitation.to.socketId 
              : invitation.from.socketId;
            
            const otherSocket = tournamentLobbyNamespace.sockets.get(otherSocketId);
            if (otherSocket) {
              otherSocket.emit("invitation_cancelled", { 
                id, 
                reason: "Player disconnected from tournament" 
              });
            }
            
            invitationsToRemove.push(id);
          }
        });
        
        invitationsToRemove.forEach(id => activeTournamentInvitations.delete(id));

        // Clean up any tournament pairings involving this player
        const pairingsToRemove: string[] = [];
        tournamentPairedPlayers.forEach((pairing, id) => {
          if (pairing.player1.socketId === socket.id || pairing.player2.socketId === socket.id) {
            // Clear timeout
            if (pairing.timeout) {
              clearTimeout(pairing.timeout);
            }
            
            // Notify the other player
            const otherSocketId = pairing.player1.socketId === socket.id 
              ? pairing.player2.socketId 
              : pairing.player1.socketId;
            
            const otherSocket = tournamentLobbyNamespace.sockets.get(otherSocketId);
            if (otherSocket) {
              otherSocket.emit("pairing_cancelled", { 
                pairId: id,
                reason: "Player disconnected from tournament"
              });
            }
            
            pairingsToRemove.push(id);
          }
        });
        
        pairingsToRemove.forEach(id => tournamentPairedPlayers.delete(id));

        const player = playersOnlineTournament.findIndex(p => p.socketId === socket.id);
        if (player !== -1) playersOnlineTournament.splice(player, 1);
  
        tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
      });
    });
}
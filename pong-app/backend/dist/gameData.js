// Stores metadata about active games (id, status, players)
export const playersOnline = [];
export const gameRooms = [];

// Helper to return lobby data
export function getLobbyState() {
  return {
    players: playersOnline,
    games: gameRooms.map(g => ({
        id: g.id,
        status: g.status || "waiting",
        players: Object.keys(g.players || {}).map(id => ({
          id,
          name: g.players[id]?.name ?? `Guest-${id.slice(0, 4)}`
        }))
      }))
  };
}

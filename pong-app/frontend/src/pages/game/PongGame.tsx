// frontend/src/pages/games/PongGame.tsx
import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PingPongClient from '../../utils/PingPongClient';

interface LocationState {
  user?: string;
  guest?: string;
  userAvatar?: { name: string; image: string };
  guestAvatar?: { name: string; image: string };
  gameType?: string;
  mode?: string;
  type?: string;
  fromQuickMatch?: boolean;
  fromRemoteInvitation?: boolean;
  isRemote?: boolean;
  isLocal?: boolean;
  yourSide?: string;
  gameId?: string;
}

export default function PongGame() {
  const { gameId, mode, type } = useParams<{
    gameId: string;
    mode: 'local' | 'remote';
    type: '1v1' | 'tournament';
  }>();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const gameClientRef = useRef<PingPongClient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameId || !mode || !type || !containerRef.current) {
      console.error('Missing required game parameters');
      navigate('/quickmatch');
      return;
    }

    // Get navigation state
    const state = location.state as LocationState;
    console.log('Pong game started with state:', state);

    // Determine player name
    let playerName: string | null = null;
    if (user?.username) {
      playerName = user.username;
    } else if (state?.user) {
      playerName = state.user;
    }

    console.log('Starting pong game with:', {
      gameId,
      mode,
      type,
      playerName,
      state
    });

    try {
      // Create game client with navigation state
      gameClientRef.current = new PingPongClient(
        containerRef.current,
        gameId,
        mode,
        type,
        navigate,
        playerName,
        state // Pass the navigation state to the client
      );
    } catch (error) {
      console.error('Failed to create pong game client:', error);
      alert('Failed to start game');
      navigate('/quickmatch');
    }

    // Cleanup function
    return () => {
      if (gameClientRef.current) {
        console.log('Disposing pong game client');
        gameClientRef.current.dispose();
        gameClientRef.current = null;
      }
    };
  }, [gameId, mode, type, navigate, user, location.state]);

  // Handle page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameClientRef.current) {
        gameClientRef.current.dispose();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        margin: 0, 
        padding: 0,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Game will be rendered here by the PingPongClient */}
      <style jsx>{`
        .overlay {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-family: monospace;
          font-size: 16px;
          text-align: center;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 5px;
        }
      `}</style>
    </div>
  );
}
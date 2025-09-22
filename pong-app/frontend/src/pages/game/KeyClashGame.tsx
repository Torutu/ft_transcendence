// frontend/src/pages/games/KeyClashGame.tsx
import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import KeyClashClient from '../../utils/keyClashClient';

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

export default function KeyClashGame() {
  const { gameId, mode, type } = useParams<{
    gameId: string;
    mode: 'local' | 'remote';
    type: '1v1' | 'tournament';
  }>();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameId || !mode || !type || !containerRef.current) {
      console.error('Missing required game parameters');
      navigate('/quickmatch');
      return;
    }

    // Get navigation state
    const state = location.state as LocationState;
    console.log('KeyClash game started with state:', state);

    // Determine player name
    let playerName: string | null = null;
    if (user?.username) {
      playerName = user.username;
    } else if (state?.user) {
      playerName = state.user;
    }

    console.log('Starting keyclash game with:', {
      gameId,
      mode,
      type,
      playerName,
      state
    });

    try {
      // Create game client with navigation state
      cleanupRef.current = KeyClashClient(
        containerRef.current,
        gameId,
        mode,
        type,
        navigate,
        playerName,
        state // Pass the navigation state to the client
      );
    } catch (error) {
      console.error('Failed to create keyclash game client:', error);
      alert('Failed to start game');
      navigate('/quickmatch');
    }

    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        console.log('Cleaning up keyclash game client');
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [gameId, mode, type, navigate, user, location.state]);

  // Handle page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cleanupRef.current) {
        cleanupRef.current();
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
      className="key-clash-container"
      style={{ 
        width: '100vw', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'monospace',
        overflow: 'hidden'
      }}
    >
      {/* Timer Display */}
      <div 
        id="timer" 
        style={{
          fontSize: '24px',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        Get Ready...
      </div>

      {/* Game Area */}
      <div 
        style={{
          display: 'flex',
          gap: '100px',
          alignItems: 'center',
          marginBottom: '40px'
        }}
      >
        {/* Player 1 */}
        <div className="player" style={{ textAlign: 'center' }}>
          <div 
            id="score1" 
            style={{
              fontSize: '20px',
              marginBottom: '20px',
              fontWeight: 'bold'
            }}
          >
            Player 1: 0
          </div>
          <div 
            id="prompt1"
            style={{
              fontSize: '72px',
              width: '100px',
              height: '100px',
              border: '3px solid white',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              fontWeight: 'bold'
            }}
          >
            ?
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            Use WASD keys
          </div>
        </div>

        {/* VS */}
        <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
          VS
        </div>

        {/* Player 2 */}
        <div className="player" style={{ textAlign: 'center' }}>
          <div 
            id="score2" 
            style={{
              fontSize: '20px',
              marginBottom: '20px',
              fontWeight: 'bold'
            }}
          >
            Player 2: 0
          </div>
          <div 
            id="prompt2"
            style={{
              fontSize: '72px',
              width: '100px',
              height: '100px',
              border: '3px solid white',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              fontWeight: 'bold'
            }}
          >
            ?
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            Use Arrow keys
          </div>
        </div>
      </div>

      {/* Start Prompt */}
      <div 
        id="start-prompt"
        style={{
          fontSize: '18px',
          textAlign: 'center',
          marginTop: '20px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '5px'
        }}
      >
        Waiting for game to start...
      </div>

      {/* CSS for correct hit animation */}
      <style jsx>{`
        .player.correct {
          animation: correctHit 0.3s ease-in-out;
        }
        
        @keyframes correctHit {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); background-color: rgba(0, 255, 0, 0.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
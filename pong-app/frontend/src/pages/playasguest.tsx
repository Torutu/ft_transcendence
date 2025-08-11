// import React, { useEffect, useRef } from 'react';
// import PingPongGame from '../PingPongGame';

// const PlayPage: React.FC = () => {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const gameInstance = useRef<any>(null);

//   useEffect(() => {
//     if (containerRef.current) {
//       gameInstance.current = new PingPongGame(containerRef.current);
//     }

//     return () => {
//       if (gameInstance.current) {
//         gameInstance.current.dispose?.(); // fix the game dup
//         gameInstance.current = null; 
//       }
//     };
//   }, []);

//   return <div ref={containerRef} className="flex-grow relative w-full h-full bg-black" />;
// };

// export default PlayPage;

import React, { useEffect, useRef } from 'react';
import initKeyClash from '../keyClash';

const PlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cleanup = initKeyClash(containerRef.current);
    return cleanup;
  }, []);

return (
  <div ref={containerRef} className="game-container">
    <div className="players-row">
      <div className="player" id="p2">
        <div id="prompt2">-</div>
        <div id="score2">Score: 0</div>
      </div>
      <div className="player" id="p1">
        <div id="prompt1">-</div>
        <div id="score1">Score: 0</div>
      </div>
    </div>

    <div id="timer">Time Left: 20s</div>
    <div id="start-prompt">Press SPACE to Start</div>
  </div>
);

};

export default PlayPage;

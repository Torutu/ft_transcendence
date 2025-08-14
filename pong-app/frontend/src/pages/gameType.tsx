import React from 'react';
import { Link } from 'react-router'; 

const GameType: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-80 z-10">
      <Link
        to="/playLocal"
        className="px-4 py-2 m-2 bg-white text-black font-bold rounded inline-block text-center"
      >
        Local game
      </Link>

      <Link
        to="/lobby"
        className="px-4 py-2 m-2 bg-blue-500 text-white font-bold rounded inline-block text-center"
      >
        LAN game
      </Link>
    </div>
  );
};

export default GameType;
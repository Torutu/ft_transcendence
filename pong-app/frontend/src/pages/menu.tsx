import React from 'react';
import { Link } from 'react-router'; 

const Menu: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-80 z-10">
      <Link
        to="/play"
        className="px-4 py-2 m-2 bg-white text-black font-bold rounded inline-block text-center"
      >
        Play as guest
      </Link>

      <Link
        to="/register"
        className="px-4 py-2 m-2 bg-blue-500 text-white font-bold rounded inline-block text-center"
      >
        Register
      </Link>

      <Link
        to="/login"
        className="px-4 py-2 m-2 bg-green-500 text-white font-bold rounded inline-block text-center"
      >
        Login
      </Link>
    </div>
  );
};

export default Menu;
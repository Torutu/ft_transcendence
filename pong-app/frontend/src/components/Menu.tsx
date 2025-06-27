
import React from 'react';

interface MenuProps {
  onPlay: () => void;
}

const Menu: React.FC<MenuProps> = ({ onPlay }) => {
  const handleRegister = () => {
    alert('Register clicked!');
  };

  const handleLogin = () => {
    alert('Login clicked!');
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-80 z-10">
      <button onClick={onPlay} className="px-4 py-2 m-2 bg-white text-black font-bold rounded">Play</button>
      <button onClick={handleRegister} className="px-4 py-2 m-2 bg-blue-500 text-white font-bold rounded">Register</button>
      <button onClick={handleLogin} className="px-4 py-2 m-2 bg-green-500 text-white font-bold rounded">Login</button>
    </div>
  );
};

export default Menu;


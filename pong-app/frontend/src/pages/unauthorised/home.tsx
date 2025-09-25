// frontend/src/pages/menu.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  
  const handleStart = () => {
    navigate('/login');
  };

  return (
    <div
      className="w-full min-h-screen animate-bgMove flex items-center justify-center"
      style={{
        backgroundImage: "url(/background/home.png)",
        backgroundSize: "contain",
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 text-center px-6 bg-white/70 backdrop-blur-md rounded-xl p-6 shadow-2xl max-w-3xl mx-4">
        <h1 className="text-3xl md:text-5xl text-orange-600 font-extrabold mb-4 drop-shadow-lg leading-snug">
          🏓 Serve Fast, Play Smart <br />
          Win Big! 🏓
        </h1>
        <p className="text-base md:text-lg mb-6 text-gray-800 font-medium">
          ⚡ Smash harder. Think faster.
          <br />
          📈 The leaderboard remembers. Will you be on top? 
          <br />
          🏅 Only the elite survive these tables.
          <br />
          🥊 Outsmart Your Opponent with Every Shot!
          <br />
          🚀 Ready to Rally? Click Start and Let's Go!
        </p>

        <button
          onClick={handleStart}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition shadow-lg"
          aria-label="Log in"
        >
          🎟 Start Game!
        </button>
      </div>
    </div>
  );
};

export default Menu;

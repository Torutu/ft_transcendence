// frontend/src/pages/home.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [stars, setStars] = useState<{ x: number; y: number; char: string }[]>([]);

  useEffect(() => {
    const starChars = ["*", "+", "•", "✦", "✧"];
    const newStars = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * 100, // percentage
      y: Math.random() * 100, // percentage
      char: starChars[Math.floor(Math.random() * starChars.length)],
    }));
    setStars(newStars);
  }, []);

  const handleStart = () => {
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/background/default-gray.jpg"
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60"></div>

        {/* Stars */}
        {stars.map((star, idx) => (
          <div
            key={idx}
            className="absolute text-white text-sm animate-pulse"
            style={{
              top: `${star.y}%`,
              left: `${star.x}%`,
            }}
          >
            {star.char}
          </div>
        ))}
      </div>

      {/* Project Title */}
      <h1 className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent drop-shadow-lg text-center">
        ft_transcendence
      </h1>

      {/* Columns */}
      <div className="relative z-10 w-full max-w-5xl bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 p-8 flex flex-col md:flex-row gap-8">
        {/* Left Column — Ping Pong */}
        <div className="flex-1 flex flex-col justify-center items-center text-center md:text-left">
          <h2 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Ping Pong
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            3D Ping Pong, the ball speeds up with every hit,
            challenging your reflexes and timing as the rally gets faster and more intense.
            Can you stay on top?
          </p>
        </div>

        {/* Right Column — KeyClash */}
        <div className="flex-1 flex flex-col justify-center items-center text-center md:text-left">
          <h2 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            KeyClash
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Watch the arrows appear on screen,  
            hit them fast with <span className="font-semibold">WASD</span> or <span className="font-semibold">Arrow Keys</span>.  
            Rhythm, speed, and focus, clash your way to victory!
          </p>
        </div>
      </div>

      {/* Start Button */}
      <div className="relative z-10 mt-8">
        <button
          onClick={handleStart}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white text-xl font-bold rounded-xl shadow-xl"
        >
          🚀 Start Playing
        </button>
      </div>
    </div>
  );
};

export default Home;

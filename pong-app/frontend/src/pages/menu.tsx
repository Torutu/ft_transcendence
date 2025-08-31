import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css'; // Ensure styles are imported
import { isAuthenticated } from '../utils/auth';




const Menu: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    if (isAuthenticated()) {
      navigate('/lobby');
    } else {
      navigate('/login');
    }
  }

  return (
    // <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-80 z-10">
    //   <Link
    //     to="/play"
    //     className="px-4 py-2 m-2 bg-white text-black font-bold rounded inline-block text-center"
    //   >
    //     Play as guest
    //   </Link>

    //   <Link
    //     to="/register"
    //     className="px-4 py-2 m-2 bg-blue-500 text-white font-bold rounded inline-block text-center"
    //   >
    //     Register
    //   </Link>

    //   <Link
    //     to="/login"
    //     className="px-4 py-2 m-2 bg-green-500 text-white font-bold rounded inline-block text-center"
    //   >
    //     Login
    //   </Link>
    // </div> 



      <div
      className="w-full h-screen bg-cover bg-center animate-bgMove"
      style={{
        backgroundImage: "url(/background/home1-bg.png)",
        backgroundSize: "contain",
        backgroundPosition: "center",
      }}
    >
      <div className="relative h-screen w-full flex flex-col items-center justify-center text-gray-900">
        <div className="relative z-10 text-center px-6 bg-white bg-opacity-50 backdrop-blur-md rounded-xl p-6 shadow-2xl flex flex-col justify-center items-center">
          <h1 className="text-5xl md:text-5xl text-orange-600 text-center font-extrabold mb-4 drop-shadow-lg">
              🏓 Serve Fast, Play Smart <br />
              Win Big! 🏓
          </h1>
          <p className="text-lg md:text-lg max-w-2xl mx-auto mb-6 text-gray-800 font-medium">
            ⚡ Smash harder. Think faster.
            <br />
            📈 The leaderboard remembers. Will you be on top? 
            <br />
            🏅 Only the elite survive these tables.
            <br />
            🥊 Outsmart Your Opponent with Every Shot!
            <br />
            🚀 Ready to Rally? Click Start and Let's Go!
            <br />
          </p>

          <div className="flex justify-center">
            <button
              onClick={handleStart}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition shadow-lg"
              aria-label="Log in"
            >
              🎟 Start Game!
            </button>
          </div>
        </div>
      </div>
    </div>



  );
};

export default Menu;
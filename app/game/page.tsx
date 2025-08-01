"use client";

import Game from "../components/Game";

const GamePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            Perspective Racer
          </h1>
          <p className="text-gray-300 text-lg">
            Navigate the track at high speeds. Avoid going off-road!
          </p>
        </div>

        <div className="bg-black rounded-xl shadow-2xl border-4 border-gray-700 overflow-hidden">
          <Game showShip={true} />
        </div>

        <div className="mt-6 text-center text-gray-400">
          <p className="mb-2">Use ← → arrow keys or A/D to steer</p>
          <div className="flex justify-center space-x-6">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Restart Game
            </button>
            <a 
              href="/" 
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;

"use client";

import { useState, useEffect } from "react";
import Game from "../components/Game";

const GamePage: React.FC = () => {
  const [score, setScore] = useState(0);

  // Incrémenter le score chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setScore((prevScore) => prevScore + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-base-200 flex flex-col items-center justify-center">
      {/* Score affiché en haut */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-2xl font-bold">
        Score: {score}
      </div>

      <div className="relative min-h-screen bg-base-200 flex flex-col items-center justify-center">
        {/* Canvas avec dimensions ajustées et centré */}
        <div className="p-6 w-[90vw] h-[80vh] bg-black shadow-lg rounded-lg border-4 border-gray-300 flex items-center justify-center">
          <Game showShip={true} showScore={true} />{" "}
          {/* Afficher le vaisseau et le score */}
        </div>
      </div>
    </div>
  );
};

export default GamePage;

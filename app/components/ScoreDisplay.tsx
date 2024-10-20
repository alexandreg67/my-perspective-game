import React from "react";

interface ScoreDisplayProps {
  score: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-2xl font-bold">
      Score: {score}
    </div>
  );
};

export default ScoreDisplay;

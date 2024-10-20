import Link from "next/link";
import Game from "./components/Game";

export default function Home() {
  return (
    <main className="min-h-screen bg-base-200 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary">
          Welcome to the Racing Game!
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Test your reflexes and enjoy the ride!
        </p>
      </div>

      {/* Restaurer le style initial pour le canvas */}
      <div
        className="p-6 bg-black shadow-lg rounded-lg border border-gray-300"
        style={{ width: "600px", height: "400px" }}
      >
        <Game
          showShip={false}
          showScore={false}
          canvasWidth={600}
          canvasHeight={400}
        />{" "}
        {/* Ajustement du canvas */}
      </div>

      <div className="mt-8">
        <Link href="/game">Start Game</Link>
      </div>
    </main>
  );
}

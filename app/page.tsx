import Game from "./components/Game";

export default function Home() {
  return (
    <main className="min-h-screen bg-base-200 flex flex-col items-center justify-center">
      {/* Section titre */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary">
          Welcome to the Racing Game!
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Test your reflexes and enjoy the ride!
        </p>
      </div>

      {/* Section jeu avec fond noir */}
      <div className="p-6 bg-black shadow-lg rounded-lg border border-gray-300">
        <Game />
      </div>

      {/* Section avec boutons ou instructions */}
      <div className="mt-8">
        <button className="btn btn-primary">Start Game</button>
      </div>
    </main>
  );
}

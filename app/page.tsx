import Link from "next/link";
import Game from "./components/Game";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6">
          Perspective Racer
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Experience the thrill of high-speed racing with stunning 3D-like visuals in a 2D canvas game.
          Navigate challenging tracks and push your reflexes to the limit!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-blue-400 mb-2">Immersive 3D Perspective</h3>
            <p className="text-gray-300">
              Experience realistic depth with our advanced perspective rendering engine.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-purple-400 mb-2">Dynamic Difficulty</h3>
            <p className="text-gray-300">
              Speed increases as you progress, challenging your skills at every turn.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-green-400 mb-2">Visual Effects</h3>
            <p className="text-gray-300">
              Stunning particle effects and visual feedback enhance gameplay.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mb-10">
        <div className="bg-black rounded-xl shadow-2xl border-4 border-gray-700 overflow-hidden">
          <Game showShip={false} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <Link 
          href="/game" 
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-xl transition-all transform hover:scale-105 text-center"
        >
          Start Racing
        </Link>
        <a 
          href="https://github.com/alexandreg67/my-perspective-game" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-xl transition text-center"
        >
          View Source Code
        </a>
      </div>

      <div className="mt-12 text-center text-gray-500">
        <p>Use ← → arrow keys or A/D to steer | Space to pause | R to restart</p>
      </div>
    </main>
  );
}

import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Heart, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';
import { MAX_HEALTH } from './constants';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('с тремя месяцами!)');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setHealth(MAX_HEALTH);
    setScore(0);
    setResetTrigger(prev => prev + 1);
  };

  const handleGameOver = (finalScore: number) => {
    setIsPlaying(false);
    setIsGameOver(true);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('dino-valentine-highscore', finalScore.toString());
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[800px]">
        
        {/* Header HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              {Array.from({ length: MAX_HEALTH }).map((_, i) => (
                <Heart 
                  key={i} 
                  fill={i < health ? "#FF1493" : "transparent"} 
                  className={`w-8 h-8 ${i < health ? "text-pink-600" : "text-gray-300"} transition-all`}
                />
              ))}
            </div>
            {health <= 2 && health > 0 && (
              <div className="flex items-center text-red-500 bg-white/80 px-2 py-1 rounded font-bold text-xs animate-pulse">
                <AlertTriangle size={16} className="mr-1"/> Я щя 200 буду(
              </div>
            )}
          </div>
          
          <div className="text-right flex flex-col items-end">
            <div className="text-2xl font-bold text-gray-700 font-mono">
              {score.toString().padStart(5, '0')}
            </div>
            <div className="text-xs text-gray-500 font-mono flex items-center">
              HI {highScore.toString().padStart(5, '0')} <Trophy size={10} className="ml-1"/>
            </div>
          </div>
        </div>

        {/* Game Canvas */}
        <GameCanvas 
          onGameOver={handleGameOver} 
          onScoreUpdate={setScore}
          onHealthUpdate={setHealth}
          isPlaying={isPlaying}
          resetTrigger={resetTrigger}
        />

        {/* Main Menu Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-pink-100/80 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-20">
            <h1 className="text-4xl md:text-5xl font-bold text-pink-600 mb-2 text-center drop-shadow-md" style={{ fontFamily: '"Press Start 2P", cursive' }}>
              С ТРЕМЯ МЕСЯЦАМИ ВМЕСЕ С ТОБООЙ❤️
            </h1>
            <p className="text-gray-600 mb-8 text-center max-w-md px-4">
              Беги вместе со мной! Не дай левым с дв все испортить.
              Собирай красные стрелочки чтобы поднять уровень HP.
            </p>
            <div className="flex flex-col items-center gap-4">
               <button 
                onClick={startGame}
                onTouchStart={(e) => { e.stopPropagation(); startGame(); }}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                НАЧАТЬ
              </button>
              <div className="text-xs text-gray-500 mt-4">
                Я тебя люблю!❤️
              </div>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-20 text-white">
            <h2 className="text-3xl font-bold mb-4 text-pink-300">Конец игры</h2>
            <div className="text-center mb-8">
              <p className="text-gray-300 mb-1">Пройдено вместе</p>
              <p className="text-4xl font-mono text-white">{score}</p>
            </div>
            <button 
              onClick={startGame}
              onTouchStart={(e) => { e.stopPropagation(); startGame(); }}
              className="bg-white text-pink-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <RefreshCw size={20} /> Попробуй еще раз)
            </button>
          </div>
        )}
      </div>
      
      
    </div>
  );
}

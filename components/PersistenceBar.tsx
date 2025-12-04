import React from 'react';

interface PersistenceBarProps {
  progress: number;
  intensity: number;
}

export const PersistenceBar: React.FC<PersistenceBarProps> = ({ progress, intensity }) => {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 h-64 w-2 md:w-3 z-40 bg-white/5 rounded-full overflow-hidden border border-white/10">
      {/* Background fill based on progress */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300 ease-out"
        style={{ 
          height: `${progress * 100}%`,
          opacity: 0.3
        }}
      />
      
      {/* Active Intensity Indicator (The 'Spirit') */}
      <div 
        className="absolute bottom-0 left-0 right-0 w-full transition-all duration-75 ease-out shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{
          height: '4px',
          bottom: `${progress * 100}%`,
          backgroundColor: `hsl(${200 + (intensity * 60)}, 100%, 70%)`, // Cool blue to warm purple/white
          transform: `scaleX(${1 + intensity})`,
          opacity: intensity > 0.01 ? 1 : 0
        }}
      />
    </div>
  );
};

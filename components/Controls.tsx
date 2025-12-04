import React, { useRef } from 'react';
import { Upload, Play, Pause, RefreshCw, Music } from 'lucide-react';
import { AudioState } from '../types';

interface ControlsProps {
  audioState: AudioState;
  onUpload: (file: File) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ audioState, onUpload, onTogglePlay, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-6 md:p-8 flex flex-col items-center justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto transition-opacity duration-500 hover:opacity-100 opacity-90">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Control Cluster */}
      <div className="flex items-center gap-6 backdrop-blur-md bg-white/5 border border-white/10 p-4 rounded-full shadow-2xl">
        
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all tooltip"
          title="Upload Audio"
        >
          <Upload size={24} />
        </button>

        {/* Play/Pause (Only if ready) */}
        {audioState.isReady ? (
          <button
            onClick={onTogglePlay}
            className={`p-4 rounded-full transition-all shadow-lg transform active:scale-95 ${
              audioState.isFinished 
              ? 'bg-green-600 text-white hover:bg-green-500' 
              : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            {audioState.isFinished ? <RefreshCw size={32} /> : (
               audioState.isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />
            )}
          </button>
        ) : (
          <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center">
             <Music size={24} className="text-white/20 animate-pulse" />
          </div>
        )}

        {/* Info / Reset */}
        {audioState.isReady && (
           <div className="flex flex-col text-xs text-neutral-400 font-mono w-24">
             <div className="flex justify-between">
               <span>{formatTime(audioState.currentTime)}</span>
               <span>{formatTime(audioState.duration)}</span>
             </div>
             {/* Progress Bar Mini */}
             <div className="w-full h-1 bg-white/10 mt-1 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-300" 
                 style={{ width: `${audioState.progress * 100}%` }}
               />
             </div>
           </div>
        )}
      </div>

      {!audioState.isReady && (
        <p className="mt-4 text-sm text-neutral-500 animate-pulse">
          Upload an audio file to begin the ascent.
        </p>
      )}
    </div>
  );
};

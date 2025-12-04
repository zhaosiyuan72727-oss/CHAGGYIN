import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioState, AudioVisualizerHook } from '../types';
import { SMOOTHING_TIME_CONSTANT, FFT_SIZE } from '../constants';

export const useAudioAnalyzer = (): AudioVisualizerHook => {
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    progress: 0,
    intensity: 0,
    duration: 0,
    currentTime: 0,
    isReady: false,
    isFinished: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Audio Context on first interaction or load
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const loadAudio = useCallback(async (file: File) => {
    initAudioContext();
    if (!audioContextRef.current) return;

    setAudioState(prev => ({ ...prev, isReady: false, isPlaying: false, progress: 0, isFinished: false }));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = decodedBuffer;
      
      setAudioState(prev => ({ 
        ...prev, 
        isReady: true, 
        duration: decodedBuffer.duration 
      }));
    } catch (error) {
      console.error("Error decoding audio data", error);
      alert("Failed to decode audio file.");
    }
  }, [initAudioContext]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    // Resume context if needed
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Create source node
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;

    // Create analyzer
    const analyzer = audioContextRef.current.createAnalyser();
    analyzer.fftSize = FFT_SIZE;
    analyzer.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
    
    // Connect nodes: Source -> Analyzer -> Destination (Speakers)
    source.connect(analyzer);
    analyzer.connect(audioContextRef.current.destination);

    sourceNodeRef.current = source;
    analyzerRef.current = analyzer;

    // Handle Playback Time
    const offset = pausedAtRef.current;
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    
    source.start(0, offset);
    
    setAudioState(prev => ({ ...prev, isPlaying: true, isFinished: false }));

    source.onended = () => {
      // Check if it ended because it finished or because we stopped it
      // We do a rough check on duration
      const duration = audioBufferRef.current?.duration || 0;
      const elapsed = audioContextRef.current!.currentTime - startTimeRef.current;
      
      if (elapsed >= duration - 0.1) {
         setAudioState(prev => ({ ...prev, isPlaying: false, progress: 1, isFinished: true, intensity: 0 }));
         stopAudio();
         pausedAtRef.current = 0; // Reset for replay
      }
    };

    // Animation Loop for Analysis
    const update = () => {
      if (!analyzerRef.current || !audioContextRef.current || !audioBufferRef.current) return;

      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);

      // Calculate RMS (Intensity)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedIntensity = Math.min(rms / 128, 1); // Normalize roughly 0-1

      // Calculate Progress
      const currentTime = audioContextRef.current.currentTime - startTimeRef.current;
      const duration = audioBufferRef.current.duration;
      const progress = Math.min(Math.max(currentTime / duration, 0), 1);

      setAudioState(prev => ({
        ...prev,
        intensity: normalizedIntensity,
        progress: progress,
        currentTime: currentTime
      }));

      animationFrameRef.current = requestAnimationFrame(update);
    };

    update();

  }, [stopAudio]);

  const pause = useCallback(() => {
    if (!audioContextRef.current) return;
    stopAudio();
    // Save the time where we paused
    pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
    setAudioState(prev => ({ ...prev, isPlaying: false, intensity: 0 }));
  }, [stopAudio]);

  const togglePlay = useCallback(() => {
    if (audioState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [audioState.isPlaying, play, pause]);

  const reset = useCallback(() => {
    stopAudio();
    pausedAtRef.current = 0;
    setAudioState(prev => ({
      ...prev,
      isPlaying: false,
      progress: 0,
      intensity: 0,
      currentTime: 0,
      isFinished: false
    }));
  }, [stopAudio]);

  const seek = useCallback((newProgress: number) => {
      if (!audioBufferRef.current) return;
      const wasPlaying = audioState.isPlaying;
      stopAudio();
      
      const newTime = newProgress * audioBufferRef.current.duration;
      pausedAtRef.current = newTime;
      
      setAudioState(prev => ({ ...prev, progress: newProgress, currentTime: newTime, isFinished: false }));
      
      if (wasPlaying) {
          play();
      }
  }, [audioState.isPlaying, stopAudio, play]);


  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopAudio]);

  return {
    audioState,
    loadAudio,
    togglePlay,
    seek,
    reset
  };
};

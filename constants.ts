import { FragmentType } from "./types";

// Physics & Feel
export const PHYSICS = {
  tension: 0.008, // How strongly it pulls towards mouse (lower = looser)
  friction: 0.94, // How much it slows down (higher = slipperier)
  randomness: 0.5, // Random jitter intensity
  maxSpeed: 12,
  historyLength: 600, // Max trail length (or keep infinite if we want a full mess)
  fragmentSpawnCount: 25,
  collectDistance: 25,
  winThreshold: 12, // Number of fragments to collect to end game
};

// Visuals
export const COLORS = {
  background: '#f7f5f0', // Paper
  ink: '#2c2c2c', // Main line color
  inkFaded: 'rgba(44, 44, 44, 0.2)',
  
  // Fragment Type Colors (Muted/Pastel)
  GEOMETRIC: '#5D8AA8', // Air Force Blue (Muted)
  ORGANIC: '#D291BC', // Orchid (Muted Pink)
  ANALYTICAL: '#708090', // Slate Grey
  CHAOTIC: '#C04000', // Mahogany (Muted Red)
};

export const FRAGMENT_TYPES: FragmentType[] = ['GEOMETRIC', 'ORGANIC', 'ANALYTICAL', 'CHAOTIC'];

// Audio Analysis
export const SMOOTHING_TIME_CONSTANT = 0.8;
export const FFT_SIZE = 2048;

// Visualizer Configuration
export const VISUAL_CONFIG = {
  avalancheThreshold: 0.8, // Intensity threshold
  silenceDuration: 2000, // ms
  shakeAmount: 10,
  boostFactor: 0.1, // How much intensity advances progress visually
  
  // Colors
  skyTopCalm: '#0f172a', // Night Slate
  skyTopIntense: '#312e81', // Indigo
  skyBottomCalm: '#1e293b',
  skyBottomIntense: '#4c1d95',
  
  daySkyTop: '#0ea5e9', // Sky Blue
  daySkyBottom: '#bae6fd', // Light Blue
  
  mountainBackground: '#0f172a',
  mountainForeground: '#1e293b',
  dayMountainBackground: '#64748b',
  dayMountainForeground: '#334155',
  
  sunColor: '#fbbf24',
  sunGlow: '#f59e0b',
  
  climberColor: '#e2e8f0',
  climberBaseSize: 4,
  
  summitGlow: '#fcd34d'
};
export type FragmentType = 'GEOMETRIC' | 'ORGANIC' | 'ANALYTICAL' | 'CHAOTIC';

export interface Point {
  x: number;
  y: number;
}

export interface Fragment {
  id: string;
  x: number;
  y: number;
  type: FragmentType;
  angle: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  scale: number;
}

export interface Inventory {
  GEOMETRIC: number;
  ORGANIC: number;
  ANALYTICAL: number;
  CHAOTIC: number;
}

export interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  history: Point[];
  attachedFragments: FragmentType[]; // Visual decoration only
}

export interface GameConfig {
  winThreshold: number; // Number of fragments needed to find a head
}

export type HeadStyle = 'MINIMAL' | 'EXPRESSIVE' | 'ANALYTICAL' | 'CHAOTIC' | 'NONE';

export interface AudioState {
  isPlaying: boolean;
  progress: number;
  intensity: number;
  duration: number;
  currentTime: number;
  isReady: boolean;
  isFinished: boolean;
}

export interface AudioVisualizerHook {
  audioState: AudioState;
  loadAudio: (file: File) => void;
  togglePlay: () => void;
  seek: (progress: number) => void;
  reset: () => void;
}
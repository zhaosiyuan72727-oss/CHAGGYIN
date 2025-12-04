
import React, { useRef, useEffect, useState } from 'react';
import { VISUAL_CONFIG } from '../constants';

interface VisualizerLayerProps {
  progress: number;
  intensity: number;
  isPlaying: boolean;
  isFinished: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

// Procedural Mountain Generator
// Returns height (0.0 to 1.0) for a given X coordinate (0.0 to 1.0)
const getMountainHeight = (xNorm: number, seedOffset: number) => {
  // Base slope: goes from 0.9 (screen bottom) to 0.2 (screen top)
  const slope = 0.9 - (xNorm * 0.7);
  
  // Add noise for rocky texture
  const noise = 
    Math.sin(xNorm * 10 + seedOffset) * 0.05 + 
    Math.sin(xNorm * 23 + seedOffset) * 0.02 + 
    Math.sin(xNorm * 50 + seedOffset) * 0.01;
    
  return slope + noise;
};

export const VisualizerLayer: React.FC<VisualizerLayerProps> = ({ progress, intensity, isPlaying, isFinished }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const mountTime = useRef(Date.now());
  
  // Physics / Animation State
  const silenceStartRef = useRef<number>(0);
  const avalancheParticlesRef = useRef<Particle[]>([]);
  const sunriseMixRef = useRef<number>(0); // 0.0 (Night) -> 1.0 (Day)
  const lastTimeRef = useRef<number>(Date.now());

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();
    lastTimeRef.current = now;

    // --- Helper: Linear Color Interpolation ---
    const lerpColor = (a: string, b: string, amount: number) => {
      const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);
      return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
    };

    // --- 1. State Logic ---
    
    // A) Sunrise Transition (when finished)
    if (isFinished) {
      sunriseMixRef.current = Math.min(sunriseMixRef.current + 0.005, 1.0); // Slow fade to day
    } else if (progress < 0.1) {
      sunriseMixRef.current = 0; // Reset if restarting
    }

    const dayFactor = sunriseMixRef.current; // 0 = Night, 1 = Day

    // B) Avalanche (Silence Detection)
    let isAvalanche = false;
    if (isPlaying && !isFinished) {
      if (intensity < VISUAL_CONFIG.avalancheThreshold) {
        if (silenceStartRef.current === 0) {
          silenceStartRef.current = now;
        } else if (now - silenceStartRef.current > VISUAL_CONFIG.silenceDuration) {
          isAvalanche = true;
        }
      } else {
        silenceStartRef.current = 0; // Reset timer on breath
      }
    } else {
      silenceStartRef.current = 0;
    }

    // --- 2. Color Calculations ---
    
    // Night Mode Colors (Dynamic based on intensity)
    const nightTop = lerpColor(VISUAL_CONFIG.skyTopCalm, VISUAL_CONFIG.skyTopIntense, intensity);
    const nightBottom = lerpColor(VISUAL_CONFIG.skyBottomCalm, VISUAL_CONFIG.skyBottomIntense, intensity);
    
    // Blend Night -> Day
    const currentSkyTop = lerpColor(nightTop, VISUAL_CONFIG.daySkyTop, dayFactor);
    const currentSkyBottom = lerpColor(nightBottom, VISUAL_CONFIG.daySkyBottom, dayFactor);
    
    const currentMtnBg = lerpColor(VISUAL_CONFIG.mountainBackground, VISUAL_CONFIG.dayMountainBackground, dayFactor);
    const currentMtnFg = lerpColor(VISUAL_CONFIG.mountainForeground, VISUAL_CONFIG.dayMountainForeground, dayFactor);

    // --- 3. Camera / Shake ---
    // Less shake during the calm day
    const shakePower = ((intensity * VISUAL_CONFIG.shakeAmount) + (isAvalanche ? 5 : 0)) * (1 - dayFactor * 0.8);
    const shakeX = (Math.random() - 0.5) * shakePower;
    const shakeY = (Math.random() - 0.5) * shakePower;
    
    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    // --- 4. Draw Sky ---
    const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
    gradient.addColorStop(0, currentSkyTop);
    gradient.addColorStop(1, currentSkyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(-50, -50, dimensions.width + 100, dimensions.height + 100);

    // --- 5. The Sun (Only visible as day breaks) ---
    if (dayFactor > 0.01) {
      const sunY = dimensions.height * 0.4 - (dayFactor * dimensions.height * 0.2); // Rises slightly
      const sunX = dimensions.width * 0.8;
      
      // Glow
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 120);
      sunGlow.addColorStop(0, `${VISUAL_CONFIG.sunGlow}88`); // Transparent hex
      sunGlow.addColorStop(1, `${VISUAL_CONFIG.sunGlow}00`);
      ctx.fillStyle = sunGlow;
      ctx.globalAlpha = dayFactor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = VISUAL_CONFIG.sunColor;
      ctx.shadowColor = VISUAL_CONFIG.sunGlow;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    }

    // --- 6. Ambient Dust / Stars (Fade out during day) ---
    ctx.fillStyle = 'white';
    const time = (Date.now() - mountTime.current) / 1000;
    // Only draw stars if it's not fully day
    if (dayFactor < 1.0) {
      for(let k=0; k<40; k++) {
         // Parallax stars
         const px = (k * 123 + time * 10) % dimensions.width;
         const py = (k * 234) % (dimensions.height * 0.8);
         const size = Math.random() * 2;
         // Stars flicker with intensity, fade with dayFactor
         ctx.globalAlpha = (0.3 + Math.random() * 0.5) * (1 - dayFactor); 
         ctx.beginPath();
         ctx.arc(px, py, size, 0, Math.PI*2);
         ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // --- 7. Background Mountains (Parallax) ---
    ctx.beginPath();
    ctx.fillStyle = currentMtnBg;
    ctx.moveTo(0, dimensions.height);
    for (let i = 0; i <= dimensions.width; i += 10) {
      const xNorm = i / dimensions.width;
      const parallaxX = xNorm + (progress * 0.2); 
      const yNorm = getMountainHeight(parallaxX, 100) + 0.1;
      ctx.lineTo(i, yNorm * dimensions.height);
    }
    ctx.lineTo(dimensions.width, dimensions.height);
    ctx.fill();

    // --- 8. Foreground Mountain (The Path) ---
    ctx.beginPath();
    ctx.fillStyle = currentMtnFg;
    ctx.moveTo(0, dimensions.height);
    for (let i = 0; i <= dimensions.width; i += 5) {
      const xNorm = i / dimensions.width;
      const yNorm = getMountainHeight(xNorm, 0);
      ctx.lineTo(i, yNorm * dimensions.height);
    }
    ctx.lineTo(dimensions.width, dimensions.height);
    ctx.fill();

    // --- 9. Avalanche Particles ---
    if (isAvalanche) {
      for (let i = 0; i < 2; i++) {
        const spawnXNorm = 0.2 + Math.random() * 0.8; 
        const spawnYNorm = getMountainHeight(spawnXNorm, 0);
        
        avalancheParticlesRef.current.push({
          x: spawnXNorm * dimensions.width,
          y: spawnYNorm * dimensions.height - 5,
          vx: (Math.random() - 0.5) * 2,
          vy: 0,
          size: 2 + Math.random() * 3,
          life: 1.0
        });
      }
    }

    ctx.fillStyle = '#e2e8f0'; 
    for (let i = avalancheParticlesRef.current.length - 1; i >= 0; i--) {
      const p = avalancheParticlesRef.current[i];
      p.vy += 0.5; 
      p.x += p.vx;
      p.y += p.vy;
      
      const currentXNorm = p.x / dimensions.width;
      if (currentXNorm < 0 || currentXNorm > 1 || p.y > dimensions.height) {
        p.life = 0; 
      } else {
        const groundY = getMountainHeight(currentXNorm, 0) * dimensions.height;
        if (p.y > groundY) {
          p.y = groundY;
          p.vy *= -0.4; 
          p.vx -= 0.5; 
        }
      }
      p.life -= 0.01;
      
      if (p.life <= 0) {
        avalancheParticlesRef.current.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.globalAlpha = p.life;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    // --- 10. The Climber ---
    const visualProgress = Math.min(progress + (intensity * VISUAL_CONFIG.boostFactor), 1.0);
    const climberX = visualProgress * dimensions.width;
    const climberYNorm = getMountainHeight(visualProgress, 0);
    
    // Alive Animation: Subtle bobbing motion independent of intensity
    const bobOffset = Math.sin(time * 3) * 1.5; // Up/down by 1.5px, ~3 rad/sec
    const climberY = (climberYNorm * dimensions.height) - bobOffset;

    // Climber Breath Aura (Subtler during day)
    const auraRadius = (VISUAL_CONFIG.climberBaseSize * 2) + (intensity * 30);
    const auraAlpha = (0.4 + intensity * 0.4) * (1 - dayFactor * 0.5);
    
    const auraGradient = ctx.createRadialGradient(climberX, climberY, 0, climberX, climberY, auraRadius);
    auraGradient.addColorStop(0, `rgba(255, 255, 255, ${auraAlpha})`);
    auraGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(climberX, climberY, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // Climber Body
    ctx.fillStyle = VISUAL_CONFIG.climberColor;
    ctx.beginPath();
    ctx.arc(climberX, climberY, VISUAL_CONFIG.climberBaseSize, 0, Math.PI * 2);
    ctx.fill();

    // --- 11. Summit Marker / Flag ---
    if (progress > 0.8) {
      const summitX = dimensions.width;
      const summitY = getMountainHeight(1.0, 0) * dimensions.height;
      
      // Glow stronger at night, subtle at day
      ctx.strokeStyle = VISUAL_CONFIG.summitGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(summitX - 5, summitY - 20);
      ctx.lineTo(summitX - 5, summitY);
      ctx.stroke();
      
      // Flag top
      ctx.fillStyle = VISUAL_CONFIG.summitGlow;
      ctx.shadowColor = VISUAL_CONFIG.summitGlow;
      ctx.shadowBlur = 10 * (1 - dayFactor * 0.5);
      ctx.beginPath();
      ctx.arc(summitX - 5, summitY - 20, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();

  }, [dimensions, progress, intensity, isPlaying, isFinished]);

  return (
    <canvas 
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="fixed inset-0 z-0 bg-black"
    />
  );
};

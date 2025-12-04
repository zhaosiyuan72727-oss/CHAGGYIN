import React, { useEffect, useRef, useState } from 'react';
import { COLORS, FRAGMENT_TYPES, PHYSICS } from './constants';
import { Fly, Fragment, FragmentType, HeadStyle, Inventory } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // -- Game State Refs (Mutable for high-performance loop) --
  const flyRef = useRef<Fly>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    vx: 0,
    vy: 0,
    history: [],
    attachedFragments: []
  });
  
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const fragmentsRef = useRef<Fragment[]>([]);
  const inventoryRef = useRef<Inventory>({ GEOMETRIC: 0, ORGANIC: 0, ANALYTICAL: 0, CHAOTIC: 0 });
  
  // -- React State for UI Overlay --
  const [gameState, setGameState] = useState<'PLAYING' | 'ENDED'>('PLAYING');
  const [finalHead, setFinalHead] = useState<HeadStyle>('NONE');
  const [inventorySnapshot, setInventorySnapshot] = useState<Inventory | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // Spawn Fragments
    const newFragments: Fragment[] = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    for (let i = 0; i < PHYSICS.fragmentSpawnCount; i++) {
      newFragments.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * (w - 100) + 50,
        y: Math.random() * (h - 100) + 50,
        type: FRAGMENT_TYPES[Math.floor(Math.random() * FRAGMENT_TYPES.length)],
        angle: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobbleOffset: Math.random() * 10,
        scale: 0.8 + Math.random() * 0.4
      });
    }
    fragmentsRef.current = newFragments;

    // Reset Fly
    flyRef.current = {
      x: w / 2,
      y: h / 2,
      vx: 0,
      vy: 0,
      history: [],
      attachedFragments: []
    };
    
    mouseRef.current = { x: w / 2, y: h / 2 };
    
  }, []);

  // --- Input Handling ---
  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  // --- Helper: Determine Head ---
  const determineHead = (inv: Inventory): HeadStyle => {
    let maxVal = -1;
    let maxType: FragmentType | 'MIXED' = 'MIXED';
    let distinctLeaders = 0;

    (Object.keys(inv) as FragmentType[]).forEach((type) => {
      if (inv[type] > maxVal) {
        maxVal = inv[type];
        maxType = type;
        distinctLeaders = 1;
      } else if (inv[type] === maxVal) {
        distinctLeaders++;
      }
    });

    if (distinctLeaders > 1 || maxType === 'MIXED') return 'CHAOTIC';
    
    switch (maxType) {
      case 'GEOMETRIC': return 'MINIMAL';
      case 'ORGANIC': return 'EXPRESSIVE';
      case 'ANALYTICAL': return 'ANALYTICAL';
      case 'CHAOTIC': return 'CHAOTIC';
      default: return 'CHAOTIC';
    }
  };

  // --- Game Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 1;
      
      // 1. Update Canvas Size (simple responsiveness)
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // 2. Physics Update
      if (gameState === 'PLAYING') {
        const fly = flyRef.current;
        const target = mouseRef.current;

        // Force: Pull towards mouse
        const dx = target.x - fly.x;
        const dy = target.y - fly.y;
        
        fly.vx += dx * PHYSICS.tension;
        fly.vy += dy * PHYSICS.tension;

        // Friction
        fly.vx *= PHYSICS.friction;
        fly.vy *= PHYSICS.friction;

        // Random Drift (The "Headless" confusion)
        fly.vx += (Math.random() - 0.5) * PHYSICS.randomness;
        fly.vy += (Math.random() - 0.5) * PHYSICS.randomness;

        // Update Position
        fly.x += fly.vx;
        fly.y += fly.vy;

        // Record History (Throttle slightly to keep line jagged/sketchy)
        if (time % 2 === 0) {
          fly.history.push({ x: fly.x, y: fly.y });
          // Optional: Limit history length for performance, or keep it for full mess
          // if (fly.history.length > 2000) fly.history.shift();
        }

        // Check Collisions
        for (let i = fragmentsRef.current.length - 1; i >= 0; i--) {
          const frag = fragmentsRef.current[i];
          const dist = Math.hypot(fly.x - frag.x, fly.y - frag.y);
          
          if (dist < PHYSICS.collectDistance) {
            // Collect!
            fragmentsRef.current.splice(i, 1);
            inventoryRef.current[frag.type]++;
            fly.attachedFragments.push(frag.type);
            
            // Check Win Condition
            const totalCollected = Object.values(inventoryRef.current).reduce((a: number, b: number) => a + b, 0);
            if (totalCollected >= PHYSICS.winThreshold) {
              setGameState('ENDED');
              const head = determineHead(inventoryRef.current);
              setFinalHead(head);
              setInventorySnapshot({ ...inventoryRef.current });
            }
          }
        }
      } else {
        // ENDED State Physics: Slow Stop
        const fly = flyRef.current;
        fly.vx *= 0.90;
        fly.vy *= 0.90;
        fly.x += fly.vx;
        fly.y += fly.vy;
      }

      // 3. Drawing
      // Clear Background
      ctx.fillStyle = gameState === 'ENDED' ? '#e8e6e1' : COLORS.background; // Slightly dimmer if ended
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid (Subtle graph paper feel)
      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
      for (let y = 0; y < canvas.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
      ctx.stroke();

      // Draw Path
      ctx.strokeStyle = gameState === 'ENDED' ? COLORS.ink : COLORS.inkFaded;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const hist = flyRef.current.history;
      if (hist.length > 0) {
        ctx.moveTo(hist[0].x, hist[0].y);
        // Draw with a slight wiggle to look hand-drawn
        for (let i = 1; i < hist.length; i++) {
           // Skip frames to make it look angular/sketchy
           if (i % 3 === 0 || i === hist.length - 1) {
             ctx.lineTo(hist[i].x, hist[i].y);
           }
        }
      }
      ctx.stroke();

      // Draw Fragments
      fragmentsRef.current.forEach(frag => {
        drawFragment(ctx, frag, time);
      });

      // Draw Fly Body
      drawFly(ctx, flyRef.current, time, gameState === 'ENDED' ? finalHead : 'NONE');

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, finalHead]); // Re-bind if game state changes

  // --- Drawing Helpers ---

  const drawFragment = (ctx: CanvasRenderingContext2D, frag: Fragment, time: number) => {
    ctx.save();
    // Float animation
    const floatY = Math.sin(time * frag.wobbleSpeed + frag.wobbleOffset) * 5;
    ctx.translate(frag.x, frag.y + floatY);
    ctx.rotate(frag.angle + Math.sin(time * 0.01) * 0.2);
    ctx.scale(frag.scale, frag.scale);

    ctx.strokeStyle = COLORS[frag.type];
    ctx.fillStyle = COLORS[frag.type] + '22'; // Low opacity fill
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (frag.type === 'GEOMETRIC') {
      ctx.rect(-10, -10, 20, 20);
    } else if (frag.type === 'ORGANIC') {
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
    } else if (frag.type === 'ANALYTICAL') {
      ctx.moveTo(-8, -8); ctx.lineTo(8, -8);
      ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
      ctx.moveTo(-8, 8); ctx.lineTo(8, 8);
    } else if (frag.type === 'CHAOTIC') {
      for(let i=0; i<5; i++) {
        const a = (i/5) * Math.PI * 2;
        ctx.lineTo(Math.cos(a)*12, Math.sin(a)*12);
        ctx.lineTo(Math.cos(a + 0.5)*5, Math.sin(a + 0.5)*5);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawFly = (ctx: CanvasRenderingContext2D, fly: Fly, time: number, head: HeadStyle) => {
    ctx.save();
    ctx.translate(fly.x, fly.y);
    
    // Rotate based on velocity
    const angle = Math.atan2(fly.vy, fly.vx);
    ctx.rotate(angle);

    // Wiggle effect for "sketchiness"
    const wiggle = Math.sin(time * 0.5) * 1;

    // Body (Headless)
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    // Oval body
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings (Fluttering)
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1;
    const wingFlap = Math.sin(time * 1.5) * 10;
    
    // Left Wing
    ctx.beginPath();
    ctx.ellipse(0, -8 + wiggle, 8, 4 + wingFlap/4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.ellipse(0, 8 + wiggle, 8, 4 - wingFlap/4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw Attached Inventory (tiny specks orbiting)
    if (head === 'NONE') {
        fly.attachedFragments.forEach((type, i) => {
            const orbitSpeed = 0.05 + (i * 0.01);
            const r = 20 + (i % 3) * 5;
            const ox = Math.cos(time * orbitSpeed + i) * r;
            const oy = Math.sin(time * orbitSpeed + i) * r;
            
            ctx.fillStyle = COLORS[type];
            ctx.beginPath();
            ctx.arc(ox, oy, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // DRAW HEAD (If finished)
    if (head !== 'NONE') {
        // Position head at "front" (right side because of 0 rotation default)
        ctx.translate(12, 0); 
        ctx.rotate(-Math.PI / 2); // Orient upright relative to fly
        
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 2;
        ctx.fillStyle = '#fff';

        if (head === 'MINIMAL') {
            // Square head, clean
            ctx.fillStyle = COLORS.GEOMETRIC;
            ctx.fillRect(-8, -8, 16, 16);
            ctx.strokeRect(-8, -8, 16, 16);
        } else if (head === 'EXPRESSIVE') {
            // Big round blobby head
            ctx.fillStyle = COLORS.ORGANIC;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Eye
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(3, -3, 3, 0, Math.PI*2); ctx.fill();
        } else if (head === 'ANALYTICAL') {
            // Robot/Boxy
            ctx.fillStyle = COLORS.ANALYTICAL;
            ctx.beginPath();
            ctx.moveTo(-8, 8); ctx.lineTo(0, -10); ctx.lineTo(8, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Glasses lines
            ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        } else if (head === 'CHAOTIC') {
            // Crazy spiky
            ctx.fillStyle = COLORS.CHAOTIC;
            ctx.beginPath();
            for(let i=0; i<8; i++) {
                const a = (i/8)*Math.PI*2;
                const r = i%2===0 ? 12 : 6;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    ctx.restore();
  };

  return (
    <div className="relative w-full h-screen" onMouseMove={handleMouseMove}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none select-none">
         <h1 className="text-xl font-bold text-gray-800 tracking-tighter opacity-50">THE HEADLESS FLY</h1>
         {gameState === 'PLAYING' && (
             <p className="text-sm text-gray-500 mt-1">Collect ideas. Find a head.</p>
         )}
      </div>

      {gameState === 'ENDED' && inventorySnapshot && (
        <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none animate-in fade-in duration-1000">
           <div className="bg-white/80 backdrop-blur-sm inline-block px-8 py-6 rounded-sm border border-gray-300 shadow-xl">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">
                  {finalHead} DESIGNER
              </h2>
              <p className="text-gray-600 font-mono text-sm mb-4">
                  You wandered through the mess and found a style.
              </p>
              <div className="flex gap-4 justify-center text-xs text-gray-400 font-mono">
                  <span>GEO: {inventorySnapshot.GEOMETRIC}</span>
                  <span>ORG: {inventorySnapshot.ORGANIC}</span>
                  <span>ANA: {inventorySnapshot.ANALYTICAL}</span>
                  <span>CHA: {inventorySnapshot.CHAOTIC}</span>
              </div>
              <p className="mt-4 text-xs text-gray-400">Refresh to fly again</p>
           </div>
        </div>
      )}
    </div>
  );
}
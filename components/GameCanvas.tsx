import React, { useEffect, useRef } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GROUND_Y, 
  GRAVITY, 
  JUMP_STRENGTH, 
  COLORS, 
  DINO_WIDTH, 
  DINO_HEIGHT, 
  INITIAL_GAME_SPEED, 
  MAX_HEALTH, 
  SPEED_INCREMENT, 
  MAX_GAME_SPEED,
  DINO_DUCK_HEIGHT,
  PLAYER_X
} from '../constants';
import { Entity, EntityType, Particle, BackgroundElement, FloatingText } from '../types';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  onHealthUpdate: (health: number) => void;
  isPlaying: boolean;
  resetTrigger: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onGameOver, 
  onScoreUpdate, 
  onHealthUpdate,
  isPlaying, 
  resetTrigger 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Game State Refs
  const scoreRef = useRef<number>(0);
  const healthRef = useRef<number>(MAX_HEALTH);
  const speedRef = useRef<number>(INITIAL_GAME_SPEED);
  const breakupPhaseRef = useRef<boolean>(false);
  
  // Ref to track props in event listeners
  const isPlayingRef = useRef(isPlaying);

  const playerRef = useRef<Entity>({
    id: 0, type: EntityType.PLAYER, x: PLAYER_X, y: GROUND_Y - DINO_HEIGHT, 
    width: DINO_WIDTH, height: DINO_HEIGHT, vx: 0, vy: 0, frame: 0, active: true
  });
  
  const mateRef = useRef<Entity>({
    id: 1, type: EntityType.MATE, x: 20, y: GROUND_Y - DINO_HEIGHT, 
    width: DINO_WIDTH, height: DINO_HEIGHT, vx: 0, vy: 0, frame: 0, active: true
  });

  const obstaclesRef = useRef<Entity[]>([]);
  const powerupsRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cloudsRef = useRef<BackgroundElement[]>([]);
  const bgHeartsRef = useRef<BackgroundElement[]>([]);
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Spawn Timers
  const exCooldownRef = useRef<number>(0);
  const cupidCooldownRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);

  // Sync isPlayingRef
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // --- Audio ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'jump' | 'hit' | 'heal' | 'celebrate' | 'break') => {
    if (!audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'celebrate') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'break') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
    }
  };

  // --- Initialization ---

  const initGame = () => {
    scoreRef.current = 0;
    healthRef.current = MAX_HEALTH;
    speedRef.current = INITIAL_GAME_SPEED;
    lastTimeRef.current = performance.now();
    lastMilestoneRef.current = 0;
    breakupPhaseRef.current = false;
    
    playerRef.current = {
      id: 0, type: EntityType.PLAYER, x: PLAYER_X, y: GROUND_Y - DINO_HEIGHT, 
      width: DINO_WIDTH, height: DINO_HEIGHT, vx: 0, vy: 0, frame: 0, active: true
    };
    
    mateRef.current = {
      id: 1, type: EntityType.MATE, x: PLAYER_X - DINO_WIDTH - 10, y: GROUND_Y - DINO_HEIGHT, 
      width: DINO_WIDTH, height: DINO_HEIGHT, vx: 0, vy: 0, frame: 0, active: true
    };

    obstaclesRef.current = [];
    powerupsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    
    bgHeartsRef.current = Array.from({ length: 15 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      speed: 0.5 + Math.random() * 1.5,
      size: 5 + Math.random() * 15,
      opacity: 0.2 + Math.random() * 0.4
    }));
    
    cloudsRef.current = Array.from({ length: 4 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * (CANVAS_HEIGHT / 2.5),
      speed: 0.2 + Math.random() * 0.3,
      size: 40 + Math.random() * 30,
      opacity: 0.9
    }));

    onHealthUpdate(MAX_HEALTH);
    onScoreUpdate(0);
  };

  useEffect(() => {
    initGame();
  }, [resetTrigger]);

  // --- Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        initAudio();
        keysRef.current[e.code] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    
    const handleTouchStart = (e: TouchEvent) => {
        // IGNORE TOUCHES ON BUTTONS
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;

        if (e.cancelable) e.preventDefault(); 
        initAudio();
        
        // INSTANT VELOCITY IMPULSE (Zero Lag Physics)
        if (isPlayingRef.current && !breakupPhaseRef.current) {
            const player = playerRef.current;
            // Check if grounded (allow small margin for ground detection)
            if (player.y >= GROUND_Y - player.height - 5) {
                // Apply instant upward impulse
                player.vy = JUMP_STRENGTH;
                playSound('jump');
            }
        }
        // Note: We do NOT set keysRef for touch anymore to avoid polling lag
    };

    const handleTouchEnd = (e: TouchEvent) => {
        // Optional: Can implement variable jump height here by cutting velocity
        // For now, keep it simple
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // --- Logic Helpers ---

  const spawnObstacle = () => {
    let rightMostX = 0;
    obstaclesRef.current.forEach(o => { if (o.x > rightMostX) rightMostX = o.x; });
    projectilesRef.current.forEach(p => { if (p.x > rightMostX) rightMostX = p.x; });

    // Dynamic Difficulty Scaling
    const currentScore = Math.floor(scoreRef.current);
    let gapSpeedMultiplier = 18;
    let spawnThreshold = 0.98;

    if (currentScore > 1000) {
        gapSpeedMultiplier = 10;
        spawnThreshold = 0.94; // 6% chance per frame
    } else if (currentScore > 700) {
        gapSpeedMultiplier = 12;
        spawnThreshold = 0.95; // 5% chance per frame
    } else if (currentScore > 300) {
        gapSpeedMultiplier = 15;
        spawnThreshold = 0.97; // 3% chance per frame
    }

    // Min gap decreases as you get better, making obstacles tighter
    const minGap = 250 + (speedRef.current * gapSpeedMultiplier); 
    const distanceToLast = CANVAS_WIDTH - rightMostX;

    if (distanceToLast < minGap) return;

    if (Math.random() > spawnThreshold) {
      const type = Math.random() > 0.6 ? EntityType.CACTUS_LARGE : EntityType.CACTUS_SMALL;
      const width = type === EntityType.CACTUS_LARGE ? 50 : 34;
      const height = type === EntityType.CACTUS_LARGE ? 70 : 50;
      
      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        type,
        x: CANVAS_WIDTH + 50,
        y: GROUND_Y - height,
        width,
        height,
        vx: 0,
        vy: 0,
        frame: 0,
        active: true
      });
    }
  };

  const spawnTheEx = () => {
    if (exCooldownRef.current > 0) {
      exCooldownRef.current--;
      return;
    }

    let rightMostX = 0;
    obstaclesRef.current.forEach(o => { if (o.x > rightMostX) rightMostX = o.x; });
    const minGap = 300 + (speedRef.current * 10);
    if (CANVAS_WIDTH - rightMostX < minGap) return;

    if (Math.random() < 0.006 && scoreRef.current > 150) {
      const ex: Entity = {
        id: Date.now(),
        type: EntityType.THE_EX,
        x: CANVAS_WIDTH + 50,
        y: GROUND_Y - DINO_HEIGHT,
        width: DINO_WIDTH,
        height: DINO_HEIGHT,
        vx: 0,
        vy: 0,
        frame: 0,
        active: true,
      };
      obstaclesRef.current.push(ex);

      const throwSpeed = 10 + (speedRef.current * 0.3); 
      const chocolate: Entity = {
        id: Date.now() + 1,
        type: EntityType.CHOCOLATE,
        x: CANVAS_WIDTH + 50, 
        y: GROUND_Y - 90, 
        width: 24,
        height: 24,
        vx: -throwSpeed, 
        vy: -5,
        frame: 0,
        active: true
      };
      projectilesRef.current.push(chocolate);
      exCooldownRef.current = 500;
    }
  };

  const spawnCupid = () => {
    if (cupidCooldownRef.current > 0) {
      cupidCooldownRef.current--;
      return;
    }
    
    if (Math.random() < 0.008 && healthRef.current < MAX_HEALTH) {
       const lane = Math.random() > 0.5 ? 'low' : 'high';
       const spawnY = lane === 'low' 
         ? GROUND_Y - 35
         : GROUND_Y - DINO_HEIGHT - 60; 
       
       const arrow: Entity = {
         id: Date.now() + 1,
         type: EntityType.ARROW,
         x: CANVAS_WIDTH + 50,
         y: spawnY,
         width: 40,
         height: 12,
         vx: -(speedRef.current + 6),
         vy: 0,
         frame: 0,
         active: true
       };
       powerupsRef.current.push(arrow);
       cupidCooldownRef.current = 300;
    }
  };

  const createParticles = (x: number, y: number, color: string, count: number, isConfetti = false) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Date.now() + i,
        type: EntityType.PARTICLE,
        x: x,
        y: y,
        width: isConfetti ? 6 : 4,
        height: isConfetti ? 6 : 4,
        vx: (Math.random() - 0.5) * (isConfetti ? 15 : 12),
        vy: (Math.random() - 0.5) * (isConfetti ? 15 : 12),
        life: 1.0,
        maxLife: 1.0,
        frame: 0,
        active: true,
        color: isConfetti 
            ? ['#FFD700', '#FF69B4', '#00BFFF', '#32CD32', '#FF4500'][Math.floor(Math.random()*5)]
            : color
      });
    }
  };

  const checkCollision = (r1: Entity, r2: Entity) => {
    const pad = 8; 
    return (
      r1.x + pad < r2.x + r2.width - pad &&
      r1.x + r1.width - pad > r2.x + pad &&
      r1.y + pad < r2.y + r2.height - pad &&
      r1.y + r1.height - pad > r2.y + pad
    );
  };

  // --- Rendering ---

  const drawPixelDino = (ctx: CanvasRenderingContext2D, e: Entity, color: string) => {
      ctx.fillStyle = color;
      const { x, y, width: w, height: h } = e;
      const isDuck = h < DINO_HEIGHT;

      if (isDuck) {
        ctx.fillRect(x + w*0.4, y, w*0.6, h*0.4); // Head
        ctx.fillRect(x, y + h*0.2, w*0.6, h*0.5); // Body
        ctx.fillStyle = "white";
        ctx.fillRect(x + w*0.7, y + h*0.05, 4, 4); // Eye
        ctx.fillStyle = color;
      } else {
        ctx.fillRect(x + w*0.45, y, w*0.55, h*0.35); // Head
        ctx.fillStyle = "white";
        ctx.fillRect(x + w*0.75, y + h*0.06, 5, 5); // Eye
        ctx.fillStyle = color;
        ctx.fillRect(x + w*0.3, y + h*0.35, w*0.45, h*0.35); // Neck
        ctx.fillRect(x, y + h*0.45, w*0.55, h*0.35); // Body
        ctx.fillRect(x - 5, y + h*0.4, 10, h*0.1); // Tail
        ctx.fillRect(x + w*0.75, y + h*0.45, w*0.1, 5); // Arm
        ctx.fillRect(x + w*0.85, y + h*0.45, 5, 9);
      }

      const runFrame = Math.floor(Date.now() / 80) % 2; 
      
      if (e.y < GROUND_Y - e.height - 5) {
          ctx.fillRect(x + w*0.2, y + h*0.8, 8, 8);
          ctx.fillRect(x + w*0.5, y + h*0.8, 8, 8);
      } else {
          if (runFrame === 0) {
              ctx.fillRect(x + w*0.2, y + h*0.8, 8, h*0.2); 
              ctx.fillRect(x + w*0.5, y + h*0.8, 8, 5); 
          } else {
              ctx.fillRect(x + w*0.2, y + h*0.8, 8, 5); 
              ctx.fillRect(x + w*0.5, y + h*0.8, 8, h*0.2); 
          }
      }
      
      if (e.type === EntityType.MATE) {
          ctx.fillStyle = '#FF69B4'; // Bow
          ctx.fillRect(x + w*0.4, y - 5, 12, 8);
      }
  };

  const drawCactus = (ctx: CanvasRenderingContext2D, e: Entity) => {
     ctx.fillStyle = COLORS.CACTUS;
     const w = e.width;
     const h = e.height;
     ctx.fillRect(e.x + w*0.35, e.y, w*0.3, h);
     ctx.fillRect(e.x, e.y + h*0.3, w*0.2, 5);
     ctx.fillRect(e.x, e.y + h*0.15, 5, h*0.2);
     ctx.fillRect(e.x + w*0.65, e.y + h*0.4, w*0.2, 5);
     ctx.fillRect(e.x + w*0.85, e.y + h*0.2, 5, h*0.25);
  };

  // --- Game Loop ---

  const loop = (timestamp: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Time Delta
    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    const timeScale = dt / 16.67; 
    lastTimeRef.current = timestamp;

    if (isPlaying) {
      if (breakupPhaseRef.current) {
        // --- BREAKUP PHASE ---
        // 1. Move Mate Left
        mateRef.current.x -= 3 * timeScale; // Smooth walk away
        
        // 2. Update Particles/Text (so the heart emoji floats up)
        particlesRef.current.forEach(p => {
          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.life -= 0.02 * timeScale;
          if (p.life <= 0) p.active = false;
        });
        floatingTextsRef.current.forEach(ft => {
          ft.y += ft.vy * timeScale;
          ft.life -= 0.01 * timeScale;
        });

        // 3. Gravity for dinos (keep them grounded)
        if (playerRef.current.y < GROUND_Y - playerRef.current.height) {
            playerRef.current.vy += GRAVITY * timeScale;
            playerRef.current.y += playerRef.current.vy * timeScale;
        }

        // 4. Check if Mate left screen
        if (mateRef.current.x < -100) {
             onGameOver(Math.floor(scoreRef.current));
        }
      } else {
        // --- NORMAL GAME LOOP ---
        
        // 1. Update Game State
        scoreRef.current += (0.15 * timeScale); 
        if (Math.floor(scoreRef.current) % 10 === 0) onScoreUpdate(Math.floor(scoreRef.current));
        
        if (speedRef.current < MAX_GAME_SPEED) {
          speedRef.current += SPEED_INCREMENT * timeScale;
        }

        // --- Celebration Logic (Milestones) ---
        const currentScoreFloor = Math.floor(scoreRef.current);
        const milestone = 100;
        if (currentScoreFloor > 0 && currentScoreFloor % milestone === 0) {
          const milestoneStep = Math.floor(currentScoreFloor / milestone);
          if (milestoneStep > lastMilestoneRef.current) {
              lastMilestoneRef.current = milestoneStep;
              playSound('celebrate');
              createParticles(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, '', 50, true);
              const messages = ["Сигма!", "Любовь на всегда!", "+100 просто так", "АААЙ легеда", "Вместе навсегда!", "Насрите мне в кармашек!"];
              floatingTextsRef.current.push({
                  id: Date.now(),
                  x: CANVAS_WIDTH / 2,
                  y: 100,
                  text: messages[Math.floor(Math.random() * messages.length)],
                  life: 2.0, // seconds
                  color: '#FF1493',
                  vy: -1
              });
          }
        }

        // 2. Player Physics
        const player = playerRef.current;
        const isDucking = keysRef.current['ArrowDown'] || keysRef.current['KeyS'];
        const isJumping = keysRef.current['Space'] || keysRef.current['ArrowUp'] || keysRef.current['KeyW'];

        if (isDucking) {
          if (player.height !== DINO_DUCK_HEIGHT) {
              player.y += (DINO_HEIGHT - DINO_DUCK_HEIGHT);
              player.height = DINO_DUCK_HEIGHT;
          }
        } else {
          if (player.height !== DINO_HEIGHT && player.y + DINO_HEIGHT <= GROUND_Y) {
              player.y -= (DINO_HEIGHT - DINO_DUCK_HEIGHT);
              player.height = DINO_HEIGHT;
          } else if (player.height !== DINO_HEIGHT) {
              player.height = DINO_HEIGHT;
              player.y = GROUND_Y - DINO_HEIGHT;
          }
        }

        // Keyboard jump logic (Polling)
        if (isJumping && player.y >= GROUND_Y - player.height - 1) {
          player.vy = JUMP_STRENGTH;
          if (player.vy === JUMP_STRENGTH) playSound('jump');
        }

        player.y += player.vy * timeScale;
        player.vy += (GRAVITY * (isDucking ? 2.5 : 1)) * timeScale;

        if (player.y > GROUND_Y - player.height) {
          player.y = GROUND_Y - player.height;
          player.vy = 0;
        }

        // 3. Mate Logic
        const mate = mateRef.current;
        const health = healthRef.current;
        
        const maxMateX = PLAYER_X - DINO_WIDTH - 5;
        const minMateX = 20;
        const t = Math.max(0, (health - 1) / (MAX_HEALTH - 1)); 
        const targetX = minMateX + (maxMateX - minMateX) * t;
        
        mate.x += (targetX - mate.x) * 0.05 * timeScale;

        if (player.vy < 0 && mate.y >= GROUND_Y - mate.height - 1) {
            mate.vy = JUMP_STRENGTH;
        }
        mate.y += mate.vy * timeScale;
        mate.vy += GRAVITY * timeScale;
        if (mate.y > GROUND_Y - mate.height) {
            mate.y = GROUND_Y - mate.height;
            mate.vy = 0;
        }

        // 4. Spawners
        spawnObstacle();
        spawnTheEx();
        spawnCupid();

        // 5. Update Entities & Check Collisions
        obstaclesRef.current.forEach(o => {
            o.x -= speedRef.current * timeScale;
            if (o.x < -100) o.active = false;
            
            if (o.active && checkCollision(player, o)) {
                o.active = false;
                healthRef.current--;
                onHealthUpdate(healthRef.current);
                createParticles(player.x, player.y, '#555', 15);
                playSound('hit');
                // CHECK FOR BREAKUP (Instead of direct Game Over)
                if (healthRef.current <= 0 && !breakupPhaseRef.current) {
                    breakupPhaseRef.current = true;
                    playSound('break');
                    // Spawn 💔
                    floatingTextsRef.current.push({
                       id: Date.now(),
                       x: (player.x + mateRef.current.x)/2,
                       y: player.y - 60,
                       text: "💔",
                       life: 100, // Stay visible
                       color: "red",
                       vy: -0.5
                    });
                    createParticles((player.x + mateRef.current.x)/2, player.y - 40, COLORS.HEART_BROKEN, 20);
                }
            }
        });

        projectilesRef.current.forEach(p => {
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.vy += (GRAVITY * 0.3) * timeScale;
            
            if (p.y > GROUND_Y - p.height) {
                p.y = GROUND_Y - p.height;
                p.vy = -p.vy * 0.5; 
                p.vx = -speedRef.current; 
            }
            if (p.x < -100) p.active = false;

            if (p.active && checkCollision(player, p)) {
                p.active = false;
                healthRef.current--;
                onHealthUpdate(healthRef.current);
                createParticles(player.x, player.y, COLORS.CHOCOLATE, 15);
                playSound('hit');
                // CHECK FOR BREAKUP
                if (healthRef.current <= 0 && !breakupPhaseRef.current) {
                    breakupPhaseRef.current = true;
                    playSound('break');
                    floatingTextsRef.current.push({
                       id: Date.now(),
                       x: (player.x + mateRef.current.x)/2,
                       y: player.y - 60,
                       text: "💔",
                       life: 100,
                       color: "red",
                       vy: -0.5
                    });
                    createParticles((player.x + mateRef.current.x)/2, player.y - 40, COLORS.HEART_BROKEN, 20);
                }
            }
        });

        powerupsRef.current.forEach(p => {
            p.x += p.vx * timeScale;
            if (p.x < -100) p.active = false;
            
            if (p.active && checkCollision(player, p)) {
                p.active = false;
                playSound('heal');
                if (healthRef.current < MAX_HEALTH) {
                    healthRef.current++;
                    onHealthUpdate(healthRef.current);
                    createParticles(player.x, player.y, COLORS.HEART, 20);
                } else {
                    scoreRef.current += 100;
                    onScoreUpdate(Math.floor(scoreRef.current));
                    createParticles(player.x, player.y, COLORS.HEART, 10);
                }
            }
        });

        particlesRef.current.forEach(p => {
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.life -= 0.02 * timeScale;
            if (p.life <= 0) p.active = false;
        });

        floatingTextsRef.current.forEach(ft => {
            ft.y += ft.vy * timeScale;
            ft.life -= 0.01 * timeScale;
        });
        floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

        cloudsRef.current.forEach(c => {
            c.x -= c.speed * timeScale;
            if (c.x < -c.size) c.x = CANVAS_WIDTH + c.size;
        });
        bgHeartsRef.current.forEach(h => {
            h.y += h.speed * timeScale;
            h.x -= (speedRef.current * 0.1) * timeScale;
            if (h.y > CANVAS_HEIGHT) {
                h.y = -h.size;
                h.x = Math.random() * CANVAS_WIDTH;
            }
        });
        
        obstaclesRef.current = obstaclesRef.current.filter(e => e.active);
        projectilesRef.current = projectilesRef.current.filter(e => e.active);
        powerupsRef.current = powerupsRef.current.filter(e => e.active);
        particlesRef.current = particlesRef.current.filter(e => e.active);
      }
    }

    // --- Draw ---
    
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, COLORS.SKY_TOP);
    grad.addColorStop(1, COLORS.SKY_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // BG Hearts
    bgHeartsRef.current.forEach(h => {
        ctx.globalAlpha = h.opacity;
        ctx.fillStyle = COLORS.SKY_TOP === '#FFC0CB' ? '#FF69B4' : '#FFC0CB';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.size/2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Clouds
    ctx.fillStyle = "white";
    cloudsRef.current.forEach(c => {
        ctx.globalAlpha = c.opacity;
        ctx.fillRect(c.x, c.y, c.size * 2, c.size);
    });
    ctx.globalAlpha = 1.0;

    // Ground
    ctx.fillStyle = COLORS.GROUND;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);
    let gx = -(Math.floor(scoreRef.current * 10) % 100);
    while (gx < CANVAS_WIDTH) {
        ctx.fillRect(gx, GROUND_Y + 6, 20, 2);
        gx += 100;
    }

    // Entities
    drawPixelDino(ctx, mateRef.current, COLORS.DINO);
    drawPixelDino(ctx, playerRef.current, COLORS.DINO);

    obstaclesRef.current.forEach(o => {
      if (o.type === EntityType.THE_EX) {
        drawPixelDino(ctx, o, '#800080');
      } else {
        drawCactus(ctx, o);
      }
    });
    
    projectilesRef.current.forEach(p => {
        ctx.fillStyle = COLORS.CHOCOLATE;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x + p.width/2 - 2, p.y, 4, p.height);
    });

    powerupsRef.current.forEach(p => {
        ctx.fillStyle = COLORS.ARROW;
        ctx.fillRect(p.x, p.y + 4, p.width, 4); 
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 6);
        ctx.lineTo(p.x + 10, p.y);
        ctx.lineTo(p.x + 10, p.y + 12);
        ctx.fill();
    });

    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color || 'black';
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    ctx.globalAlpha = 1.0;

    // Floating Texts (Celebrations)
    floatingTextsRef.current.forEach(ft => {
        ctx.globalAlpha = Math.min(1.0, ft.life * 2);
        ctx.fillStyle = ft.color;
        // Larger font for broken heart emoji
        if (ft.text === "💔") {
           ctx.font = '60px serif';
        } else {
           ctx.font = 'bold 20px "Press Start 2P"';
        }
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        // Stroke for readability
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1.0;

    // Bond Line (ONLY if not breaking up)
    if (!breakupPhaseRef.current) {
        const dist = Math.abs(playerRef.current.x - mateRef.current.x);
        if (dist < 300) {
            const alpha = Math.max(0, 1 - (dist / 300)) * 0.6;
            ctx.strokeStyle = `rgba(255, 105, 180, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(mateRef.current.x + mateRef.current.width, mateRef.current.y + mateRef.current.height/2);
            ctx.lineTo(playerRef.current.x, playerRef.current.y + playerRef.current.height/2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-4 border-pink-300 rounded-lg shadow-2xl bg-white touch-none"
      style={{ width: '100%', maxWidth: '800px', imageRendering: 'pixelated' }}
    />
  );
};
export enum EntityType {
  PLAYER,
  MATE,
  CACTUS_SMALL,
  CACTUS_LARGE,
  THE_EX,
  CHOCOLATE,
  CUPID,
  ARROW,
  PARTICLE,
  CLOUD
}

export interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  frame: number; // For animation
  active: boolean;
  color?: string;
  rotation?: number;
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
}

export interface BackgroundElement {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

export interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
  health: number;
  gameSpeed: number;
  distance: number;
}
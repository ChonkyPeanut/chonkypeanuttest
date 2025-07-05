const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Constants
const TILE_SIZE = 50;
const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;
const CANVAS_WIDTH = TILE_SIZE * GRID_WIDTH;
const CANVAS_HEIGHT = TILE_SIZE * GRID_HEIGHT;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Grid: 2D array to track block occupancy (false = empty, true = occupied)
const grid = [];
for (let y = 0; y < GRID_HEIGHT; y++) {
  const row = [];
  for (let x = 0; x < GRID_WIDTH; x++) {
    row.push(false);
  }
  grid.push(row);
}

// Store all blocks here
const blocks = [];
const particles = [];

// Player setup
let player = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  color: "lime",
  speed: 200,          // pixels per second
  vy: 0,
  gravity: 1200,       // pixels per second squared
  jumpStrength: -450,
  grounded: false,
  health: 100,
  maxHealth: 100
};

const keys = { w: false, a: false, s: false, d: false };
let jumpBufferTimer = 0;
const jumpBufferLimit = 0.15; // seconds

// Particle class for destruction effect
class Particle {
  constructor(x, y, color) {
    this.x = x + TILE_SIZE / 2;
    this.y = y + TILE_SIZE / 2;
    this.vx = (Math.random() - 0.5) * 300;
    this.vy = (Math.random() - 1.5) * 300;
    this.alpha = 1;
    this.color = color;
    this.size = 5 + Math.random() * 3;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 800 * dt; // gravity on particles
    this.alpha -= dt * 2; // fade out
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.alpha, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  isAlive() {
    return this.alpha > 0;
  }
}

// Helper to check if grid cell is occupied
function isOccupied(gridX, gridY) {
  if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return true; // out of bounds considered occupied
  return grid[gridY][gridX];
}

// Helper to set occupancy in grid
function setOccupied(gridX, gridY, val) {
  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    grid[gridY][gridX] = val;
  }
}

// Converts pixel coords to grid coords
function toGridCoords(px, py) {
  return {
    x: Math.floor(px / TILE_SIZE),
    y: Math.floor(py / TILE_SIZE)
  };
}

// Converts grid coords to pixel coords (top-left of tile)
function toPixelCoords(gridX, gridY) {
  return {
    x: gridX * TILE_SIZE,
    y: gridY * TILE_SIZE
  };
}

// Input handlers
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
    e.preventDefault();
  }

  if (e.key === "1") {
    placeBlock();
  }

  if (e.key === "2") {
    destroyBlock();
  }

  if (e.key === "w") {
    jumpBufferTimer = jumpBufferLimit;
    e.preventDefault();
  }
});

document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
    e.preventDefault();
  }
});

// Place block at player's current grid position (centered on player)
function placeBlock() {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height; // place below player's feet

  let gridPos = toGridCoords(centerX, centerY);

  // If block below is occupied, push placement up one tile at a time until empty or top reached
  while (isOccupied(gridPos.x, gridPos.y)) {
    gridPos.y--;
    if (gridPos.y < 0) return; // no space to place
  }

  // Place block at gridPos if empty
  if (!isOccupied(gridPos.x, gridPos.y)) {
    const pixelPos = toPixelCoords(gridPos.x, gridPos.y);
    blocks.push({
      x: pixelPos.x,
      y: pixelPos.y,
      width: TILE_SIZE,
      height: TILE_SIZE,
      color: "white",
      vy: 0,
      isFalling: false  // static immediately because grid is updated
    });
    setOccupied(gridPos.x, gridPos.y, true);
  }
}

// Destroy block at player's current grid position
function destroyBlock() {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  const gridPos = toGridCoords(centerX, centerY);

  if (isOccupied(gridPos.x, gridPos.y)) {
    const pixelPos = toPixelCoords(gridPos.x, gridPos.y);

    // Find block index and remove
    const idx = blocks.findIndex(b => b.x === pixelPos.x && b.y === pixelPos.y);
    if (idx !== -1) {
      // Spawn particles
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(pixelPos.x, pixelPos.y, "gray"));
      }

      blocks.splice(idx, 1);
      setOccupied(gridPos.x, gridPos.y, false);
    }
  }
}

let lastTimestamp = 0;

function update(timestamp = 0) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  // Movement - smooth & FPS independent
  if (keys.a) player.x -= player.speed * dt;
  if (keys.d) player.x += player.speed * dt;

  player.grounded = false;

  // Clamp horizontal position
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

  // Vertical collisions with blocks
  // We'll check if player is standing on a block
  for (const block of blocks) {
    const collidesX = player.x + player.width > block.x && player.x < block.x + block.width;
    const playerFeet = player.y + player.height;
    const blockTop = block.y;
    const willPassBlock = playerFeet <= blockTop && playerFeet + player.vy * dt >= blockTop;

    if (collidesX && willPassBlock) {
      player.y = blockTop - player.height;
      player.vy = 0;
      player.grounded = true;
      break;  // grounded on at least one block
    }
  }

  // Floor collision
  const floorY = CANVAS_HEIGHT - player.height;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
  }

  // Jump buffering
  if (jumpBufferTimer > 0) jumpBufferTimer -= dt;
  if (jumpBufferTimer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
    jumpBufferTimer = 0;
  }

  // Gravity applies if not grounded or holding S
  if (!player.grounded || keys.s) {
    player.vy += player.gravity * dt;
    player.y += player.vy * dt;
  }

  // Update blocks (no falling blocks anymore, static blocks only)
  // (Removed falling physics because blocks are static on placement)

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (!particles[i].isAlive()) {
      particles.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw blocks
  for (const block of blocks) {
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw health bar above player (polished)
  const barWidth = TILE_SIZE;
  const barHeight = 8;
  const healthPercent = player.health / player.maxHealth;
  const barX = player.x;
  const barY = player.y - 16;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, barX - 2, barY - 2, barWidth + 4, barHeight + 4, 4, true, false);

  ctx.fillStyle = "#ff4c4c";
  roundRect(ctx, barX, barY, barWidth * healthPercent, barHeight, 3, true, false);

  ctx.strokeStyle = "#550000";
  ctx.lineWidth = 2;
  roundRect(ctx, barX, barY, barWidth, barHeight, 3, false, true);

  // Draw placement outline around player's current grid cell
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const gridPos = toGridCoords(centerX, centerY);
  const outlinePixel = toPixelCoords(gridPos.x, gridPos.y);

  ctx.lineWidth = 3;
  ctx.shadowColor = isOccupied(gridPos.x, gridPos.y) ? "rgba(255,0,0,0.7)" : "rgba(0,255,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = isOccupied(gridPos.x, gridPos.y) ? "#ff0000" : "#00ff00";
  ctx.strokeRect(outlinePixel.x + 1.5, outlinePixel.y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
  ctx.shadowBlur = 0;

  // Draw particles
  for (const p of particles) {
    p.draw(ctx);
  }

  // Draw player coordinates top-right outside canvas
  const coordsText = `X: ${Math.floor(player.x)}, Y: ${Math.floor(player.y)}`;
  ctx.font = "16px Arial";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  const textX = CANVAS_WIDTH - ctx.measureText(coordsText).width - 10;
  const textY = 20;
  ctx.strokeText(coordsText, textX, textY);
  ctx.fillText(coordsText, textX, textY);
}

// Helper for rounded rectangles
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === "undefined") stroke = true;
  if (typeof radius === "undefined") radius = 5;
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (const side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function loop(timestamp) {
  update(timestamp);
  draw();
  requestAnimationFrame(loop);
}

loop();

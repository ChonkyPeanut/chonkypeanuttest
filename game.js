const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 50;
const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;
canvas.width = TILE_SIZE * GRID_WIDTH;
canvas.height = TILE_SIZE * GRID_HEIGHT + 100; // +100 for hotbar

// Grid occupancy and block data
// grid[y][x] = { occupied: bool, color: string, health: int, maxHealth: int, specialPixels: array }
// specialPixels: array of {x,y,color} for tiny colored pixels on block for visual flair
const grid = [];
for (let y = 0; y < GRID_HEIGHT; y++) {
  const row = [];
  for (let x = 0; x < GRID_WIDTH; x++) {
    row.push(null); // null means empty
  }
  grid.push(row);
}

const blocks = [];  // will hold block objects for rendering and logic
const particles = [];

const hotbarHeight = 100;
const hotbarSlots = 8;
const hotbarSlotSize = 100;

let player = {
  x: 400, // start x (pixels)
  y: 600, // start y (pixels)
  width: TILE_SIZE,
  height: TILE_SIZE,
  color: "lime",
  speed: 300,           // px/sec horizontal speed
  vy: 0,
  gravity: 1500,        // px/s² gravity
  jumpStrength: -600,
  grounded: false,
  health: 100,
  maxHealth: 100,
  miningBlock: null,
  miningProgress: 0,
  miningRequired: 0,
};

const keys = { w: false, a: false, s: false, d: false };

let jumpBufferTimer = 0;
const jumpBufferLimit = 0.15; // seconds

let mousePos = { x: 0, y: 0 };

// Hotbar icons (simplified squares with text for demo)
const hotbarItems = [
  { name: "Block", icon: "#cccccc" },  // slot 1: block (light grey)
  { name: "Shovel", icon: "yellow" },  // slot 2: shovel (yellow)
  null, null, null, null, null, null
];

// PARTICLE CLASS
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
    this.vy += 800 * dt;
    this.alpha -= dt * 2;
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

// UTILITIES
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function isOccupied(gridX, gridY) {
  if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return true;
  return grid[gridY][gridX] !== null;
}

function setBlock(gridX, gridY, blockData) {
  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    grid[gridY][gridX] = blockData;
  }
}

function clearBlock(gridX, gridY) {
  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    grid[gridY][gridX] = null;
  }
}

function toGridCoords(px, py) {
  return {
    x: Math.floor(px / TILE_SIZE),
    y: Math.floor(py / TILE_SIZE)
  };
}

function toPixelCoords(gridX, gridY) {
  return {
    x: gridX * TILE_SIZE,
    y: gridY * TILE_SIZE
  };
}

function distanceGrid(aX, aY, bX, bY) {
  return Math.max(Math.abs(aX - bX), Math.abs(aY - bY));
}

// Generate random initial blocks
function generateInitialBlocks() {
  for (let y = 0; y < 8; y++) { // y=0..7 (0 to 350px)
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (Math.random() < 0.3) {
        let color;
        if (y < 4) {
          // Below y=200, light grey + pixel chance
          color = "#cccccc";
          // special pixels (5% chance per block)
          const specialPixels = [];
          if (Math.random() < 0.05) {
            const px = Math.floor(Math.random() * TILE_SIZE);
            const py = Math.floor(Math.random() * TILE_SIZE);
            const colors = ["black", "silver", "gold"];
            const c = colors[Math.floor(Math.random() * colors.length)];
            specialPixels.push({ x: px, y: py, color: c });
          }
          setBlock(x, y, {
            color,
            health: 10,
            maxHealth: 10,
            specialPixels
          });
        } else {
          // Above y=200, light brown
          color = "#a67c52";
          setBlock(x, y, {
            color,
            health: 5,
            maxHealth: 5,
            specialPixels: []
          });
        }
      }
    }
  }
}

generateInitialBlocks();

// INPUT HANDLERS
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
    e.preventDefault();
  }

  if (e.key === "1") {
    placeBlock();
  }

  if (e.key === "2") {
    if (player.miningBlock) {
      mineBlock();
    }
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

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
});

// PLAYER ACTIONS
function placeBlock() {
  const centerX = player.x + player.width / 2;
  const playerGridPos = toGridCoords(centerX, player.y + player.height);
  const mouseGridPos = toGridCoords(mousePos.x, mousePos.y);

  // Must be within 1 grid space range from player
  const dist = distanceGrid(playerGridPos.x, playerGridPos.y, mouseGridPos.x, mouseGridPos.y);
  if (dist > 1) return;

  // Block can only be placed BELOW the player
  if (mouseGridPos.y <= playerGridPos.y) return;

  // Check if spot empty
  if (isOccupied(mouseGridPos.x, mouseGridPos.y)) return;

  // Find final fall position for block (fall down until hits floor or another block)
  let fallGridY = mouseGridPos.y;
  while (fallGridY < GRID_HEIGHT - 1 && !isOccupied(mouseGridPos.x, fallGridY + 1)) {
    fallGridY++;
  }

  // Place block in grid
  const blockColor = (fallGridY < 4) ? "#a67c52" : "#cccccc"; // brown or grey

  // Special pixels if below y=300 (grid y=6)
  let specialPixels = [];
  if (fallGridY >= 6) {
    if (Math.random() < 0.05) {
      const px = Math.floor(Math.random() * TILE_SIZE);
      const py = Math.floor(Math.random() * TILE_SIZE);
      const colors = ["black", "silver", "gold"];
      const c = colors[Math.floor(Math.random() * colors.length)];
      specialPixels.push({ x: px, y: py, color: c });
    }
  }

  const health = (fallGridY < 4) ? 5 : 10; // brown easier, grey harder

  setBlock(mouseGridPos.x, fallGridY, {
    color: blockColor,
    health,
    maxHealth: health,
    specialPixels
  });
}

function mineBlock() {
  if (!player.miningBlock) return;
  player.miningProgress++;
  // Decrease block health gradually
  player.miningBlock.health -= 1;
  if (player.miningBlock.health <= 0) {
    // Destroy block and spawn particles
    const { x: gx, y: gy } = player.miningBlockGridPos;
    const px = gx * TILE_SIZE;
    const py = gy * TILE_SIZE;

    for (let i = 0; i < 20; i++) {
      particles.push(new Particle(px, py, "gray"));
    }

    clearBlock(gx, gy);

    // Make blocks above fall down to fill gap
    for (let y = gy - 1; y >= 0; y--) {
      if (isOccupied(gx, y)) {
        const aboveBlock = grid[y][gx];
        setBlock(gx, y + 1, aboveBlock);
        clearBlock(gx, y);
      }
    }
    player.miningBlock = null;
    player.miningProgress = 0;
  }
}

// UPDATE AND DRAW LOOP
let lastTimestamp = 0;

function update(timestamp = 0) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  // Move player left/right
  let moveX = 0;
  if (keys.a) moveX -= 1;
  if (keys.d) moveX += 1;
  player.x += moveX * player.speed * dt;

  // Clamp horizontal position
  player.x = clamp(player.x, 0, canvas.width - player.width);

  // Gravity and vertical movement
  player.grounded = false;
  // Check collision with blocks below player
  const playerGridPos = toGridCoords(player.x + player.width / 2, player.y + player.height);
  let onBlockY = null;

  for (let y = playerGridPos.y; y < GRID_HEIGHT; y++) {
    if (isOccupied(playerGridPos.x, y)) {
      const blockTop = y * TILE_SIZE;
      if (player.y + player.height <= blockTop && player.y + player.height + player.vy * dt >= blockTop) {
        player.y = blockTop - player.height;
        player.vy = 0;
        player.grounded = true;
        onBlockY = y;
        break;
      }
    }
  }

  // Floor collision
  const floorY = canvas.height - hotbarHeight - player.height;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
    onBlockY = GRID_HEIGHT - 1;
  }

  // Jump buffering
  if (jumpBufferTimer > 0) jumpBufferTimer -= dt;
  if (jumpBufferTimer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
    jumpBufferTimer = 0;
  }

  // Gravity only if not grounded
  if (!player.grounded) {
    player.vy += player.gravity * dt;
    player.y += player.vy * dt;
  }

  // No down movement with S allowed
  if (keys.s) {
    // no effect
  }

  // Mining block detection: check 8 neighbors + current grid around player for mining
  player.miningBlock = null;
  const px = playerGridPos.x;
  const py = playerGridPos.y;

  let closestBlock = null;
  let closestDist = 99;

  for (let y = py - 1; y <= py + 1; y++) {
    for (let x = px - 1; x <= px + 1; x++) {
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;
      if (x === px && y === py) continue;

      const dist = distanceGrid(px, py, x, y);
      if (dist > 1) continue;

      if (isOccupied(x, y)) {
        const block = grid[y][x];
        if (dist < closestDist) {
          closestDist = dist;
          closestBlock = block;
          player.miningBlockGridPos = { x, y };
        }
      }
    }
  }

  player.miningBlock = closestBlock;

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (!particles[i].isAlive()) particles.splice(i, 1);
  }
}

function draw() {
  // Draw background with blue above y=500 (y=10 grid) and brown gradient below

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const pixelY = y * TILE_SIZE;
      if (pixelY < 500) {
        // brown gradient darkening downwards
        const maxDark = 100;
        const darkAmount = clamp(Math.floor(((500 - pixelY) / 500) * maxDark), 50, maxDark);
        ctx.fillStyle = `rgb(${55 - darkAmount}, ${30 - darkAmount / 2}, 0)`; // dark brown shades
      } else {
        ctx.fillStyle = "#4a90e2"; // blue
      }
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw blocks with special pixels
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (isOccupied(x, y)) {
        const b = grid[y][x];
        ctx.fillStyle = b.color;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        // Draw special pixels
        for (const sp of b.specialPixels) {
          ctx.fillStyle = sp.color;
          ctx.fillRect(x * TILE_SIZE + sp.x, y * TILE_SIZE + sp.y, 2, 2);
        }
      }
    }
  }

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw shovel pointing to mouse
  drawShovel();

  // Draw mining block highlight
  if (player.miningBlock) {
    const { x, y } = player.miningBlockGridPos;
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;

    // Light red overlay that darkens with damage
    const healthPercent = player.miningBlock.health / player.miningBlock.maxHealth;
    const alpha = 0.7 * (1 - healthPercent);
    ctx.fillStyle = `rgba(255, 100, 100, ${alpha.toFixed(2)})`;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  }

  // Draw placement outline at mouse grid with green/red based on range & occupancy
  const mouseGridPos = toGridCoords(mousePos.x, mousePos.y);
  const playerGridPos = toGridCoords(player.x + player.width / 2, player.y + player.height);
  const dist = distanceGrid(playerGridPos.x, playerGridPos.y, mouseGridPos.x, mouseGridPos.y);

  if (
    mouseGridPos.x >= 0 && mouseGridPos.x < GRID_WIDTH &&
    mouseGridPos.y >= 0 && mouseGridPos.y < GRID_HEIGHT
  ) {
    const canPlace = dist <= 1 && !isOccupied(mouseGridPos.x, mouseGridPos.y);
    const color = canPlace ? "lime" : "red";
    ctx.lineWidth = 3;
    ctx.shadowColor = canPlace ? "rgba(0,255,0,0.7)" : "rgba(255,0,0,0.7)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.strokeRect(mouseGridPos.x * TILE_SIZE + 2, mouseGridPos.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.shadowBlur = 0;
  }

  // Draw health bar top right
  const barWidth = 200;
  const barHeight = 20;
  const healthPercent = player.health / player.maxHealth;
  const barX = canvas.width - barWidth - 20;
  const barY = 20;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, barX - 2, barY - 2, barWidth + 4, barHeight + 4, 8, true, false);

  ctx.fillStyle = "#ff4c4c";
  roundRect(ctx, barX, barY, barWidth * healthPercent, barHeight, 6, true, false);

  ctx.strokeStyle = "#550000";
  ctx.lineWidth = 3;
  roundRect(ctx, barX, barY, barWidth, barHeight, 6, false, true);

  // Draw hotbar background
  ctx.fillStyle = "#222222";
  ctx.fillRect(0, canvas.height - hotbarHeight, canvas.width, hotbarHeight);

  // Draw hotbar slots & icons
  for (let i = 0; i < hotbarSlots; i++) {
    const slotX = i * hotbarSlotSize;
    const slotY = canvas.height - hotbarHeight;

    ctx.fillStyle = "#555555";
    ctx.fillRect(slotX + 5, slotY + 5, hotbarSlotSize - 10, hotbarHeight - 10);

    if (hotbarItems[i]) {
      const icon = hotbarItems[i];
      ctx.fillStyle = icon.icon;

      // Draw icon shape
      if (icon.name === "Block") {
        ctx.fillRect(slotX + 20, slotY + 20, 60, 60);
      } else if (icon.name === "Shovel") {
        // Simple shovel shape (handle + head)
        ctx.save();
        ctx.translate(slotX + 50, slotY + 50);
        ctx.fillStyle = icon.icon;
        ctx.fillRect(-5, -30, 10, 60); // handle
        ctx.beginPath();
        ctx.moveTo(-20, 30);
        ctx.lineTo(20, 30);
        ctx.lineTo(0, 50);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Draw particles
  for (const p of particles) p.draw(ctx);
}

// Draw shovel pointing to mouse position
function drawShovel() {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;

  const dx = mousePos.x - px;
  const dy = mousePos.y - py;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);

  // Draw simple shovel shape
  ctx.fillStyle = "yellow";
  ctx.fillRect(0, -5, 30, 10); // shovel blade
  ctx.fillStyle = "saddlebrown";
  ctx.fillRect(-5, -3, 10, 6); // handle base

  ctx.restore();
}

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

function loop(timestamp = 0) {
  update(timestamp);
  draw();
  requestAnimationFrame(loop);
}

loop();

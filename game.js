// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 900;

// Constants
const TILE_SIZE = 50;
const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;

// Game state
let blocks = [];
let particles = [];
let grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
let mouse = { x: 0, y: 0 };
let miningState = { x: -1, y: -1, hits: 0 };

const blockTypes = {
  air: null,
  dirt: { color: "#A0522D", hp: 5 },
  stone: { color: "#d3d3d3", hp: 10 }
};

// Player
let player = {
  x: 400,
  y: 600,
  width: TILE_SIZE,
  height: TILE_SIZE,
  color: "lime",
  speed: 4,
  vy: 0,
  gravity: 0.5,
  jumpStrength: -10,
  grounded: false,
  health: 100,
  maxHealth: 100
};

const keys = { w: false, a: false, s: false, d: false };
let jumpBuffer = 0;
const jumpBufferLimit = 10;

// Terrain generation
function generateTerrain() {
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const worldY = y * TILE_SIZE;
      if (worldY < 300) continue;
      const type = worldY >= 500 ? 'dirt' : 'stone';
      grid[y][x] = { type, hp: blockTypes[type].hp };
    }
  }
}

// Input handlers
document.addEventListener("keydown", e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "w") jumpBuffer = jumpBufferLimit;
  if (e.key === "1") tryPlaceBlock();
  if (e.key === "2") tryMineBlock();
});

document.addEventListener("keyup", e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

// Core update
function update() {
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  player.grounded = false;
  player.vy += player.gravity;
  player.y += player.vy;

  // Floor collision
  if (player.y < 0) {
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
  }

  // Block collision (falling onto a block)
  const px = Math.floor(player.x / TILE_SIZE);
  const py = Math.floor(player.y / TILE_SIZE);
  const belowY = Math.floor((player.y - 1) / TILE_SIZE);
  if (grid[belowY] && grid[belowY][px]) {
    player.y = (belowY + 1) * TILE_SIZE;
    player.vy = 0;
    player.grounded = true;
  }

  if (jumpBuffer > 0) jumpBuffer--;
  if (jumpBuffer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
    jumpBuffer = 0;
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= 0.1;
    p.alpha -= 0.02;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function tryPlaceBlock() {
  const cx = Math.floor(mouse.x / TILE_SIZE);
  const cy = Math.floor(mouse.y / TILE_SIZE);
  const px = Math.floor(player.x / TILE_SIZE);
  const py = Math.floor(player.y / TILE_SIZE);

  const dist = Math.abs(cx - px) <= 1 && Math.abs(cy - py) <= 1;

  if (dist && !grid[cy]?.[cx]) {
    // Find lowest valid Y
    for (let y = cy; y >= 0; y--) {
      if (y === 0 || grid[y - 1][cx]) {
        grid[y][cx] = { type: 'dirt', hp: 5 };
        break;
      }
    }
  }
}

function tryMineBlock() {
  const cx = Math.floor(mouse.x / TILE_SIZE);
  const cy = Math.floor(mouse.y / TILE_SIZE);
  const block = grid[cy]?.[cx];
  const px = Math.floor(player.x / TILE_SIZE);
  const py = Math.floor(player.y / TILE_SIZE);

  const dist = Math.abs(cx - px) <= 1 && Math.abs(cy - py) <= 1;

  if (dist && block) {
    block.hp--;
    if (block.hp <= 0) {
      spawnParticles(cx, cy, blockTypes[block.type].color);
      grid[cy][cx] = null;
      dropBlocksAbove(cx, cy);
    }
  }
}

function dropBlocksAbove(x, y) {
  for (let i = y + 1; i < GRID_HEIGHT; i++) {
    if (grid[i][x]) {
      grid[i - 1][x] = grid[i][x];
      grid[i][x] = null;
    } else break;
  }
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2,
      alpha: 1,
      color
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw terrain
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const block = grid[y][x];
      if (block) {
        ctx.fillStyle = blockTypes[block.type].color;
        ctx.fillRect(x * TILE_SIZE, canvas.height - (y + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, canvas.height - player.y - player.height, player.width, player.height);

  // Draw particles
  for (let p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, canvas.height - p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Draw health bar
  ctx.fillStyle = "black";
  ctx.fillRect(680, 10, 110, 14);
  ctx.fillStyle = "red";
  ctx.fillRect(685, 13, 100 * (player.health / player.maxHealth), 8);

  // Draw mouse outline
  const mx = Math.floor(mouse.x / TILE_SIZE);
  const my = Math.floor(mouse.y / TILE_SIZE);
  const px = Math.floor(player.x / TILE_SIZE);
  const py = Math.floor(player.y / TILE_SIZE);
  const dist = Math.abs(mx - px) <= 1 && Math.abs(my - py) <= 1;

  ctx.strokeStyle = dist ? (grid[my]?.[mx] ? "lightcoral" : "lime") : "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(mx * TILE_SIZE, my * TILE_SIZE, TILE_SIZE, TILE_SIZE);

  // Coordinates
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`X: ${px}, Y: ${py}`, 650, 40);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

generateTerrain();
gameLoop();

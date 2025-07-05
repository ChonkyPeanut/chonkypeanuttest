// 2D Minecraft-like Game Fix: Correct Y-Axis Direction
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 800;

const TILE_SIZE = 50;
const GRID_WIDTH = canvas.width / TILE_SIZE;
const GRID_HEIGHT = canvas.height / TILE_SIZE;

const blocks = [];
const grid = new Map();
const particles = [];

// Utility
function getGridKey(x, y) {
  return `${x},${y}`;
}

function worldToScreen(y) {
  // Flip Y axis
  return canvas.height - (y + TILE_SIZE);
}

// Player setup
let player = {
  x: 400,
  y: 600,
  width: TILE_SIZE,
  height: TILE_SIZE,
  color: "lime",
  speed: 4,
  vy: 0,
  gravity: 0.5,
  jumpStrength: 10,
  grounded: false,
  health: 100,
  maxHealth: 100
};

const keys = { w: false, a: false, s: false, d: false };
let jumpBufferTimer = 0;
const jumpBufferLimit = 10;

// Input
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "w") jumpBufferTimer = jumpBufferLimit;
});
document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Initial Terrain Generation
for (let y = 0; y < GRID_HEIGHT; y++) {
  for (let x = 0; x < GRID_WIDTH; x++) {
    if (y < 6) continue;
    const key = getGridKey(x, y);
    if (Math.random() < 0.3) {
      const blockColor = y >= 10
        ? "lightgray"
        : (y >= 6
          ? `rgb(${120 + Math.random()*40}, ${72 + Math.random()*20}, ${10})`
          : "lightgray");
      blocks.push({
        x: x * TILE_SIZE,
        y: y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
        color: blockColor,
        vy: 0,
        isFalling: false
      });
      grid.set(key, true);
    }
  }
}

// Update
function update() {
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  player.grounded = false;

  // Gravity (pulling down in canvas = negative vy)
  player.vy -= player.gravity;
  player.y += player.vy;

  // Collision detection
  const px = Math.floor(player.x / TILE_SIZE);
  const py = Math.floor(player.y / TILE_SIZE);

  for (let block of blocks) {
    const bx = block.x;
    const by = block.y;
    if (
      player.x + player.width > bx && player.x < bx + TILE_SIZE &&
      player.y <= by + TILE_SIZE && player.y >= by - TILE_SIZE &&
      player.y > by
    ) {
      player.y = block.y + TILE_SIZE;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // World floor
  if (player.y < 0) {
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
  }

  // Jump
  if (jumpBufferTimer > 0) jumpBufferTimer--;
  if (jumpBufferTimer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    jumpBufferTimer = 0;
  }

  // Wall bounds
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const screenY = worldToScreen(y * TILE_SIZE);
      ctx.fillStyle = y < 6 ? "#87CEEB" : `rgb(${40 - y}, ${25 - y / 2}, ${10})`;
      ctx.fillRect(x * TILE_SIZE, screenY, TILE_SIZE, TILE_SIZE);
    }
  }

  // Blocks
  for (let block of blocks) {
    const screenY = worldToScreen(block.y);
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, screenY, TILE_SIZE, TILE_SIZE);
  }

  // Player
  const playerScreenY = worldToScreen(player.y);
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, playerScreenY, player.width, player.height);

  // Health Bar (Top Right)
  const barWidth = 100;
  const barHeight = 10;
  const healthRatio = player.health / player.maxHealth;
  ctx.fillStyle = "black";
  ctx.fillRect(canvas.width - barWidth - 10, 10, barWidth, barHeight);
  ctx.fillStyle = "red";
  ctx.fillRect(canvas.width - barWidth - 10, 10, barWidth * healthRatio, barHeight);

  // Coordinates (Top Right)
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  const cx = Math.floor(player.x / TILE_SIZE);
  const cy = Math.floor(player.y / TILE_SIZE);
  ctx.fillText(`X: ${cx}, Y: ${cy}`, canvas.width - 120, 30);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

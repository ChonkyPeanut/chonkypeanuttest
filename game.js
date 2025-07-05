// === game.js: Final 2D Minecraft-Inspired Version ===

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 900;

// === Constants ===
const TILE_SIZE = 50;
const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;
const WORLD = [];
const DAMAGE_THRESHOLD = {
  "stone": 10,
  "dirt": 5
};

// === Tools/Items ===
const HOTBAR = ["block", "shovel", null, null, null, null, null, null];
let selectedItem = 1; // Shovel

// === Player ===
const player = {
  x: 400,
  y: 600,
  width: 50,
  height: 50,
  color: "lime",
  vx: 0,
  vy: 0,
  gravity: 0.6,
  speed: 4,
  jumpStrength: -12,
  grounded: false,
  health: 100,
  maxHealth: 100
};

// === Mouse + Keys ===
let mouseX = 0;
let mouseY = 0;
const keys = {};

// === Map Generation ===
for (let y = 0; y < GRID_HEIGHT; y++) {
  WORLD[y] = [];
  for (let x = 0; x < GRID_WIDTH; x++) {
    if (y >= 6) {
      // y=300 to 500: dirt with ore chance
      const oreChance = Math.random();
      let ore = null;
      if (oreChance < 0.05) ore = "gold";
      else if (oreChance < 0.10) ore = "silver";
      else if (oreChance < 0.15) ore = "coal";
      WORLD[y][x] = { type: "dirt", hp: DAMAGE_THRESHOLD.dirt, ore };
    } else if (y >= 0 && y < 6) {
      // Below y=300: stone
      WORLD[y][x] = { type: "stone", hp: DAMAGE_THRESHOLD.stone };
    } else {
      WORLD[y][x] = null;
    }
  }
}

// === Event Listeners ===
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", e => {
  const gridX = Math.floor(mouseX / TILE_SIZE);
  const gridY = GRID_HEIGHT - 1 - Math.floor((mouseY - 100) / TILE_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    const dx = gridX - Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const dy = gridY - Math.floor((player.y + player.height / 2) / TILE_SIZE);
    const isInReach = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

    const block = WORLD[gridY][gridX];

    if (selectedItem === 1 && isInReach && block) {
      // Mine with shovel
      block.hp--;
      if (block.hp <= 0) {
        WORLD[gridY][gridX] = null;
        fallBlocks(gridX, gridY);
      }
    }
    if (selectedItem === 0 && isInReach && !block) {
      // Place block (falls if floating)
      let placeY = gridY;
      while (placeY > 0 && !WORLD[placeY - 1][gridX]) placeY--;
      if (placeY < GRID_HEIGHT) {
        WORLD[placeY][gridX] = { type: "dirt", hp: DAMAGE_THRESHOLD.dirt };
      }
    }
  }
});

function fallBlocks(x, y) {
  for (let i = y + 1; i < GRID_HEIGHT; i++) {
    if (WORLD[i][x]) {
      WORLD[i - 1][x] = WORLD[i][x];
      WORLD[i][x] = null;
    } else break;
  }
}

// === Update ===
function update() {
  // Movement
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Apply gravity
  player.vy += player.gravity;
  player.y += player.vy;
  player.grounded = false;

  // Ground collision
  const footY = Math.floor(player.y / TILE_SIZE);
  const midX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
  if (footY >= 0 && footY < GRID_HEIGHT && midX >= 0 && midX < GRID_WIDTH) {
    if (WORLD[footY][midX]) {
      player.y = footY * TILE_SIZE;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Jump
  if (keys["w"] && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
  }

  // Clamp to canvas
  player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
  player.y = Math.min(canvas.height - player.height, player.y);
}

// === Draw ===
function draw() {
  // Background
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const block = WORLD[y][x];
      if (block) {
        let color = block.type === "stone" ? "lightgray" : "#b97b56";
        if (block.ore === "gold") color = "#FFD700";
        if (block.ore === "silver") color = "#C0C0C0";
        if (block.ore === "coal") color = "#333";
        ctx.fillStyle = color;
        ctx.fillRect(x * TILE_SIZE, canvas.height - 100 - (y + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Background color above/below y=500
  ctx.fillStyle = "#87ceeb"; // sky
  ctx.fillRect(0, 0, canvas.width, canvas.height - 900);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, canvas.height - 100 - player.y - player.height, player.width, player.height);

  // Shovel
  ctx.strokeStyle = "brown";
  ctx.beginPath();
  ctx.moveTo(player.x + 25, canvas.height - 100 - player.y - 25);
  ctx.lineTo(mouseX, mouseY);
  ctx.stroke();

  // Health bar
  const healthBarX = canvas.width - 210;
  ctx.fillStyle = "black";
  ctx.fillRect(healthBarX, 10, 200, 20);
  ctx.fillStyle = "red";
  ctx.fillRect(healthBarX, 10, 200 * (player.health / player.maxHealth), 20);

  // Coordinates
  ctx.fillStyle = "black";
  ctx.font = "16px monospace";
  ctx.fillText(`X: ${Math.floor(player.x / TILE_SIZE)} Y: ${Math.floor(player.y / TILE_SIZE)}`, canvas.width - 200, 45);

  // Hotbar
  for (let i = 0; i < 8; i++) {
    const x = i * 100;
    ctx.strokeStyle = i === selectedItem ? "yellow" : "black";
    ctx.strokeRect(x, canvas.height - 90, 100, 90);
    if (HOTBAR[i] === "shovel") {
      ctx.fillStyle = "brown";
      ctx.fillText("🪓", x + 40, canvas.height - 50);
    } else if (HOTBAR[i] === "block") {
      ctx.fillStyle = "gray";
      ctx.fillRect(x + 25, canvas.height - 65, 50, 50);
    }
  }

  // Outline
  const hoverX = Math.floor(mouseX / TILE_SIZE);
  const hoverY = Math.floor((canvas.height - mouseY - 100) / TILE_SIZE);
  const dx = hoverX - Math.floor((player.x + player.width / 2) / TILE_SIZE);
  const dy = hoverY - Math.floor(player.y / TILE_SIZE);
  const reachable = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

  ctx.strokeStyle = reachable ? (WORLD[hoverY]?.[hoverX] ? "#faa" : "lime") : "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(hoverX * TILE_SIZE, canvas.height - 100 - (hoverY + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

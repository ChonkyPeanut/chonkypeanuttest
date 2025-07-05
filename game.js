<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>2D Sandbox Game</title>
  <style>
    body {
      margin: 0;
      background: black;
      overflow: hidden;
    }
    canvas {
      display: block;
      margin: 0 auto;
      background: #000;
    }
  </style>
</head>
<body>
<canvas id="gameCanvas" width="800" height="900"></canvas>

<script>
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 50;
const gridCols = 16;
const gridRows = 16;
const blockWidth = 50;
const blockHeight = 50;
const hotbarY = 800;
const blocks = [];
const gridMap = {};
const particles = [];
let mouse = { x: 0, y: 0 };

// Player
let player = {
  x: 400,
  y: 600,
  width: 50,
  height: 50,
  color: "lime",
  speed: 4,
  vy: 0,
  gravity: 0.5,
  grounded: false,
  jumpStrength: -10,
  health: 100,
  maxHealth: 100,
  miningTarget: null,
  miningProgress: 0
};

// Keys
const keys = { w: false, a: false, s: false, d: false };
let jumpBuffer = 0;
const jumpBufferLimit = 10;

// Block mining strength
const miningStrength = {
  brown: 5,
  grey: 10
};

// Helper
function getGridKey(x, y) {
  return `${x},${y}`;
}

function addBlock(x, y, type) {
  const key = getGridKey(x, y);
  if (!gridMap[key]) {
    let color = type === "brown" ? "#caa472" : "#ccc";
    let ores = "";
    if (type === "brown" && y < 500 && y >= 300) {
      const r = Math.random();
      if (r < 0.1) ores = "black";
      else if (r < 0.15) ores = "gold";
      else if (r < 0.2) ores = "silver";
    }

    gridMap[key] = {
      x, y,
      type,
      color,
      damage: 0,
      ores
    };
  }
}

// Generate terrain
for (let y = 0; y < 800; y += 50) {
  if (y >= 300 && y <= 500) {
    if (Math.random() < 0.25) {
      for (let x = 0; x < 800; x += 50) {
        if (Math.random() < 0.4) addBlock(x, y, "brown");
      }
    }
  }
  if (y < 300) {
    for (let x = 0; x < 800; x += 50) {
      if (Math.random() < 0.5) addBlock(x, y, "grey");
    }
  }
}

// Particle effect
class Particle {
  constructor(x, y, color) {
    this.x = x + 25;
    this.y = y + 25;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.alpha = 1;
    this.color = color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.alpha -= 0.03;
  }
  draw() {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Input listeners
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "w") jumpBuffer = jumpBufferLimit;
});
document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = 900 - (e.clientY - rect.top); // Invert y
});

document.addEventListener("keydown", (e) => {
  const px = Math.floor((player.x + 25) / 50) * 50;
  const py = Math.floor((player.y + 25) / 50) * 50;
  const mouseGridX = Math.floor(mouse.x / 50) * 50;
  const mouseGridY = Math.floor(mouse.y / 50) * 50;
  const key = getGridKey(mouseGridX, mouseGridY);

  const inRange = Math.abs(mouseGridX - px) <= 50 && Math.abs(mouseGridY - py) <= 50;

  if (e.key === "1" && inRange && !gridMap[key]) {
    // Let it fall if no block below
    let yFall = mouseGridY;
    while (yFall > 0) {
      const belowKey = getGridKey(mouseGridX, yFall - 50);
      if (gridMap[belowKey]) break;
      yFall -= 50;
    }
    addBlock(mouseGridX, yFall, yFall < 300 ? "grey" : "brown");
  }

  if (e.key === "2" && inRange && gridMap[key]) {
    player.miningTarget = key;
    player.miningProgress++;
    let block = gridMap[key];
    const maxHits = miningStrength[block.type];
    block.damage = player.miningProgress / maxHits;
    if (player.miningProgress >= maxHits) {
      delete gridMap[key];
      for (let y = mouseGridY + 50; y <= 800; y += 50) {
        const aboveKey = getGridKey(mouseGridX, y);
        const belowKey = getGridKey(mouseGridX, y - 50);
        if (gridMap[aboveKey] && !gridMap[belowKey]) {
          gridMap[belowKey] = gridMap[aboveKey];
          gridMap[belowKey].y -= 50;
          delete gridMap[aboveKey];
        } else break;
      }
      for (let i = 0; i < 10; i++) {
        particles.push(new Particle(mouseGridX, mouseGridY, "gray"));
      }
      player.miningProgress = 0;
      player.miningTarget = null;
    }
  } else if (player.miningTarget !== key) {
    player.miningProgress = 0;
    player.miningTarget = null;
  }
});

// Update
function update() {
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  player.grounded = false;

  const px = Math.floor((player.x + 25) / 50) * 50;
  const py = Math.floor((player.y + 25) / 50) * 50;
  const belowKey = getGridKey(px, py - 50);
  if (player.y <= 0) {
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
  } else if (gridMap[belowKey]) {
    player.y = py;
    player.vy = 0;
    player.grounded = true;
  }

  if (jumpBuffer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    jumpBuffer = 0;
  }
  if (!player.grounded) {
    player.vy += player.gravity;
    player.y += player.vy;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }
}

// Draw
function draw() {
  // Background
  for (let y = 0; y < 800; y += 50) {
    for (let x = 0; x < 800; x += 50) {
      const drawY = 800 - y - 50;
      if (y > 500) ctx.fillStyle = "#222";
      else ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x, drawY, 50, 50);
    }
  }

  // Blocks
  for (let key in gridMap) {
    const block = gridMap[key];
    const drawY = 800 - block.y - 50;
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, drawY, 50, 50);
    if (block.ores) {
      ctx.fillStyle = block.ores;
      ctx.fillRect(block.x + 20, drawY + 20, 5, 5);
    }
    if (block.damage) {
      ctx.fillStyle = `rgba(255,0,0,${block.damage})`;
      ctx.fillRect(block.x, drawY, 50, 50);
    }
  }

  // Outline
  const mx = Math.floor(mouse.x / 50) * 50;
  const my = Math.floor(mouse.y / 50) * 50;
  const inRange = Math.abs(mx - px) <= 50 && Math.abs(my - py) <= 50;
  ctx.strokeStyle = inRange ? (!gridMap[getGridKey(mx, my)] ? "lime" : "#f88") : "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(mx, 800 - my - 50, 50, 50);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, 800 - player.y - 50, 50, 50);

  // Health bar (top right)
  ctx.fillStyle = "black";
  ctx.fillRect(650, 10, 140, 20);
  ctx.fillStyle = "red";
  ctx.fillRect(650, 10, 140 * (player.health / player.maxHealth), 20);

  // Particles
  for (let p of particles) p.draw();

  // Coordinates
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText(`X: ${px}, Y: ${py}`, 10, 20);

  // Hotbar
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = "white";
    ctx.strokeRect(i * 100, hotbarY, 100, 100);
  }
  // Slot 1: Block icon
  ctx.fillStyle = "#ccc";
  ctx.fillRect(10, hotbarY + 10, 30, 30);
  // Slot 2: Shovel icon (facing right for now)
  ctx.fillStyle = "#555";
  ctx.beginPath();
  ctx.moveTo(110, hotbarY + 50);
  ctx.lineTo(130, hotbarY + 40);
  ctx.lineTo(130, hotbarY + 60);
  ctx.fill();
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
</script>
</body>
</html>

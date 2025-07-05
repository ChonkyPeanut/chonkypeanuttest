const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blocks = [];
const grid = new Set(); // stores placed block positions as "x,y"
const particles = [];

let lastTimestamp = 0; // For delta timing

let player = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  color: "lime",
  speed: 200,          // speed in pixels per second, scaled with delta
  vy: 0,
  gravity: 1200,       // pixels/s² gravity
  jumpStrength: -450,  // initial jump velocity (pixels/s)
  grounded: false,
  health: 100,
  maxHealth: 100
};

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

let jumpBufferTimer = 0;
const jumpBufferLimit = 0.15; // seconds

// Particle class for destruction effect
class Particle {
  constructor(x, y, color) {
    this.x = x + 25; // center of block
    this.y = y + 25;
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
    this.alpha -= dt * 2; // fade faster
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

// Input listeners with preventDefault for smooth controls
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
    e.preventDefault();
  }

  const blockX = Math.floor((player.x + player.width / 2) / 50) * 50;
  let blockY = Math.floor((player.y + player.height / 2) / 50) * 50;
  let key = `${blockX},${blockY}`;

  if (e.key === "1") {
    // Push block up by 50px if block exists below placement
    while (grid.has(key)) {
      blockY -= 50;
      if (blockY < 0) break; // Don't go above canvas top
      key = `${blockX},${blockY}`;
    }
    if (!grid.has(key) && blockY >= 0) {
      blocks.push({
        x: blockX,
        y: blockY,
        width: 50,
        height: 50,
        color: "white",
        vy: 0,
        isFalling: true
      });
      grid.add(key);
    }
  }

  if (e.key === "2") {
    if (grid.has(key)) {
      const index = blocks.findIndex(b => b.x === blockX && b.y === blockY);
      if (index !== -1) {
        // Create particles on destruction
        for (let i = 0; i < 15; i++) {
          particles.push(new Particle(blockX, blockY, "gray"));
        }
        blocks.splice(index, 1);
        grid.delete(key);
      }
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

function update(timestamp = 0) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000; // delta time in seconds
  lastTimestamp = timestamp;

  // Horizontal movement (scaled by dt for smoothness)
  if (keys.a) player.x -= player.speed * dt;
  if (keys.d) player.x += player.speed * dt;

  player.grounded = false;

  // Floor collision
  const floorY = canvas.height - player.height;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
  }

  // Collision with blocks (vertical)
  for (let block of blocks) {
    const touchX = player.x + player.width > block.x && player.x < block.x + block.width;
    const fallOn = player.y + player.height <= block.y &&
                   player.y + player.height + player.vy * dt >= block.y;

    if (touchX && fallOn) {
      player.y = block.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Jump buffer handling
  if (jumpBufferTimer > 0) jumpBufferTimer -= dt;
  if (jumpBufferTimer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
    jumpBufferTimer = 0;
  }

  // Gravity (only falls when airborne or holding S)
  if (!player.grounded || keys.s) {
    player.vy += player.gravity * dt;
    player.y += player.vy * dt;
  }

  // Wall clamp
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }

  // Block falling update
  for (let block of blocks) {
    if (block.isFalling) {
      block.vy += 1200 * dt; // gravity
      block.y += block.vy * dt;

      // Floor collision
      if (block.y + block.height >= canvas.height) {
        block.y = canvas.height - block.height;
        block.vy = 0;
        block.isFalling = false;
        grid.add(`${block.x},${block.y}`);
      }

      // Land on another block
      for (let other of blocks) {
        if (block === other) continue;

        const touchX = block.x + block.width > other.x && block.x < other.x + other.width;
        const fallOn = block.y + block.height <= other.y &&
                       block.y + block.height + block.vy * dt >= other.y;

        if (touchX && fallOn) {
          block.y = other.y - block.height;
          block.vy = 0;
          block.isFalling = false;
          grid.add(`${block.x},${block.y}`);
        }
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (!particles[i].isAlive()) {
      particles.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw blocks
  for (let block of blocks) {
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw health bar with polished UI above player
  const barWidth = 50;
  const barHeight = 8;
  const healthPercent = player.health / player.maxHealth;
  const barX = player.x;
  const barY = player.y - 16;

  // Background with slight transparency and rounded corners
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  roundRect(ctx, barX - 2, barY - 2, barWidth + 4, barHeight + 4, 4, true, false);

  // Health fill (red)
  ctx.fillStyle = "#ff4c4c";
  roundRect(ctx, barX, barY, barWidth * healthPercent, barHeight, 3, true, false);

  // Health bar border
  ctx.strokeStyle = "#550000";
  ctx.lineWidth = 2;
  roundRect(ctx, barX, barY, barWidth, barHeight, 3, false, true);

  // Draw outline with glow
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const outlineX = Math.floor(centerX / 50) * 50;
  const outlineY = Math.floor(centerY / 50) * 50;
  const outlineKey = `${outlineX},${outlineY}`;

  ctx.lineWidth = 3;
  ctx.shadowColor = grid.has(outlineKey) ? "rgba(255,0,0,0.7)" : "rgba(0,255,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = grid.has(outlineKey) ? "#ff0000" : "#00ff00";
  ctx.strokeRect(outlineX + 1.5, outlineY + 1.5, 47, 47);
  ctx.shadowBlur = 0;

  // Draw particles
  for (let p of particles) {
    p.draw(ctx);
  }
}

// Helper for rounded rectangles
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === "undefined") stroke = true;
  if (typeof radius === "undefined") radius = 5;
  if (typeof radius === "number") {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    let defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (let side in defaultRadius) {
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

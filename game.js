const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blocks = [];
const grid = new Set(); // stores placed block positions

let player = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  color: "lime",
  speed: 4,
  vy: 0,
  gravity: 0.5,
  jumpStrength: -10,
  grounded: false
};

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

let jumpBufferTimer = 0;
const jumpBufferLimit = 10; // ~10 frames = 166ms

// Input listeners
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

  if (e.key === "1") {
    // Center-aligned block placement
    const blockX = Math.floor((player.x + player.width / 2) / 50) * 50;
    const blockY = Math.floor((player.y + player.height) / 50) * 50;
    const key = `${blockX},${blockY}`;

    if (!grid.has(key)) {
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

  if (e.key === "w") {
    jumpBufferTimer = jumpBufferLimit;
  }
});

document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Main update
function update() {
  // Horizontal movement
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  // Assume airborne
  player.grounded = false;

  // Floor collision
  const floorY = canvas.height - player.height;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
  }

  // Block collision
  for (let block of blocks) {
    const touchX = player.x + player.width > block.x && player.x < block.x + block.width;
    const fallOn = player.y + player.height <= block.y &&
                   player.y + player.height + player.vy >= block.y;

    if (touchX && fallOn) {
      player.y = block.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Jump buffering
  if (jumpBufferTimer > 0) jumpBufferTimer--;
  if (jumpBufferTimer > 0 && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
    jumpBufferTimer = 0;
  }

  // Apply gravity
  if (!player.grounded || keys.s) {
    player.vy += player.gravity;
    player.y += player.vy;
  }

  // Wall boundaries
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }

  // Block updates (falling)
  for (let block of blocks) {
    if (block.isFalling) {
      const nextY = block.y + block.vy + 0.5;

      block.vy += 0.5;
      block.y += block.vy;

      // Hit floor
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
                       block.y + block.height + block.vy >= other.y;

        if (touchX && fallOn) {
          block.y = other.y - block.height;
          block.vy = 0;
          block.isFalling = false;

          grid.add(`${block.x},${block.y}`);
        }
      }
    }
  }
}

// Drawing
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
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

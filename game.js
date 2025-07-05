const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blocks = [];

// Sprite position and size
let player = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  speed: 4,
  color: "lime",
  vy: 0,            // vertical velocity
  gravity: 0.5,     // gravity strength
  jumpStrength: -10,
  grounded: false
};

// WASD key state
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

// Keydown & keyup listeners
document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

  if (e.key === "1") {
  // Calculate block position snapped to 50x50 grid
  let blockX = Math.floor(player.x / 50) * 50;
  let blockY = Math.floor((player.y + player.height - 1) / 50) * 50;  // subtract 1 to keep it inside floor

  // Don't place block below the floor
  if (blockY + 50 > canvas.height) {
    blockY = canvas.height - 50;
  }

  blocks.push({
    x: blockX,
    y: blockY,
    width: 50,
    height: 50,
    color: "gray"
  });
}
});

const alreadyExists = blocks.some(b => b.x === blockX && b.y === blockY);
if (!alreadyExists) {
  blocks.push({ x: blockX, y: blockY, width: 50, height: 50, color: "gray" });
}

function update() {
  // Horizontal movement
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  // Jumping
  if (keys.w && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
  }

  // Apply gravity
  player.vy += player.gravity;
  player.y += player.vy;

  // Floor collision
  const floorY = canvas.height - player.height;
  if (player.y > floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
  }

  // Border clamp (left/right only)
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw placed blocks
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

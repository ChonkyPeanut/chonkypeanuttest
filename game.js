const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blocks = [];

// Player object
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

// Key tracking
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

// Input listeners
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

  // Place block with key "1"
  if (e.key === "1") {
    let blockX = Math.floor(player.x / 50) * 50;
    let blockY = Math.floor((player.y + player.height - 1) / 50) * 50;

    const exists = blocks.some(b => b.x === blockX && b.y === blockY);
    if (!exists) {
      blocks.push({
        x: blockX,
        y: blockY,
        width: 50,
        height: 50,
        color: "white",
        vy: 0,
        isFalling: true
      });
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Update function
function update() {
  // Horizontal movement
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  // Assume player is airborne until proven grounded
  player.grounded = false;

  // Gravity only applies if S is held or player is jumping/falling
  if (keys.s || player.vy !== 0) {
    player.vy += player.gravity;
    player.y += player.vy;
  }

  // Block collision detection (vertical)
  for (let block of blocks) {
    const touchingHorizontally =
      player.x + player.width > block.x && player.x < block.x + block.width;
    const fallingOntoBlock =
      player.y + player.height <= block.y && player.y + player.height + player.vy >= block.y;

    if (touchingHorizontally && fallingOntoBlock) {
      player.y = block.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Floor collision
  const floorY = canvas.height - player.height;
  if (player.y > floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
  }

  // Jumping only if grounded
  if (keys.w && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
  }

  // Wall collision
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }

  // Update blocks (falling behavior)
  for (let block of blocks) {
    if (block.isFalling) {
      block.vy += 0.5;
      block.y += block.vy;

      // Hit floor
      if (block.y + block.height > canvas.height) {
        block.y = canvas.height - block.height;
        block.vy = 0;
        block.isFalling = false;
      }

      // Stack on other blocks
      for (let other of blocks) {
        if (block === other) continue;

        const touchHoriz = block.x + block.width > other.x && block.x < other.x + other.width;
        const fallOn = block.y + block.height <= other.y &&
                       block.y + block.height + block.vy >= other.y;

        if (touchHoriz && fallOn) {
          block.y = other.y - block.height;
          block.vy = 0;
          block.isFalling = false;
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

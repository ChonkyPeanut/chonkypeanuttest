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
  let blockX = Math.floor(player.x / 50) * 50;
  let blockY = Math.floor((player.y + player.height - 1) / 50) * 50;

  // Prevent duplicates
  const alreadyExists = blocks.some(b => b.x === blockX && b.y === blockY);
  if (!alreadyExists) {
    blocks.push({
      x: blockX,
      y: blockY,
      width: 50,
      height: 50,
      color: "white",
      vy: 0,               // falling velocity
      isFalling: true      // gravity enabled
    });
  }
}

});

function update() {
  // Horizontal movement
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  // Apply gravity
  player.vy += player.gravity;
  player.y += player.vy;
  player.grounded = false; // assume airborne

  // Check for collision with blocks
  for (let block of blocks) {
    const touchingHorizontally =
      player.x + player.width > block.x && player.x < block.x + block.width;
    const fallingOntoBlock =
      player.y + player.height <= block.y && player.y + player.height + player.vy >= block.y;

    if (touchingHorizontally && fallingOntoBlock) {
      // Land on block
      player.y = block.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }

    
  }

  // Allow jumping only when grounded
  if (keys.w && player.grounded) {
    player.vy = player.jumpStrength;
    player.grounded = false;
  }

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

  //blocks code
  for (let block of blocks) {
  if (block.isFalling) {
    block.vy += 0.5; // gravity
    block.y += block.vy;

    // Stop at the floor
    if (block.y + block.height > canvas.height) {
      block.y = canvas.height - block.height;
      block.vy = 0;
      block.isFalling = false;
    }

    // Check collision with other blocks (stacking)
    for (let other of blocks) {
      if (block === other) continue;

      const isTouchingHorizontally = block.x + block.width > other.x && block.x < other.x + other.width;
      const isFallingOnto = block.y + block.height <= other.y &&
                            block.y + block.height + block.vy >= other.y;

      if (isTouchingHorizontally && isFallingOnto) {
        block.y = other.y - block.height;
        block.vy = 0;
        block.isFalling = false;
      }
    }
  }
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

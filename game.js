const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let x = 100;
let y = 100;

function draw() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'red';
  ctx.fillRect(x, y, 50, 50);
}

function update() {
  x += 1;
  draw();
  requestAnimationFrame(update);
}

update();

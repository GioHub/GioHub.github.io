//fix image animtion 
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const colours = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];
const maxParticles = 800;
let particles = [];

let cx = width / 2;
let cy = height / 2;

window.addEventListener('mousemove', (e) => {
  cx = e.clientX;
  cy = e.clientY;
});


class Particle {
  constructor(x, y, vx, vy, radius, colour) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.colour = colour;
  }
  move() {
    if (this.y > height || this.y < 0 || this.x > width || this.x < 0) {
      this.reset();
    }

    this.x += this.vx;
    this.y += this.vy;
  }
  reset() {
    this.x = cx;
    this.y = cy;
    this.vx = 2 + Math.random() * - 4;
    this.vy = 2 + Math.random() * - 4;
    this.radius = 1 + Math.random();
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.colour;
    ctx.fill();
  }
}

function initParticles() {
  for (let i = 0; i < maxParticles; i++) {
    setTimeout(createParticle, 10 * i, i);
  }
}

function createParticle(i) {
  let p = new Particle(
    Math.floor(Math.random() * width),
    Math.floor(Math.random() * height),
    1.5 + Math.random() * - 3,
    1.5 + Math.random() * - 3,
    1 + Math.random(),
    colours[Math.floor(Math.random() * colours.length)]
  );
  particles.push(p);
}
function loop() {
  ctx.clearRect(0, 0, width, height);
  for (let particle of particles) {
    particle.move();
    particle.draw(ctx);
  }
  requestAnimationFrame(loop);
}

initParticles();
loop();

window.addEventListener('resize', resize);
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
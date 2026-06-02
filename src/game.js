// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


// UI
const scoreSpan = document.getElementById('score');
const livesSpan = document.getElementById('lives');
const highScoreSpan = document.getElementById('highscore');
const messageDiv = document.getElementById('message');

// ========== Sound Engine (Web Audio API – no files needed) ==========
let audioCtx = null;
function initAudio() {
if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playBeep(freq, duration, type = 'square', vol = 0.1) {
     if (!audioCtx) return;
 const osc = audioCtx.createOscillator();
 const gain = audioCtx.createGain();
osc.type = type;
osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
     osc.start();
       osc.stop(audioCtx.currentTime + duration);
}


// Sound shortcuts
function soundShoot() { playBeep(800, 0.1, 'square', 0.08); }
function soundExplosion() { playBeep(100, 0.3, 'sawtooth', 0.1); }
function soundHit() { playBeep(200, 0.5, 'triangle', 0.12); }
function soundPowerUp() { playBeep(1200, 0.2, 'sine', 0.1); setTimeout(()=>playBeep(1600,0.15,'sine',0.1),150); }


// ========== Game State ==========
let player, bullets, asteroids, particles, powerUps;
let keys = {};
let score, lives, highScore;
let gameOver = false;
let gamePaused = false;

// Difficulty
let spawnTimer = 0;
let spawnDelay = 70;         // frames between spawns (decreases over time)
let asteroidSpeedMultiplier = 1;
let scoreMultiplier = 1;

// Rapid fire
let rapidFireActive = false;
let rapidFireTimer = 0;
let shootCooldown = 0;
 
// Screen shake
let shakeAmount = 0;
let shakeDuration = 0;

// Load high score
highScore = parseInt(localStorage.getItem('neoHighScore')) || 0;
highScoreSpan.textContent = highScore;

// NASA data 
let neoList = [];

// ========== Helper: Spawn asteroid from NASA data ==========
function spawnAsteroid() {
  if (neoList.length === 0) return;
  const neo = neoList[Math.floor(Math.random() * neoList.length)];
  const x = 20 + Math.random() * (canvas.width - 40);
  const asteroid = new Asteroid(
    x, -60,
    neo.radius,
    neo.speed * asteroidSpeedMultiplier,
    neo.name,
    neo.missDistance
  );
  asteroids.push(asteroid);

  // Warning for big/close asteroids
  if (neo.radius > 35 || neo.missDistance < 50000) {
    messageDiv.textContent = `⚠️ WARNING: ${neo.name} approaching!`;
    setTimeout(() => { if (messageDiv.textContent.includes(neo.name)) messageDiv.textContent = ''; }, 2000);
  }
}

// ========== Spawn power‑up occasionally ==========
function maybeSpawnPowerUp() {
  if (Math.random() < 0.005) { // 0.5% chance per frame
    const type = Math.random() < 0.5 ? 'shield' : 'rapid';
    const x = 30 + Math.random() * (canvas.width - 60);
    powerUps.push(new PowerUp(x, -20, type));
  }
}


// ========== Collision Detection ==========
function checkCollisions() {
  // Bullets vs asteroids
  for (let i = asteroids.length-1; i >= 0; i--) {
    const a = asteroids[i];
    for (let j = bullets.length-1; j >= 0; j--) {
      const b = bullets[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx*dx + dy*dy < (a.radius + b.radius)**2) {
        // Destroy asteroid, bullet, add particles
        for (let k=0; k<12; k++) particles.push(new Particle(a.x, a.y, '#f80'));
        soundExplosion();
        asteroids.splice(i,1);
        bullets.splice(j,1);
        score += 10 * scoreMultiplier;
        scoreSpan.textContent = score;
        break;
      }
    }
  }

// Player vs asteroid
  for (let i = asteroids.length-1; i >= 0; i--) {
    const a = asteroids[i];
    // Rectangle-circle collision
    const closestX = Math.max(player.x, Math.min(a.x, player.x + player.width));
    const closestY = Math.max(player.y, Math.min(a.y, player.y + player.height));
    const dist = Math.sqrt((a.x-closestX)**2 + (a.y-closestY)**2);
    if (dist < a.radius) {
      asteroids.splice(i,1);
      for (let k=0; k<15; k++) particles.push(new Particle(a.x, a.y, '#f00'));

      if (player.shieldActive) {
        // Shield absorbs hit – visual feedback
        player.shieldActive = false;
        soundPowerUp(); // reuse powerup sound for shield break
        shakeAmount = 5;
        shakeDuration = 10;
        } else {
             lives--;
        livesSpan.textContent = lives;
        soundHit();
        shakeAmount = 15;
        shakeDuration = 20;
        if (lives <= 0) {
          gameOver = true;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('neoHighScore', highScore);
            highScoreSpan.textContent = highScore;
            messageDiv.textContent = '🏆 NEW HIGH SCORE! 🏆';
          }
        }
      }
    }
  }

  // Player vs power‑up
  for (let i = powerUps.length-1; i >= 0; i--) {
    const pu = powerUps[i];
    if (pu.x > player.x && pu.x < player.x + player.width &&
        pu.y > player.y && pu.y < player.y + player.height) {
      soundPowerUp();
      if (pu.type === 'shield') {
        player.activateShield(300);
      } else if (pu.type === 'rapid') {
        rapidFireActive = true;
        rapidFireTimer = 300;
      }
      powerUps.splice(i,1);
    }
  }

  // Remove off‑screen objects
  asteroids = asteroids.filter(a => a.y - a.radius < canvas.height + 60);
  bullets = bullets.filter(b => b.y > -10);
  powerUps = powerUps.filter(p => p.y < canvas.height + 30);
}

// ========== Update objects ==========
function update() {
  if (gameOver) return;

  // Screen shake logic
  if (shakeDuration > 0) shakeDuration--;

  // Rapid fire timer
  if (rapidFireActive) {
    rapidFireTimer--;
    if (rapidFireTimer <= 0) rapidFireActive = false;
  }

// Player
  player.update(keys, canvas);

  // Shooting (cooldown controlled)
  if (shootCooldown > 0) shootCooldown--;
  if (keys['Space'] && shootCooldown <= 0) {
    const bulletX = player.x + player.width/2;
    const bulletY = player.y;
    bullets.push(new Bullet(bulletX, bulletY));
    soundShoot();
    shootCooldown = rapidFireActive ? 5 : 15; // rapid fire shoots faster
  }

// Spawning asteroids
  if (spawnTimer <= 0) {
    spawnAsteroid();
    spawnTimer = spawnDelay;
  }
  spawnTimer--;

  // Increase difficulty over time (every 500 points)
  spawnDelay = Math.max(30, 70 - Math.floor(score / 500) * 5);
  asteroidSpeedMultiplier = 1 + Math.floor(score / 1000) * 0.2;

  // Spawn power‑ups
  maybeSpawnPowerUp();

  // Update all entities
  bullets.forEach(b => b.update());
  asteroids.forEach(a => a.update());
  powerUps.forEach(p => p.update());
  particles.forEach(p => p.update());

  // Remove dead particles
  particles = particles.filter(p => p.life > 0);

  // Collisions
  checkCollisions();
}

// ========== Drawing ==========
function drawStarfield() {
  // Layered starfield (parallax)
  for (let layer = 0; layer < 2; layer++) {
    const speed = layer === 0 ? 0.5 : 1.5;
    const count = layer === 0 ? 40 : 60;
    ctx.fillStyle = layer === 0 ? '#888' : '#fff';
    for (let i = 0; i < count; i++) {
      const x = (i * 137.5 + 31) % canvas.width;
      const y = ((i * 73.1 + Date.now() * speed * 0.01) % canvas.height);
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply screen shake offset
  ctx.save();
  if (shakeDuration > 0) {
    const dx = (Math.random() - 0.5) * shakeAmount;
    const dy = (Math.random() - 0.5) * shakeAmount;
    ctx.translate(dx, dy);
  }

  drawStarfield();

  if (!gameOver) {
    player.draw(ctx);
    bullets.forEach(b => b.draw(ctx));
    asteroids.forEach(a => a.draw(ctx));
    powerUps.forEach(p => p.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    // Show rapid fire indicator
    if (rapidFireActive) {
      ctx.fillStyle = '#ff0';
      ctx.font = '12px monospace';
      ctx.fillText('RAPID FIRE', player.x + player.width/2 - 30, player.y - 15);
    }
  } else {
    // Game Over overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f00';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 30);
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 20);
    ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 60);
  }

  ctx.restore();
}

// ========== Game Loop ==========
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ========== Restart ==========
function restartGame() {
  player = new Player(canvas.width/2 - 15, canvas.height - 70);
  bullets = [];
  asteroids = [];
  particles = [];
  powerUps = [];
  lives = 3;
  score = 0;
  gameOver = false;
  spawnTimer = 0;
  spawnDelay = 70;
  asteroidSpeedMultiplier = 1;
  scoreMultiplier = 1;
  rapidFireActive = false;
  rapidFireTimer = 0;
  shootCooldown = 0;
  shakeAmount = 0;
  shakeDuration = 0;
  messageDiv.textContent = '';
  livesSpan.textContent = lives;
  scoreSpan.textContent = score;
}

// ========== Keyboard Handling ==========
window.addEventListener('keydown', e => {
  if (e.code === 'Space') e.preventDefault();
  keys[e.code] = true;

  // Start audio context on first key press (browser policy)
  initAudio();

  if (e.code === 'KeyR' && gameOver) restartGame();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ========== Startup ==========
async function init() {
  ctx.fillStyle = '#0ff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Connecting to NASA...', canvas.width/2, canvas.height/2);
  neoList = await fetchNEOData();
  restartGame();
  gameLoop();
}

init();
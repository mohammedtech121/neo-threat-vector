// entities.js

// ========== Player ship ==========
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 40;
    this.speed = 6;
    this.shieldActive = false;
    this.shieldTimer = 0;
  }

  update(keys, canvas) {
    if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));

    // Shield timer countdown
    if (this.shieldActive) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }
  }

  draw(ctx) {
    // Ship body (cyan glow)
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width/2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shield bubble if active
    if (this.shieldActive) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, 30, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  activateShield(duration = 300) {
    this.shieldActive = true;
    this.shieldTimer = duration;
  }
}

// ========== Bullet ==========
class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 3;
    this.speed = 8;
  }

  update() {
    this.y -= this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = '#ff0';
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ========== Asteroid (uses NASA data) ==========
class Asteroid {
  constructor(x, y, radius, speed, name, missDistance = 0) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.name = name;
    this.missDistance = missDistance; // in km
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.05;
  }

  update() {
    this.y += this.speed;
    this.rotation += this.rotSpeed;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Rocky shape with orange stroke
    ctx.strokeStyle = '#f80';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#f80';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const sides = 10;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const r = this.radius * (0.8 + Math.random() * 0.4);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 0, -this.radius - 8);

    ctx.restore();
  }
}

// ========== Particle (for explosions) ==========
class Particle {
  constructor(x, y, color = '#f80') {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 1.0;
    this.decay = 0.02 + Math.random() * 0.04;
    this.color = color;
    this.radius = 2 + Math.random() * 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ========== Power‑up ==========
class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.type = type; // 'shield' or 'rapid'
    this.speed = 2;
  }


  update() {
    this.y += this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = this.type === 'shield' ? '#0ff' : '#ff0';
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.type === 'shield' ? '#0ff' : '#ff0';
    ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.type === 'shield' ? 'S' : 'R', this.x, this.y + 4);
  }
}
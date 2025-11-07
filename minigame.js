;(function(){
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const healthEl = document.getElementById('health');
  const startBtn = document.getElementById('startGame');
  const pauseBtn = document.getElementById('pauseGame');

  let W = canvas.width, H = canvas.height;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  function resize(){
    const cssW = Math.min(1280, canvas.clientWidth || 720);
    const cssH = cssW * 9/16;
    canvas.width = cssW * DPR; canvas.height = cssH * DPR; canvas.style.height = cssH+'px';
    W = canvas.width; H = canvas.height;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  let best = Number(localStorage.getItem('artifact_best_shooter')||0);
  bestEl.textContent = String(best);

  const input = { mx: W/2, my: H/2, shooting: false };
  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    input.mx = (e.clientX - rect.left);
    input.my = (e.clientY - rect.top);
  });
  canvas.addEventListener('pointerdown', ()=> input.shooting = true);
  canvas.addEventListener('pointerup', ()=> input.shooting = false);
  window.addEventListener('blur', ()=> input.shooting = false);

  const player = { x: W*0.5, y: H*0.7, r: 14, speed: 5, health: 100, reload: 0 };
  const bullets = [];
  const enemies = [];
  const orbs = [];
  let running = false, paused = false, score = 0, tick = 0;

  function spawn(){
    // enemies
    if (Math.random() < 0.02 + Math.min(0.012, tick/80000)){
      const side = Math.random() < 0.5 ? -20 : W+20;
      const y = 80 + Math.random()*(H-160);
      const speed = 1.5 + Math.random()*1.8;
      enemies.push({ x: side, y, r: 14, vx: side<0? speed: -speed, vy: 0 });
    }
    // orbs (score pickups)
    if (Math.random() < 0.012){
      orbs.push({ x: Math.random()*W, y: -10, r: 8, vy: 1.2 });
    }
  }

  function shoot(){
    if (player.reload > 0) return;
    const dx = input.mx - player.x; const dy = input.my - player.y;
    const len = Math.hypot(dx, dy) || 1;
    const sp = 8;
    bullets.push({ x: player.x, y: player.y, vx: dx/len*sp, vy: dy/len*sp, life: 90 });
    player.reload = 8; // frames
  }

  function update(){
    tick++;
    if (player.reload > 0) player.reload--;
    // move player slightly towards cursor for mouse-based feel
    player.x += (input.mx - player.x) * 0.06;
    player.y += (input.my - player.y) * 0.06;
    player.x = Math.max(20, Math.min(W-20, player.x));
    player.y = Math.max(40, Math.min(H-40, player.y));

    if (input.shooting) shoot();

    // move bullets
    for (let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; b.x+=b.vx; b.y+=b.vy; if (--b.life<=0 || b.x< -20||b.x>W+20||b.y<-20||b.y>H+20) bullets.splice(i,1); }

    // move enemies
    for (let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; e.x+=e.vx; e.y+=e.vy; if (e.x<-40 || e.x>W+40) enemies.splice(i,1); }

    // orbs fall
    for (let i=orbs.length-1;i>=0;i--){ const o=orbs[i]; o.y += o.vy; if (o.y>H+20) orbs.splice(i,1); }

    // collisions: bullets vs enemies
    for (let i=enemies.length-1;i>=0;i--){ const e=enemies[i];
      for (let j=bullets.length-1;j>=0;j--){ const b=bullets[j]; const dx=b.x-e.x, dy=b.y-e.y; if (dx*dx+dy*dy < (e.r+4)*(e.r+4)) { enemies.splice(i,1); bullets.splice(j,1); score += 10; break; } }
    }

    // collisions: player vs enemies
    for (let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; const dx=player.x-e.x, dy=player.y-e.y; if (dx*dx+dy*dy < (player.r+e.r)*(player.r+e.r)) { enemies.splice(i,1); player.health -= 20; if (player.health<=0) return gameOver(); } }

    // pickups
    for (let i=orbs.length-1;i>=0;i--){ const o=orbs[i]; const dx=player.x-o.x, dy=player.y-o.y; if (dx*dx+dy*dy < (player.r+o.r)*(player.r+o.r)) { score += 5; orbs.splice(i,1); } }

    // spawn
    spawn();
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i=0;i<10;i++){ const y = 60 + i*(H-120)/10 + Math.sin((tick*0.03)+i)*2; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // player
    ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
    // gun direction line
    ctx.strokeStyle = 'rgba(233,196,106,0.6)'; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(input.mx, input.my); ctx.stroke();
    // bullets
    ctx.fillStyle = '#fff'; bullets.forEach(b=>{ ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill(); });
    // enemies
    ctx.fillStyle = '#ff6b6b'; enemies.forEach(e=>{ ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill(); });
    // orbs
    ctx.fillStyle = '#00d4ff'; orbs.forEach(o=>{ ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill(); });

    // HUD
    scoreEl.textContent = String(Math.floor(score));
    healthEl.textContent = String(Math.max(0, Math.floor(player.health)));
  }

  function loop(){
    if (!running) return;
    if (!paused){ update(); draw(); }
    requestAnimationFrame(loop);
  }

  function gameOver(){
    running = false;
    best = Math.max(best, Math.floor(score));
    localStorage.setItem('artifact_best_shooter', String(best));
    bestEl.textContent = String(best);
  }

  function start(){
    score = 0; tick = 0; bullets.length = 0; enemies.length = 0; orbs.length = 0; paused = false;
    player.x = W*0.5; player.y = H*0.7; player.health = 100; player.reload = 0;
    running = true; loop();
  }

  startBtn?.addEventListener('click', start);
  pauseBtn?.addEventListener('click', ()=> paused = !paused);
})();



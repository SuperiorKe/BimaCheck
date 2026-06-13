// ═══════════════════════════════════════════════════════
//  WORLD ENGINE — canvas rendering for the living garden
// ═══════════════════════════════════════════════════════

const World = (() => {
  let canvas, ctx, W, H, raf;
  let flowers = [];   // {x,y,color,size,sway,phase,label}
  let stars   = [];
  let fireflies = [];
  let petals  = [];
  let t = 0;          // animation tick

  // ── Sky gradient keyframes (hour → {top, bottom}) ─────
  const SKY = [
    [0,  '#03001a', '#0d0033'],
    [4,  '#03001a', '#0d0033'],
    [5,  '#3d0c2b', '#a83256'],
    [6,  '#c2390f', '#f97316'],
    [7,  '#1d6a96', '#f9a825'],
    [9,  '#1a73b3', '#87ceeb'],
    [12, '#0d52a0', '#4da6e8'],
    [16, '#0d52a0', '#4da6e8'],
    [18, '#7b2fa0', '#f97316'],
    [19, '#9b1d4a', '#e85d04'],
    [20, '#1a0540', '#5c1b75'],
    [21, '#0a0225', '#1a0540'],
    [22, '#03001a', '#0d0033'],
    [24, '#03001a', '#0d0033'],
  ];

  function lerpColor(a, b, t) {
    const p = (hex) => [
      parseInt(hex.slice(1,3),16),
      parseInt(hex.slice(3,5),16),
      parseInt(hex.slice(5,7),16)
    ];
    const ca = p(a), cb = p(b);
    const r = Math.round(ca[0] + (cb[0]-ca[0])*t);
    const g = Math.round(ca[1] + (cb[1]-ca[1])*t);
    const bv= Math.round(ca[2] + (cb[2]-ca[2])*t);
    return `rgb(${r},${g},${bv})`;
  }

  function getSkyColors() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes()/60;
    for (let i = 0; i < SKY.length-1; i++) {
      if (h >= SKY[i][0] && h < SKY[i+1][0]) {
        const frac = (h - SKY[i][0]) / (SKY[i+1][0] - SKY[i][0]);
        return {
          top:    lerpColor(SKY[i][1],   SKY[i+1][1],   frac),
          bottom: lerpColor(SKY[i][2],   SKY[i+1][2],   frac),
        };
      }
    }
    return { top: SKY[0][1], bottom: SKY[0][2] };
  }

  function isNight() {
    const h = new Date().getHours();
    return h >= 20 || h < 6;
  }

  function isDusk() {
    const h = new Date().getHours();
    return h >= 17 && h < 20;
  }

  // ── Stars ──────────────────────────────────────────────
  function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        r: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
      });
    }
  }

  function drawStars(alpha) {
    if (alpha <= 0) return;
    stars.forEach(s => {
      const blink = 0.5 + 0.5 * Math.sin(s.twinkle + t * s.speed);
      ctx.beginPath();
      ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,220,${alpha * blink * 0.9})`;
      ctx.fill();
    });
  }

  // ── Moon ──────────────────────────────────────────────
  function drawMoon(alpha) {
    if (alpha <= 0) return;
    const mx = W * 0.82, my = H * 0.12;
    // glow
    const g = ctx.createRadialGradient(mx,my,0,mx,my,50);
    g.addColorStop(0, `rgba(255,255,200,${alpha*0.15})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(mx-50,my-50,100,100);
    // moon disc
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,253,210,${alpha})`;
    ctx.fill();
  }

  // ── Sun ───────────────────────────────────────────────
  function drawSun() {
    const h = new Date().getHours() + new Date().getMinutes()/60;
    if (h < 6 || h > 20) return;
    const frac = (h - 6) / 14;
    const sx = W * (0.1 + frac * 0.8);
    const sy = H * (0.08 + 0.25 * Math.sin(Math.PI * frac));
    const g = ctx.createRadialGradient(sx,sy,0,sx,sy,60);
    g.addColorStop(0,   'rgba(255,255,180,0.25)');
    g.addColorStop(0.3, 'rgba(255,220,80,0.15)');
    g.addColorStop(1,   'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(sx-60,sy-60,120,120);
    ctx.beginPath();
    ctx.arc(sx,sy,22,0,Math.PI*2);
    ctx.fillStyle = 'rgba(255,230,80,0.95)';
    ctx.fill();
  }

  // ── Hills ─────────────────────────────────────────────
  function drawHills() {
    const h = new Date().getHours();
    const isN = h >= 20 || h < 6;
    const grassColor = isN
      ? '#0a1f0a' : (h >= 17 ? '#1a3a10' : '#2d5a1b');

    // back hill
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.bezierCurveTo(W*0.1, H*0.52, W*0.35, H*0.42, W*0.5,  H*0.48);
    ctx.bezierCurveTo(W*0.65,H*0.54, W*0.85, H*0.43, W,      H*0.5);
    ctx.lineTo(W,H); ctx.closePath();
    ctx.fillStyle = isN ? '#0d2a0d' : '#3a7a22';
    ctx.fill();

    // front hill
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.bezierCurveTo(W*0.15, H*0.65, W*0.3,  H*0.60, W*0.5,  H*0.63);
    ctx.bezierCurveTo(W*0.7,  H*0.66, W*0.85, H*0.58, W,      H*0.65);
    ctx.lineTo(W,H); ctx.closePath();
    ctx.fillStyle = grassColor;
    ctx.fill();
  }

  // ── Tree (grows with days together) ───────────────────
  function drawTree(days) {
    const baseX = W * 0.5;
    const baseY = H * 0.63;
    const maxH   = H * 0.28;
    const growth = Math.min(1, days / 180);  // fully grown at 6 months
    const trunkH = maxH * (0.25 + 0.75 * growth);
    const trunkW = 6 + 8 * growth;
    const h = new Date().getHours();
    const isN = h >= 20 || h < 6;

    // trunk
    const trunkG = ctx.createLinearGradient(baseX,baseY,baseX,baseY-trunkH);
    trunkG.addColorStop(0, '#4a2508');
    trunkG.addColorStop(1, '#6b3a10');
    ctx.fillStyle = trunkG;
    ctx.beginPath();
    ctx.moveTo(baseX - trunkW/2, baseY);
    ctx.quadraticCurveTo(baseX - trunkW/2, baseY - trunkH*0.5, baseX, baseY - trunkH);
    ctx.quadraticCurveTo(baseX + trunkW/2, baseY - trunkH*0.5, baseX + trunkW/2, baseY);
    ctx.closePath();
    ctx.fill();

    if (growth < 0.05) return;

    // canopy layers
    const leafColor = isN ? '#0d3a0d' : '#2d7a1f';
    const leafColor2 = isN ? '#0a2a0a' : '#3a9a28';
    const tipY = baseY - trunkH;
    const spread = 30 + 80 * growth;

    const blobs = [
      { x: baseX,          y: tipY - 10,        r: spread * 0.65 },
      { x: baseX - spread*0.4, y: tipY + 15,    r: spread * 0.5  },
      { x: baseX + spread*0.4, y: tipY + 12,    r: spread * 0.52 },
      { x: baseX - spread*0.2, y: tipY + 30,    r: spread * 0.45 },
      { x: baseX + spread*0.2, y: tipY + 28,    r: spread * 0.43 },
    ];

    blobs.forEach((b, i) => {
      // glow at night
      if (isN) {
        const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r*1.2);
        g.addColorStop(0, 'rgba(50,160,50,0.05)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r*1.2, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fillStyle = i % 2 === 0 ? leafColor : leafColor2;
      ctx.fill();
    });

    // blossoms when mature
    if (growth > 0.4) {
      const blossomCount = Math.floor(8 * (growth - 0.4) / 0.6);
      for (let i = 0; i < blossomCount; i++) {
        const angle = (i / blossomCount) * Math.PI * 2 + t * 0.001;
        const dist  = spread * (0.3 + 0.4 * ((i * 1.618) % 1));
        const bx = baseX + Math.cos(angle) * dist;
        const by = tipY   + Math.sin(angle) * dist * 0.5 + 10;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,182,193,0.85)';
        ctx.fill();
      }
    }
  }

  // ── Flowers (planted memories) ────────────────────────
  function drawFlowers() {
    flowers.forEach(f => {
      const sway = Math.sin(t * 0.015 + f.phase) * 4;
      const fx = f.x * W, fy = f.y * H;

      // stem
      ctx.beginPath();
      ctx.moveTo(fx, fy + 12);
      ctx.quadraticCurveTo(fx + sway, fy + 4, fx + sway*0.5, fy);
      ctx.strokeStyle = '#2d7a1f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // petals
      for (let p = 0; p < 6; p++) {
        const angle = (p/6) * Math.PI*2 + t * 0.005;
        const px = fx + sway*0.5 + Math.cos(angle) * f.size;
        const py = fy + Math.sin(angle) * f.size * 0.7;
        ctx.beginPath();
        ctx.ellipse(px, py, f.size*0.6, f.size*0.4, angle, 0, Math.PI*2);
        ctx.fillStyle = f.color + 'cc';
        ctx.fill();
      }
      // center
      ctx.beginPath();
      ctx.arc(fx + sway*0.5, fy, f.size*0.4, 0, Math.PI*2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    });
  }

  // ── Fireflies ──────────────────────────────────────────
  function initFireflies() {
    fireflies = [];
    for (let i = 0; i < 14; i++) {
      fireflies.push({
        x: Math.random(), y: 0.4 + Math.random() * 0.3,
        dx: (Math.random()-0.5) * 0.0003,
        dy: (Math.random()-0.5) * 0.0002,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
      });
    }
  }

  function drawFireflies(alpha) {
    if (alpha <= 0) return;
    fireflies.forEach(f => {
      f.x += f.dx; f.y += f.dy;
      if (f.x < 0.05 || f.x > 0.95) f.dx *= -1;
      if (f.y < 0.4  || f.y > 0.75) f.dy *= -1;
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(f.phase + t * f.speed));
      const fx = f.x * W, fy = f.y * H;
      const g = ctx.createRadialGradient(fx,fy,0,fx,fy,6);
      g.addColorStop(0, `rgba(200,255,100,${alpha * blink})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, Math.PI*2);
      ctx.fill();
    });
  }

  // ── Falling petals ─────────────────────────────────────
  function tickPetals() {
    if (petals.length < 12 && Math.random() < 0.05) {
      petals.push({
        x: Math.random(), y: 0,
        vx: (Math.random()-0.5)*0.001, vy: 0.0008 + Math.random()*0.0005,
        rot: Math.random()*Math.PI*2, rotV: (Math.random()-0.5)*0.05,
        life: 1, size: 3 + Math.random()*3,
        color: ['#f9a8d4','#fecdd3','#fbcfe8','#f0abfc'][Math.floor(Math.random()*4)]
      });
    }
    petals = petals.filter(p => p.life > 0);
    petals.forEach(p => {
      p.x += p.vx + Math.sin(t*0.01+p.y*10)*0.0002;
      p.y += p.vy;
      p.rot += p.rotV;
      p.life -= 0.002;
      ctx.save();
      ctx.translate(p.x*W, p.y*H);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0,0,p.size,p.size*0.5,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // ── Main render loop ───────────────────────────────────
  function render(days) {
    t++;
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;

    // Sky
    const sky = getSkyColors();
    const grad = ctx.createLinearGradient(0,0,0,H*0.7);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    const h = new Date().getHours();
    const nightAlpha = h >= 21 || h < 5 ? 1 : h >= 20 ? (h-20) : h < 6 ? (6-h)/1 : 0;
    const clampedNight = Math.max(0, Math.min(1, nightAlpha));
    const duskAlpha   = Math.max(0, Math.min(1, h >= 17 && h < 21 ? 1 : 0));

    drawStars(clampedNight);
    drawMoon(clampedNight);
    drawSun();
    drawHills();
    drawTree(days);
    drawFlowers();
    tickPetals();
    drawFireflies(Math.max(clampedNight, duskAlpha * 0.5));

    raf = requestAnimationFrame(() => render(days));
  }

  return {
    init(canvasEl) {
      canvas = canvasEl;
      ctx = canvas.getContext('2d');
      initStars();
      initFireflies();
    },

    start(days) {
      if (raf) cancelAnimationFrame(raf);
      render(days);
    },

    stop() {
      if (raf) cancelAnimationFrame(raf);
    },

    setFlowers(items) {
      flowers = items.map(item => ({
        x:     item.x,
        y:     0.55 + item.y * 0.12,
        color: item.color || '#f9a8d4',
        size:  5 + Math.random() * 4,
        sway:  (Math.random()-0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        label: item.title,
        id:    item.id,
      }));
    },

    addFlower(item) {
      flowers.push({
        x:     item.x,
        y:     0.55 + item.y * 0.12,
        color: item.color || '#f9a8d4',
        size:  5 + Math.random() * 4,
        sway:  (Math.random()-0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        label: item.title,
        id:    item.id,
      });
    },

    // returns the {x, y} in world-relative coords from a click event
    clickToWorld(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
      };
    }
  };
})();

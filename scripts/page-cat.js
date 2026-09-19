(() => {
  'use strict';
  const canvas = document.getElementById('page-cat');
  const toggle = document.getElementById('cat-toggle');
  const controls = document.getElementById('cat-controls');
  const ctx = canvas?.getContext('2d');
  if (!ctx || !toggle) return;

  // Decorative companion: never intercept links or change the native cursor.
  const allowed = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const size = 64;
  const palette = { outline: '#737c78', fur: '#fffdf7', shade: '#dfe3df', gray: '#9da6a1', dark: '#3e4743', pink: '#edb5af', eye: '#a9b78a' };
  let enabled = true;
  try { enabled = localStorage.getItem('page-cat-enabled') !== 'false'; } catch { /* Storage is optional. */ }
  let x = Math.max(8, innerWidth - size - 28);
  let y = Math.max(8, innerHeight - size - 28);
  let targetX = x;
  let targetY = y;
  let facing = 1;
  let lastMotion = performance.now();
  let lastTick = 0;
  let lastPaint = 0;
  let frame = 0;
  let inside = true;

  function rect(color, x, y, w, h) {
    ctx.fillStyle = palette[color];
    ctx.fillRect(x, y, w, h);
  }

  // A small, simple face: white cheeks, gray tabby cap, and pink nose.
  function head(x, y, blink) {
    const dot = (color, dx, dy, w, h) => rect(color, x + dx, y + dy, w, h);
    for (const ex of [1, 11]) {
      dot('outline', ex + 1, 2, 2, 1);
      dot('outline', ex, 3, 4, 4);
      dot('fur', ex + 1, 3, 2, 3);
      dot('pink', ex + 1, 4, 2, 1);
    }
    dot('outline', 2, 5, 12, 10);
    dot('outline', 1, 7, 14, 6);
    dot('fur', 3, 6, 10, 8);
    dot('fur', 2, 7, 12, 5);
    dot('gray', 4, 5, 8, 2);
    dot('dark', 5, 5, 1, 3);
    dot('dark', 10, 5, 1, 3);
    dot('fur', 7, 6, 2, 2);
    for (const ex of [4, 10]) {
      dot('dark', ex, 9, 2, blink ? 1 : 3);
      if (!blink) dot('eye', ex, 9, 1, 1);
    }
    dot('pink', 7, 12, 2, 1);
  }

  function draw(pose, step, blink = false) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.save();
    ctx.scale(2, 2);
    if (facing < 0) { ctx.translate(32, 0); ctx.scale(-1, 1); }
    if (pose === 'sleep') {
      rect('outline', 6, 21, 23, 8);
      rect('outline', 9, 18, 17, 11);
      rect('fur', 7, 22, 21, 6);
      rect('fur', 10, 19, 15, 8);
      rect('gray', 17, 19, 7, 4);
      rect('dark', 19, 19, 2, 3);
      head(3, 12, true);
      rect('dark', 17, 27, 12, 3);
      rect('gray', 19, 27, 2, 3);
      rect('gray', 24, 27, 2, 3);
      // A small pixel Z above the curled-up cat.
      rect('gray', 25, 9, 5, 1);
      rect('gray', 28, 10, 1, 1);
      rect('gray', 27, 11, 1, 1);
      rect('gray', 26, 12, 1, 1);
      rect('gray', 25, 13, 5, 1);
    } else if (pose === 'walk') {
      const stride = step % 2;
      rect('dark', 3, 8 + stride, 3, 12);
      rect('dark', 5, 17, 5, 4);
      rect('gray', 3, 10 + stride, 3, 2);
      rect('gray', 3, 15 + stride, 3, 2);
      rect('outline', 8, 16, 17, 9);
      rect('fur', 9, 17, 15, 7);
      rect('gray', 10, 17, 8, 3);
      rect('dark', 12, 17, 2, 3);
      rect('gray', 18, 18, 3, 3);
      for (const [leg, lift] of [[9, stride], [13, 1 - stride], [20, 1 - stride], [24, stride]]) {
        rect('outline', leg, 23, 3, 5 - lift);
        rect('fur', leg, 23, 2, 4 - lift);
        rect('fur', leg + (lift ? 1 : 0), 27 - lift, 3, 1);
      }
      head(15, 5 + stride, blink);
    } else {
      rect('dark', 23, 21, 5, 8);
      rect('dark', 20, 27, 8, 3);
      rect('gray', 24, 22, 4, 2);
      rect('gray', 23, 27, 2, 3);
      rect('outline', 9, 17, 14, 12);
      rect('fur', 10, 18, 12, 10);
      rect('gray', 10, 19, 4, 6);
      rect('dark', 10, 21, 3, 2);
      rect('shade', 15, 23, 1, 5);
      rect('shade', 20, 23, 1, 5);
      rect('fur', 12, 28, 5, 2);
      rect('fur', 19, 28, 5, 2);
      head(8, 3, blink);
    }
    ctx.restore();
  }

  const clamp = (value, limit) => Math.max(4, Math.min(value, Math.max(4, limit - size - 4)));
  const active = () => enabled && allowed.matches && inside && !document.hidden;

  function tick(now) {
    frame = 0;
    if (!active()) return;
    const dt = Math.min((now - (lastTick || now)) / 1000, 0.05);
    lastTick = now;
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.hypot(dx, dy);
    const walking = distance > 3;
    if (walking) {
      const travel = Math.min(distance, 230 * dt);
      x += dx / distance * travel;
      y += dy / distance * travel;
      if (Math.abs(dx) > 3) facing = dx > 0 ? 1 : -1;
      lastMotion = now;
    }
    canvas.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    const asleep = !walking && now - lastMotion > 4500;
    if (now - lastPaint > 100 || asleep) {
      draw(asleep ? 'sleep' : walking ? 'walk' : 'sit', Math.floor(now / 120), now % 3200 < 160);
      lastPaint = now;
    }
    if (!asleep) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (active() && !frame) { lastTick = 0; frame = requestAnimationFrame(tick); }
  }

  function sync() {
    toggle.hidden = !allowed.matches;
    if (controls) controls.hidden = !allowed.matches;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'cat on' : 'cat off';
    canvas.hidden = !active();
    if (!active()) { cancelAnimationFrame(frame); frame = 0; }
    else { lastMotion = performance.now(); wake(); }
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !allowed.matches || !enabled) return;
    inside = true;
    targetX = clamp(event.clientX - size - 24, innerWidth);
    targetY = clamp(event.clientY + 20, innerHeight);
    lastMotion = performance.now();
    canvas.hidden = false;
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { inside = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('blur', () => { inside = false; sync(); });
  window.addEventListener('resize', () => {
    x = clamp(x, innerWidth); y = clamp(y, innerHeight);
    targetX = clamp(targetX, innerWidth); targetY = clamp(targetY, innerHeight);
    lastMotion = performance.now(); wake();
  });
  allowed.addEventListener('change', sync);
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('page-cat-enabled', String(enabled)); } catch { /* Storage is optional. */ }
    inside = true;
    sync();
  });
  sync();
})();

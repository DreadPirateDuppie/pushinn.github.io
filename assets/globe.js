/* Pushinn ambient dot-matrix globe. Pure canvas, no dependencies.
   Land mask: 720x360 bitmap (0.5 deg cells, row 0 = 90N, col 0 = 180W), row run-length encoded
   (varint runs, alternating water/land, starting with water) then base64. Derived from countries.geojson. */
(function () {
  var cv = document.getElementById('globe-canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var W = 720, H = 360, RES = 0.5, D = Math.PI / 180;
  var LON = -0.1278, LAT = 51.5074;       // London
  var TILT = -8 * D, CT = Math.cos(TILT), ST = Math.sin(TILT);
  function setTilt(t) { TILT = Math.max(-100 * D, Math.min(5 * D, t)); CT = Math.cos(TILT); ST = Math.sin(TILT); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w, h, R, cx, cy, dpr, rot = LON * D, t0 = 0, last = 0, raf = 0;

  // decode RLE mask into land cells (sin/cos of lat, lon precomputed) and a sparse ocean grid
  var bin = atob('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'), bp = 0, grid = new Uint8Array(W * H), r, c, n, run, b, sh, v;
  for (r = 0; r < H; r++) {
    c = 0; v = 0;
    while (c < W) {
      run = 0; sh = 0;
      do { b = bin.charCodeAt(bp++); run += (b & 127) << sh; sh += 7; } while (b & 128);
      if (v) grid.fill(1, r * W + c, r * W + c + run);
      c += run; v ^= 1;
    }
  }
  var cnt = 0, i;
  for (i = 0; i < grid.length; i++) cnt += grid[i];
  var lcp = new Float32Array(cnt), lsp = new Float32Array(cnt), lcl = new Float32Array(cnt), lsl = new Float32Array(cnt);
  var ocp = [], osp = [], ocl = [], osl = [], k = 0, la, lo, st = 12;       // ocean dots every 6 deg
  for (r = 0; r < H; r++) {
    la = (90 - (r + 0.5) * RES) * D;
    for (c = 0; c < W; c++) {
      lo = (-180 + (c + 0.5) * RES) * D;
      if (grid[r * W + c]) {
        lcp[k] = Math.cos(la); lsp[k] = Math.sin(la); lcl[k] = Math.cos(lo); lsl[k] = Math.sin(lo); k++;
      } else if (r % st === 6 && c % st === 6) {
        ocp.push(Math.cos(la)); osp.push(Math.sin(la)); ocl.push(Math.cos(lo)); osl.push(Math.sin(lo));
      }
    }
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.max(w * 0.5, 460);
    var cap = R * (w >= 768 ? 0.5 : 0.36);
    cx = w / 2; cy = h - cap + R;
  }

  // orthographic projection of lat/lon (radians); false when on the far side
  var px, py;
  function proj(lon, lat, l0) {
    var dl = lon - l0, cp = Math.cos(lat), sp = Math.sin(lat), cd = Math.cos(dl);
    if (ST * sp + CT * cp * cd <= 0.02) return false;
    px = cx + R * cp * Math.sin(dl);
    py = cy - R * (CT * sp - ST * cp * cd);
    return true;
  }

  function dots(cp, sp, cl, sl, len, l0, s, top) {
    var c0 = Math.cos(l0), s0 = Math.sin(l0), j, cd, sd, z, y, x, h2 = s / 2;
    for (j = 0; j < len; j++) {
      cd = cl[j] * c0 + sl[j] * s0;
      z = ST * sp[j] + CT * cp[j] * cd;
      if (z <= 0.02) continue;
      y = cy - R * (CT * sp[j] - ST * cp[j] * cd);
      if (y < -4 || y > h + 4) continue;
      sd = sl[j] * c0 - cl[j] * s0;
      x = cx + R * cp[j] * sd;
      if (x < -4 || x > w + 4) continue;
      ctx.fillRect(x - h2, y - h2, s, s);
    }
  }

  function draw(now) {
    var l0 = rot, a;
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,255,65,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,65,0.18)';
    dots(ocp, osp, ocl, osl, ocp.length, l0, Math.max(1, R / 640));
    ctx.fillStyle = '#5d7266';
    dots(lcp, lsp, lcl, lsl, cnt, l0, Math.max(1.1, R / 420));
    // London marker + single sonar ping
    if (proj(LON * D, LAT * D, l0)) {
      ctx.fillStyle = '#00FF41';
      ctx.beginPath(); ctx.arc(px, py, Math.max(2, R / 330), 0, 6.2832); ctx.fill();
      var kk = reduce ? 0.45 : ((now - t0) % 4000) / 4000, ang = kk * 5 * D, n, ok = true;
      ctx.strokeStyle = 'rgba(0,255,65,' + (0.55 * (1 - kk)).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      var p1 = LAT * D, sa = Math.sin(ang), ca = Math.cos(ang), sp1 = Math.sin(p1), cp1 = Math.cos(p1);
      for (n = 0; n <= 40; n++) {
        a = n / 40 * 6.2832;
        var lat2 = Math.asin(sp1 * ca + cp1 * sa * Math.cos(a));
        var lon2 = LON * D + Math.atan2(Math.sin(a) * sa * cp1, ca - sp1 * Math.sin(lat2));
        if (!proj(lon2, lat2, l0)) { ok = false; break; }
        if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      if (ok) ctx.stroke();
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;            // ~30fps
    if (!drag && now >= resumeAt) rot += (now - last) * 0.0000625 * (last ? 1 : 0); // ~3.6 deg/s, paused while dragging
    last = now;
    draw(now);
  }
  function start() { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  // Desktop only (wide screen, mouse): drag to turn the globe. Left/right turns it,
  // up/down tilts it so the southern hemisphere can be brought into view.
  var drag = null, resumeAt = 0;
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)').matches) {
    cv.style.pointerEvents = 'auto'; cv.style.cursor = 'grab'; cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY }; cv.style.cursor = 'grabbing';
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      rot -= (e.clientX - drag.x) / R;
      setTilt(TILT + (e.clientY - drag.y) / R);
      drag.x = e.clientX; drag.y = e.clientY;
      draw(performance.now());
    });
    var end = function () { if (drag) { drag = null; cv.style.cursor = 'grab'; resumeAt = performance.now() + 4000; } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }

  size();
  draw(0);
  window.addEventListener('resize', function () { size(); draw(last); });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();
})();

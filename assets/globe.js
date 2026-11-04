/* Pushinn ambient dot-matrix globe. Pure canvas, no dependencies.
   Land mask: 180x90 bitmap (2 deg cells, row 0 = 90N, col 0 = 180W), base64, derived from countries.geojson. */
(function () {
  var cv = document.getElementById('globe-canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var M = atob('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf4AP/AAAAAAAAAAAAAAAAAAAAAAAAX/z///+AAAAAAAABAAAAAAAAAAAAAYd8P///wAA+AAAAAA8AAAAAAAAAAAwAnw////4AAIAAAAAAGAAAAAAAAAAADivwAf//wAAAAADAAf/wAHYAAAAAADoi3sAP//gAAAAAMAD///sAAAAgBgACfwz/AD/+gAAAwAEHf///+/8gBAP/7/nJdjwD/+AAAH/AA7f///////f4P//////h8H/gAAAf/6//f////////Mf/////9H4D8AeAA+ev///////////AP/////4A0B4AAAD5/////////////Af3////gHgA4AAAH5///////////LwAHgH///gHkAAAAAH4/////////+CIAABAB///4D+AAAAGCx/////////4A8AAIAAf///n/gAAAOCD/////////wA4AAAAAf///n/wAAAbP///////////AgAAAAAP/////wAAADf//////////9AAAAAAAF////0YAAAB///////////9AAAAAAAD////8EAAAB///////////5AAAAAAAD////2AAAAB/f5fP//////wAAAAAAAD////gAAAAfxnwPP//////jAAAAAAAD////AAAAAPCb3/n/////+CAAAAAAAD///8AAAAAfALf/n////+ECAAAAAAAB///8AAAAAGHQP/n/////mMAAAAAAAA///8AAAAAH+Ai///////E8AAAAAAAAf//wAAAAAP/AA///////BgAAAAAAAAP//gAAAAAf/73///////gAAAAAAAAAD/AQAAAAAf////f/////gAAAAAAAAAF+AQAAAAB///+/n/////AAAAAAAAAAC+AAAAAAB///+f0H////AAAAAAAAAAAeAwAAAAD////f/B///8gAAAAAAAAAAeGEAAAAH////v+B/z/AAAAAAAAAAAAPMAgAAAD////n+A/B+gAAAAAAAAAAAD8AAAAAD////n4AeB/AgAAAAAAAAAAAPAAAAAH////3gAcAfAgAAAAAAAAAAADAAAAAD////6AAcAfggAAAAAAAAAAABDwAAAD////8wAMATAIAAAAAAAAAAAAr/AAAB/////gAKASAAAAAAAAAAAAAAH/gAAA/////gACAAAIAAAAAAAAAAAAH/8AAAaH///AAAAsGAAAAAAAAAAAAAH/+AAAAB//+AAAAUOAAAAAAAAAAAAAP/+AAAAB//8AAAAYegAAAAAAAAAAAAP//gAAAD//4AAAAMeBgAAAAAAAAAAAP//8AAAB//wAAAAGdiuAAAAAAAAAAAf///AAAA//wAAAACAQHgAAAAAAAAAAP///gAAA//wAAAABwAHwgAAAAAAAAAH///AAAA//wAAAAACIDQIAAAAAAAAAH//+AAAAf/wAAAAAAAAAAAAAAAAAAAD//+AAAA//wgAAAAABxAAAAAAAAAAAD//+AAAA//wgAAAAAPxgBAAAAAAAAAA//8AAAA//jgAAAAAf5gAAAAAAAAAAAf/8AAAA//DgAAAAAf/gAAAAAAAAAAAf/8AAAAf/DAAAAAD//4CAAAAAAAAAAf/wAAAAf/DAAAAAH//4AAAAAAAAAAAf/AAAAAf+CAAAAAH//8AAAAAAAAAAAf/AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAD//+AAAAAAAAAAA/8AAAAAHwAAAAAADwf8AAAAAAAAAAA/gAAAAAAAAAAAAACAH4AIAAAAAAAAB/wAAAAAAAAAAAAAAAD4AEAAAAAAAAB+AAAAAAAAAAAAAAAAAAAGAAAAAAAAB6AAAAAAAAAAAAAAAAAwAMAAAAAAAAA8AAAAAAAAAAAAAAAAAQAYAAAAAAAAB4AAAAAAAAAAAAAAAAAAAwAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAACAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAeAAIP+f/gAAAAAAAAAAAMAAAAAAABP/+H//////AAAAAAAAAAA+AAAAAf////8////////AAAAAAAOEAPAAAB///////////////gAAAP//T//8AAAH//////////////+AAAH/////4AAAH///////////////8AAE//////4ABw////////////////8AAAD//////gCA////////////////wAAAf/////////////////////////+A/4A///////////////////////////////////////////////////////////////////////////////////////');
  var W = 180, H = 90, D = Math.PI / 180;
  var LON = -0.1278, LAT = 51.5074;       // London
  var TILT = -5 * D;                      // view latitude
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w, h, R, cx, cy, dpr, rot = LON * D, t0 = 0, last = 0, raf = 0;

  function isLand(r, c) { var i = r * W + c; return (M.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1; }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.max(w * 0.5, 340);
    var cap = R * (w >= 768 ? 0.3 : 0.42);
    cx = w / 2; cy = h - cap + R;
  }

  // orthographic projection; returns false when on the far side
  var px, py;
  function proj(lon, lat, l0) {
    var dl = lon * D - l0, p = lat * D;
    var cp = Math.cos(p), sp = Math.sin(p), cd = Math.cos(dl);
    if (Math.sin(TILT) * sp + Math.cos(TILT) * cp * cd <= 0.02) return false;
    px = cx + R * cp * Math.sin(dl);
    py = cy - R * (Math.cos(TILT) * sp - Math.sin(TILT) * cp * cd);
    return py > -4 && py < h + 4 && px > -4 && px < w + 4;
  }

  function draw(now) {
    var l0 = rot, r, c, lon, lat, a;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, w, h);
    // limb glow line
    ctx.strokeStyle = 'rgba(0,255,65,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    for (r = 0; r < H; r++) {
      lat = 90 - (r + 0.5) * 2;
      for (c = 0; c < W; c++) {
        lon = -180 + (c + 0.5) * 2;
        if (isLand(r, c)) {
          if (!proj(lon, lat, l0)) continue;
          ctx.fillStyle = '#4a5a50';
          ctx.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
        } else if (r % 3 === 1 && c % 3 === 1) {
          if (!proj(lon, lat, l0)) continue;
          ctx.fillStyle = 'rgba(0,255,65,0.16)';
          ctx.fillRect(px - 0.5, py - 0.5, 1, 1);
        }
      }
    }
    // London marker + single sonar ping
    if (proj(LON, LAT, l0)) {
      var mx = px, my = py;
      ctx.fillStyle = '#00FF41';
      ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, 6.2832); ctx.fill();
      var k = reduce ? 0.45 : ((now - t0) % 4000) / 4000;
      var ang = k * 9 * D;
      ctx.strokeStyle = 'rgba(0,255,65,' + (0.7 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      var ok = true, n;
      for (n = 0; n <= 40; n++) {
        a = n / 40 * 6.2832;
        // point at angular distance `ang` from London on bearing a
        var p1 = LAT * D, la = Math.asin(Math.sin(p1) * Math.cos(ang) + Math.cos(p1) * Math.sin(ang) * Math.cos(a));
        var lo = LON * D + Math.atan2(Math.sin(a) * Math.sin(ang) * Math.cos(p1), Math.cos(ang) - Math.sin(p1) * Math.sin(la));
        if (!proj(lo / D, la / D, l0)) { ok = false; break; }
        if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      if (ok) ctx.stroke();
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;            // ~30fps
    rot += (now - last) * 0.0000625 * (last ? 1 : 0); // ~3.6 deg/s
    last = now;
    draw(now);
  }
  function start() { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  size();
  draw(0);
  window.addEventListener('resize', function () { size(); draw(last); });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();
})();

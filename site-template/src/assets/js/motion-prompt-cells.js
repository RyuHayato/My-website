/* Motion Prompt cells available to the template's motion lab sections.
   Kits and cells are copied verbatim from the official Motion Prompt API; each pack has its own scope.
   Registered keys: fpv (#035), kaleidoscope (#135), lineBoil (#136). */
(function () {
"use strict";
var registry = {};

/* ── pack: camera ────────────────────────────────────────────────── */
(function () {
// Motion Prompt #025-048 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#025
//
// Kit for pack "camera" (Camera moves & transitions / カメラワークと切り替え): the constants and helpers its elements share.
// Elements #025-048 · 539x208 px · cycle 9.4 s. Element code: https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/<id>.txt (or /ja/).
//
// Run one element standalone in a browser:
//   1. paste this file into a <script>,
//   2. paste the element code below it (it assigns CELLS[n - 1], n = the element number inside the pack),
//   3. then add:
//        const c = document.createElement('canvas'); c.width = 539; c.height = 208; document.body.append(c);
//        const k = c.getContext('2d'), cell = CELLS.find(Boolean), t0 = performance.now();
//        (function loop() {
//          const u = ((performance.now() - t0) / 1000) % 9.4;   // seconds, 0 <= u < 9.4
//          k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, 539, 208);
//          k.save(); cell(k, 539, 208, u); k.restore();
//          requestAnimationFrame(loop);
//        })();
// Every cell is a pure function of u, so the same call renders video frames: u = frame / fps.

// @kit
// カメラワーク＆切り替え 24（カード 539x208）。各コマは時間 u の純関数。
// 1つの動きは CYC=4.7秒。切り替え（19〜21）は A→B の次に B→A と戻るので、パックの周期は CYC×2=9.4秒。
const CW = 539, CH = 208, FPS = 30;
const HOLD = 9.4, CYC = HOLD / 2;
const C = {
  bg: '#F4F3F0', card: '#FFFFFF', border: '#E3E1DC', ink: '#1E1E21', sub: '#8E8E93', faint: '#C9C9CC',
  blue: '#2F6BEB', blueM: '#9DB8F6', blueL: '#C9D8FB', blueXL: '#E4ECFE', blueBg: '#F1F5FF',
  grid: '#ECECEC', g1: '#F1F0EE', g2: '#E2E1DE', g3: '#CFCECB', g4: '#A9A8A5'
};
const JP = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
const EN = '"Helvetica Neue", "SF Pro Display", system-ui, sans-serif';
const MONO = '"SF Mono", ui-monospace, Menlo, monospace';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eIOs = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const eOut = x => 1 - Math.pow(1 - x, 3);
const mod = (a, n) => ((a % n) + n) % n;
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function txt(ctx, s, x, y, font, col, align = 'left', base = 'alphabetic', ls = '0px') {
  ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = base; ctx.letterSpacing = ls; ctx.fillText(s, x, y); ctx.letterSpacing = '0px';
}
function tw(ctx, s, font, ls = '0px') { ctx.font = font; ctx.letterSpacing = ls; const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; return w; }

// ============================== 3D SCENE ==============================
// 世界座標: Y上・カメラは +Z を向く（yaw=0）。単位はメートル。焦点距離 f はピクセル。
const F0 = 330;  // = 24mm 表示
const mm = f => Math.round(f / F0 * 24) + 'mm';
function cam(o) { return Object.assign({ x: 0, y: 1.5, z: 0, yaw: 0, pitch: 0, roll: 0, f: F0 }, o); }
function proj(c, X, Y, Z) {
  const dx = X - c.x, dy = Y - c.y, dz = Z - c.z;
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
  const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
  return { x: c.f * x1 / z2, y: -c.f * y2 / z2, z: z2, s: c.f / z2, cx: x1, cy: y2 };
}
function camZ(c, X, Y, Z) { return proj(c, X, Y, Z).z; }
const NEAR = 0.25;
function seg(ctx, c, a, b) {   // 3D line with near clipping
  let za = camZ(c, ...a), zb = camZ(c, ...b);
  if (za < NEAR && zb < NEAR) return;
  if (za < NEAR) { const t = (NEAR - za) / (zb - za); a = a.map((v, i) => lerp(v, b[i], t)); }
  else if (zb < NEAR) { const t = (NEAR - zb) / (za - zb); b = b.map((v, i) => lerp(v, a[i], t)); }
  const p = proj(c, ...a), q = proj(c, ...b);
  ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
}
function poly(ctx, c, pts) { ctx.beginPath(); pts.forEach((p, i) => { const q = proj(c, ...p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.closePath(); }

// sprite = local drawing (meters, y up) anchored at a world point, always facing camera (billboard)
function sprite(ctx, c, X, Y, Z, fn) {
  const p = proj(c, X, Y, Z); if (p.z < NEAR) return;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, -p.s); fn(ctx, p.s); ctx.restore();
}
function person(ctx, s, o = {}) {
  const col = o.col || C.blue, walk = o.walk || 0, face = o.face;
  ctx.fillStyle = col;
  const sw = Math.sin(walk) * 0.42;
  // legs
  [[-0.08, sw], [0.08, -sw]].forEach(([x, a]) => { ctx.save(); ctx.translate(x, 0.86); ctx.rotate(a); rr(ctx, -0.075, -0.86, 0.15, 0.88, 0.07); ctx.fill(); ctx.restore(); });
  // arms
  [[-0.25, -sw], [0.25, sw]].forEach(([x, a]) => { ctx.save(); ctx.translate(x, 1.38); ctx.rotate(a * (o.armUp ? 0 : 1) + (o.armUp ? (x < 0 ? -2.6 : 2.6) : 0)); rr(ctx, -0.06, -0.58, 0.12, 0.6, 0.06); ctx.fill(); ctx.restore(); });
  rr(ctx, -0.23, 0.82, 0.46, 0.64, 0.12); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 1.63, 0.16, 0, 7); ctx.fill();
  if (face !== undefined && Math.cos(face) > 0) {   // 顔の向き（オービット用）
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(Math.sin(face) * -0.09, 1.65, 0.035, 0, 7); ctx.fill();
  }
}
function tree(ctx, s, h = 4, col = C.g2) {
  ctx.fillStyle = C.g3; ctx.fillRect(-0.09 * h / 4, 0, 0.18 * h / 4, h * 0.55);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, h * 0.68, h * 0.3, 0, 7); ctx.fill();
}
function building(ctx, s, w, h, col = C.g1) {
  ctx.fillStyle = col; ctx.fillRect(-w / 2, 0, w, h);
  ctx.strokeStyle = C.g3; ctx.lineWidth = 1.4 / s; ctx.strokeRect(-w / 2, 0, w, h);
  ctx.fillStyle = C.g2;
  for (let y = h - 1.6; y > 1; y -= 1.8) for (let x = -w / 2 + 0.6; x < w / 2 - 0.7; x += 1.3) ctx.fillRect(x, y, 0.6, 0.8);
}
function post(ctx, s, h = 1.2) { ctx.fillStyle = C.g4; ctx.fillRect(-0.07, 0, 0.14, h); ctx.fillRect(-0.12, h - 0.06, 0.24, 0.1); }

// scene presets
const MTN_FAR = [[-420, 0], [-300, 22], [-230, 8], [-150, 30], [-80, 12], [-20, 34], [50, 14], [120, 28], [190, 6], [260, 26], [340, 10], [420, 0]];
const MTN_NEAR = [[-260, 0], [-190, 12], [-140, 4], [-70, 18], [-20, 6], [30, 15], [95, 3], [160, 16], [230, 5], [300, 0]];
const BLD = [[-17, 4, 9], [-12, 3.2, 13], [-8, 2.6, 7], [11, 3.4, 11], [15.5, 4, 8], [20, 3, 15], [-24, 3.5, 10], [26, 4, 7]];
const CITY = [[-9, 3.4, 12], [-5.5, 3, 18], [-2, 3.6, 9], [1.8, 3, 22], [5.4, 3.6, 14], [9, 3, 10], [-13, 3.4, 15], [12.8, 3.6, 19]];

function world(ctx, w, h, c, o = {}) {
  ctx.save();
  ctx.translate(w / 2, h / 2); ctx.rotate(c.roll || 0);
  const blurBg = o.blurBg || 0, blurFg = o.blurFg || 0;
  const setBlur = b => { ctx.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none'; };
  // sky tint
  if (o.sky) { ctx.fillStyle = o.sky; ctx.fillRect(-w * 2, -h * 3, w * 4, h * 6); }
  setBlur(blurBg);
  // sun / moon
  const sun = o.sun === undefined ? [30, 30, 170] : o.sun;
  if (sun) { const p = proj(c, ...sun); if (p.z > NEAR) { ctx.fillStyle = o.sunCol || C.blueL; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, 5.5 * p.s * (o.sunScale || 1)), 0, 7); ctx.fill(); } }
  if (o.clouds) o.clouds.forEach(([X, Y, Z, r]) => { const p = proj(c, X, Y, Z); if (p.z < NEAR) return; ctx.fillStyle = C.g1; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 2.2 * p.s, r * p.s, 0, 0, 7); ctx.ellipse(p.x + r * 1.2 * p.s, p.y + r * .2 * p.s, r * 1.4 * p.s, r * .8 * p.s, 0, 0, 7); ctx.fill(); });
  // mountains (far planes)
  if (o.mountains !== false) {
    const off = o.mtnZ || 0;
    ctx.fillStyle = C.blueXL; poly(ctx, c, [...MTN_FAR.map(([x, y]) => [x, y, 175 + off])]); ctx.fill();
    ctx.fillStyle = C.blueL; poly(ctx, c, [...MTN_NEAR.map(([x, y]) => [x, y, 120 + off])]); ctx.fill();
  }
  // ground + grid
  if (o.grid !== false) {
    ctx.save(); setBlur(blurBg * 0.6);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1.3; ctx.beginPath();
    const z0 = Math.floor(c.z / 2) * 2, xs = o.gridX || 40;
    for (let z = z0 + 2; z <= z0 + 90; z += (z - z0 < 30 ? 2 : 6)) seg(ctx, c, [-xs + c.x, 0, z], [xs + c.x, 0, z]);
    for (let x = Math.floor(c.x / 2) * 2 - xs; x <= c.x + xs; x += 2) seg(ctx, c, [x, 0, z0 + 0.5], [x, 0, z0 + 90]);
    ctx.stroke();
    // horizon
    ctx.strokeStyle = C.g2; ctx.lineWidth = 1.5; ctx.beginPath(); seg(ctx, c, [c.x - 400, 0, c.z + 300], [c.x + 400, 0, c.z + 300]); ctx.stroke();
    ctx.restore();
  }
  // sprites sorted by depth
  const list = [];
  const add = (X, Y, Z, fn, fg) => list.push({ z: camZ(c, X, Y, Z), X, Y, Z, fn, fg });
  if (o.buildings !== false) (o.city ? CITY.map(([x, bw, bh]) => [x, bw, bh, 30]) : BLD.map(([x, bw, bh]) => [x, bw, bh, 48])).forEach(([x, bw, bh, z]) => add(x, 0, z, (k, s) => building(k, s, bw, bh)));
  if (o.trees !== false) [[-7, 22], [6.5, 19], [9.5, 24], [-11, 26], [3, 30]].forEach(([x, z]) => add(x, 0, z, (k, s) => tree(k, s, 4)));
  if (o.tower) add(o.tower[0], 0, o.tower[1], (k, s) => { building(k, s, 6, 9.5, C.g1); k.fillStyle = C.g4; k.fillRect(-0.08, 9.5, 0.16, 2.2); k.fillStyle = C.blue; k.beginPath(); k.arc(0, 11.8, 0.3, 0, 7); k.fill(); });
  if (o.ring) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(o.ring[0] + Math.sin(a) * o.ring[2], 0, o.ring[1] + Math.cos(a) * o.ring[2], (k, s) => tree(k, s, 3.2, i % 3 ? C.g2 : C.blueXL)); }
  if (o.extra) o.extra.forEach(e => add(e[0], e[1], e[2], e[3], e[4]));
  if (o.person) { const pp = o.person; add(pp.x || 0, pp.y || 0, pp.z === undefined ? 8 : pp.z, (k, s) => person(k, s, pp), pp.fg); }
  if (o.fg) o.fg.forEach(([X, Z, kind]) => add(X, 0, Z, (k, s) => kind === 'rock' ? (k.fillStyle = C.g3, k.beginPath(), k.ellipse(0, 0.1, 0.55, 0.38, 0, 0, 7), k.fill()) : post(k, s), true));
  list.sort((a, b) => b.z - a.z);
  for (const it of list) { setBlur(it.fg ? blurFg : blurBg); sprite(ctx, c, it.X, it.Y, it.Z, it.fn); }
  ctx.filter = 'none';
  if (o.after) o.after(ctx, c);
  ctx.restore();
}

// ============================== VIEWFINDER CARD ==============================
const CARD = mkCanvas(CW, CH), CK = CARD.getContext('2d');
const TMP = mkCanvas(CW, CH), TK = TMP.getContext('2d');
const TMP2 = mkCanvas(CW, CH), TK2 = TMP2.getContext('2d');
function clear(k, w = CW, h = CH) { k.setTransform(1, 0, 0, 1, 0, 0); k.globalAlpha = 1; k.filter = 'none'; k.fillStyle = '#FFFFFF'; k.fillRect(0, 0, w, h); }
// draw fnA then blend fnB on top with alpha a (into k)
function blend(k, fnA, fnB, a) {
  if (a <= 0.001) return fnA(k);
  if (a >= 0.999) return fnB(k);
  fnA(k);
  clear(TK2); fnB(TK2); k.save(); k.globalAlpha = a; k.drawImage(TMP2, 0, 0); k.restore();
}
// motion blur: average n renders of fn(k, s) with s spread over [s0, s1]
function mblur(k, fn, s0, s1, n) {
  if (Math.abs(s1 - s0) < 1e-4 || n < 2) return fn(k, s0);
  const acc = mkCanvasCached(), ak = acc.getContext('2d');
  for (let i = 0; i < n; i++) {
    clear(TK); fn(TK, lerp(s0, s1, (i + .5) / n));
    ak.globalAlpha = 1 / (i + 1); ak.drawImage(TMP, 0, 0);
  }
  ak.globalAlpha = 1; k.save(); k.drawImage(acc, 0, 0); k.restore();
}
let _acc; function mkCanvasCached() { if (!_acc) _acc = mkCanvas(CW, CH); const k = _acc.getContext('2d'); k.globalAlpha = 1; k.fillStyle = '#fff'; k.fillRect(0, 0, CW, CH); return _acc; }

function viewfinder(k, w, h, t, hud, hudCol) {
  k.save();
  const m = 13, L = 20;
  k.strokeStyle = '#8F8F94'; k.lineWidth = 2.6; k.lineCap = 'round';
  k.beginPath();
  [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, sx, sy]) => { k.moveTo(x, y + sy * L); k.lineTo(x, y); k.lineTo(x + sx * L, y); });
  k.stroke();
  // center mark
  k.strokeStyle = 'rgba(143,143,148,.55)'; k.lineWidth = 1.6; k.beginPath(); k.moveTo(w / 2 - 7, h / 2); k.lineTo(w / 2 + 7, h / 2); k.moveTo(w / 2, h / 2 - 7); k.lineTo(w / 2, h / 2 + 7); k.stroke();
  // REC (なめらかな明滅・9.4秒で9回＝ループの継ぎ目なし)
  const a = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 9 / HOLD);
  k.fillStyle = C.blue; k.globalAlpha = a; k.beginPath(); k.arc(m + 16, m + 17, 5, 0, 7); k.fill(); k.globalAlpha = 1;
  txt(k, 'REC', m + 27, m + 17, `600 14px ${MONO}`, '#7D7D82', 'left', 'middle');
  if (hud) {
    const f = `600 15px ${MONO}`, ww = tw(k, hud, f);
    k.fillStyle = 'rgba(255,255,255,.82)'; rr(k, w - m - 14 - ww - 10, m + 6, ww + 20, 23, 6); k.fill();
    txt(k, hud, w - m - 14, m + 18, f, hudCol || '#6E6E73', 'right', 'middle');
  }
  k.restore();
}

// ============================== CELLS ==============================
// each: (k, w, h, u) where u = time within the cycle (0..CYC), cyc = cycle index; returns HUD string
const RESET = 0.5;  // 末尾のクロスフェードで開始状態へ戻す
function camCell(stateAt, hudAt, t0 = 0.5, t1 = 3.4) {
  return (k, w, h, u) => {
    const p = eIO(P(u, t0, t1));
    const r = P(u, CYC - RESET, CYC);
    blend(k, kk => stateAt(kk, w, h, p, u), kk => stateAt(kk, w, h, 0, u - CYC), eIOs(r));
    return hudAt(r > 0.5 ? 0 : p, u);
  };
}
// 1コマぶんの枠: 白地 → 中身 → ファインダー（四隅・REC・右上の数値）。u はパック周期 0..CYC×2
function shot(fn, vh) {
  return (k, w, h, u) => {
    const uu = mod(u, CYC), cyc = Math.floor(u / CYC);
    k.fillStyle = '#FFFFFF'; k.fillRect(0, 0, w, h);
    k.save(); const hud = fn(k, w, h, uu, cyc); k.restore();
    k.globalAlpha = 1; k.filter = 'none';
    viewfinder(k, w, vh || h, u, hud);
  };
}
const CELLS = [];

// @shared
// 跳躍の高さと、舞い落ちる葉（13・14・16 で使う）
function jumpY(q) { return q <= 0 || q >= 1 ? 0 : 4 * q * (1 - q) * 1.1; }
function leaves(u, speed) { const ex = []; for (let i = 0; i < 9; i++) { const ph = mod(u * speed / 4.7 + i / 9, 1); ex.push([-3 + i * 0.75 + Math.sin(i * 3) * 0.3, 3.4 - ph * 3.4, 6 + (i % 3), (kk) => { kk.fillStyle = i % 2 ? C.blueM : C.g3; kk.save(); kk.rotate(ph * 6 + i); kk.beginPath(); kk.ellipse(0, 0, 0.09, 0.045, 0, 0, 7); kk.fill(); kk.restore(); }]); } return ex; }

// @shared
// ---- 切り替え: 奇数サイクルは B→A に戻る（リセット不要）
const sceneA = (k, w, h, extra = {}) => world(k, w, h, cam(Object.assign({ y: 1.4 }, extra.cam)), Object.assign({ person: { x: -0.6, z: 7 } }, extra));
const CAR = [1.2, 0, 9, (kk) => { kk.fillStyle = C.blue; rr(kk, -1.9, 0.35, 3.8, 0.75, 0.25); kk.fill(); rr(kk, -1.1, 0.95, 2.1, 0.62, 0.28); kk.fill(); kk.fillStyle = '#fff'; kk.fillRect(-0.85, 1.08, 0.8, 0.36); kk.fillRect(0.12, 1.08, 0.7, 0.36); kk.fillStyle = C.ink; [-1.15, 1.15].forEach(x => { kk.beginPath(); kk.arc(x, 0.34, 0.34, 0, 7); kk.fill(); }); }];
const SB = { city: true, mountains: false, trees: false, sun: [-26, 40, 150], extra: [CAR] };
const sceneB = (k, w, h, extra = {}) => world(k, w, h, cam(Object.assign({ y: 1.6, pitch: 0.1 }, extra.cam)), Object.assign({}, SB, extra));
function abCell(trans, hudFn) {
  return (k, w, h, u, cyc) => {
    const S = cyc % 2 === 0 ? [sceneA, sceneB] : [sceneB, sceneA];
    trans(k, w, h, u, S[0], S[1], cyc);
    return hudFn ? hudFn(u, cyc) : (cyc % 2 === 0 ? 'A → B' : 'B → A');
  };
}

// @shared
// 23/24 J・L カット: 上が映像、下に映像と音のタイムライン
function splitCell(lead) {   // lead>0: 音が先（J） / lead<0: 音が後（L）
  return (k, w, h, u, cyc) => {
    const vh = 134;
    const p = clamp((u - 0.4) / 3.6);       // 再生ヘッド
    const r = P(u, CYC - RESET, CYC);
    const X0 = 70, X1 = w - 22, cutV = 0.55, cutA = cutV - lead;
    const draw = (kk, p) => {
      // 映像
      kk.save(); kk.beginPath(); kk.rect(0, 0, w, vh); kk.clip();
      (p < cutV ? sceneA : sceneB)(kk, w, vh, { cam: { pitch: p < cutV ? -0.13 : -0.06 } });
      // 今流れている音
      const aB = p >= cutA, lab = aB ? '♪ Bの音' : '♪ Aの音', f = `700 15px ${JP}`;
      const bw = tw(kk, lab, f) + 22;
      kk.fillStyle = aB ? C.blue : '#8E8E93'; rr(kk, w - 42 - bw, vh - 40, bw, 26, 13); kk.fill();
      txt(kk, lab, w - 42 - bw / 2, vh - 26.5, f, '#fff', 'center', 'middle');
      const sl = p < cutV ? 'A' : 'B';
      kk.fillStyle = 'rgba(255,255,255,.9)'; rr(kk, 42, vh - 40, 70, 26, 13); kk.fill();
      txt(kk, '映像' + sl, 77, vh - 26.5, `700 15px ${JP}`, C.ink, 'center', 'middle');
      kk.restore();
      kk.strokeStyle = C.border; kk.lineWidth = 1.5; kk.beginPath(); kk.moveTo(0, vh + .5); kk.lineTo(w, vh + .5); kk.stroke();
      // タイムライン
      const tracks = [['映像', vh + 14, cutV], ['音', vh + 44, cutA]];
      const xAt = q => lerp(X0, X1, q);
      tracks.forEach(([name, y, cut]) => {
        txt(kk, name, 18, y + 11, `600 15px ${JP}`, C.sub, 'left', 'middle');
        kk.fillStyle = C.g2; rr(kk, X0, y, xAt(cut) - X0 - 2, 22, 5); kk.fill();
        kk.fillStyle = C.blueL; rr(kk, xAt(cut) + 2, y, X1 - xAt(cut) - 2, 22, 5); kk.fill();
        txt(kk, 'A', X0 + 10, y + 11.5, `700 14px ${EN}`, C.g4, 'left', 'middle');
        txt(kk, 'B', xAt(cut) + 12, y + 11.5, `700 14px ${EN}`, C.blue, 'left', 'middle');
        if (name === '音') {   // 波形
          kk.strokeStyle = 'rgba(255,255,255,.95)'; kk.lineWidth = 1.6; kk.beginPath();
          for (let x = X0 + 26; x < X1 - 6; x += 5) { if (x < X0 + 24 || (x > xAt(cut) - 4 && x < xAt(cut) + 26)) continue; const a = 3 + 5 * Math.abs(Math.sin(x * 0.37) * Math.cos(x * 0.11)); kk.moveTo(x, y + 11 - a); kk.lineTo(x, y + 11 + a); }
          kk.stroke();
        }
      });
      // ずれている区間を強調
      const a1 = xAt(Math.min(cutA, cutV)), a2 = xAt(Math.max(cutA, cutV));
      kk.fillStyle = 'rgba(47,107,235,.12)'; kk.fillRect(a1, vh + 8, a2 - a1, 64);
      kk.strokeStyle = C.blue; kk.lineWidth = 1.5; kk.setLineDash([4, 3]); kk.beginPath(); kk.moveTo(a1, vh + 8); kk.lineTo(a1, vh + 72); kk.moveTo(a2, vh + 8); kk.lineTo(a2, vh + 72); kk.stroke(); kk.setLineDash([]);
      // 再生ヘッド
      const hx = xAt(p); kk.fillStyle = C.ink; kk.fillRect(hx - 1.5, vh + 6, 3, 68); kk.beginPath(); kk.moveTo(hx - 6, vh + 4); kk.lineTo(hx + 6, vh + 4); kk.lineTo(hx, vh + 11); kk.fill();
    };
    blend(k, kk => draw(kk, p), kk => draw(kk, 0), eIOs(r));
    return null;
  };
}

// Motion Prompt #035 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#035
//
// FPV drone shot / FPV
// Pack: camera (Camera moves & transitions) · element 11 · Category: Shooting Style & Time
// What happens: A first-person view flying low and fast between two rows of trees, banking from side to side.
// Motion spec:
//   - Camera: flies forward at a constant 14 m/s (shown as 50km/h) with no easing; pitch fixed at -0.05 rad
//   - Weave (T = 2π×u/4.7, two swings per 4.7 s): sideways 0.6·sin(2T-0.4) m, height 1.4 + 0.5·sin(2T) m
//   - Bank: roll 0.22·sin(2T+0.6) rad (about ±12.6°), yaw 0.05·sin(2T) rad (about ±2.9°)
//   - No subject. Trees 4.2 m tall stand 3.6 m to each side, every 8 m, the two rows offset by 4 m, and rush toward the camera
//   - Speed lines: 10 radial strokes about 32–76 px long (longer toward the sides) in translucent grey, flowing outward and recycling
//   - No hold and no cross-fade reset (the tree rows shift phase when it restarts every 4.7 s)
// When to use it: For speed and immersion, or to fly through a location in one continuous move.
// Tags: fpv, drone, fly through, first person, banking, speed, aerial
// Size: 539x208 px · Cycle: 9.4 s
// Needs: kit camera -> https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera.js
// Live demo: https://showheyohtaki.github.io/motion-prompt/#035
//
// cells[i](k, w, h, u): k = CanvasRenderingContext2D (already cleared and wrapped in save/restore by the caller), w,h = size, u = seconds in [0, cycle). The picture depends only on u.
// Element code starts here. CELLS, constants and helpers live in the kit.

// @element 11
// 11 FPV
CELLS[10] = shot((k, w, h, u) => {
  const sp = 14, z = u * sp, T = u * 2 * Math.PI / CYC;
  const c = cam({ z, y: 1.4 + 0.5 * Math.sin(T * 2), roll: 0.22 * Math.sin(T * 2 + 0.6), yaw: 0.05 * Math.sin(T * 2), x: 0.6 * Math.sin(T * 2 - 0.4), pitch: -0.05 });
  const ex = [];
  const L = 8, base = Math.floor(z / L) * L;
  for (let i = 0; i < 12; i++) { const zz = base + i * L; ex.push([-3.6, 0, zz, (kk, s) => tree(kk, s, 4.2)]); ex.push([3.6, 0, zz + L / 2, (kk, s) => tree(kk, s, 4.2, C.blueXL)]); }
  world(k, w, h, c, {
    buildings: false, trees: false, extra: ex, gridX: 20,
    after: (kk) => {   // スピード線
      kk.strokeStyle = 'rgba(150,150,155,.45)'; kk.lineWidth = 2;
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.3, ph = mod(u * 2.2 + i * 0.37, 1); const r0 = 120 + ph * 160; kk.beginPath(); kk.moveTo(Math.cos(a) * r0 * 1.9, Math.sin(a) * r0 * 0.8); kk.lineTo(Math.cos(a) * (r0 + 40) * 1.9, Math.sin(a) * (r0 + 40) * 0.8); kk.stroke(); }
    }
  });
  return `${Math.round(sp * 3.6)}km/h`;
});
registry.fpv = { cell: CELLS[10], w: CW, h: CH, cycle: 9.4 };
})();

/* ── pack: motion2 ───────────────────────────────────────────────── */
(function () {
// Motion Prompt #121-144 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#121
//
// Kit for pack "motion2" (Motion graphics moves, part 2 / モーショングラフィックスの演出 第2弾): the constants and helpers its elements share.
// Elements #121-144 · 539x208 px · cycle 4.7 s. Element code: https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/<id>.txt (or /ja/).
//
// Run one element standalone in a browser:
//   1. paste this file into a <script>,
//   2. paste the element code below it (it assigns CELLS[n - 1], n = the element number inside the pack),
//   3. then add:
//        const c = document.createElement('canvas'); c.width = 539; c.height = 208; document.body.append(c);
//        const k = c.getContext('2d'), cell = CELLS.find(Boolean), t0 = performance.now();
//        (function loop() {
//          const u = ((performance.now() - t0) / 1000) % 4.7;   // seconds, 0 <= u < 4.7
//          k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, 539, 208);
//          k.save(); cell(k, 539, 208, u); k.restore();
//          requestAnimationFrame(loop);
//        })();
// Every cell is a pure function of u, so the same call renders video frames: u = frame / fps.

// @kit
// モーショングラフィックスの演出の名前 第2弾 24（各カード 539x208・4.7秒周期。各コマは時間 u の純関数）
// カードの中だけ共通パレット（濃紺の地＋青・コーラル・黄・ミント）。第1弾（motion）と同じ見た目。
const CW = 539, CH = 208;
const CYC = 4.7;                          // 各カードは4.7秒周期（ループの継ぎ目なし）
const C = {
  navy: '#0F1A3D', navy2: '#1B2A5E', navy3: '#2A3D80', dim: '#7F90C4',
  blue: '#3B7BFF', coral: '#FF6B5C', yel: '#FFC83D', mint: '#2EDBA8', white: '#FFFFFF', cream: '#FFF1D6'
};
const PAL = [C.blue, C.coral, C.yel, C.mint];
const JP = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
const DISP = '"Avenir Next", "Helvetica Neue", system-ui, sans-serif';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eIOs = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const eOut = x => 1 - Math.pow(1 - x, 3);
const eOut5 = x => 1 - Math.pow(1 - x, 5);
const eIn = x => x * x * x;
const smooth = x => x * x * (3 - 2 * x);
const mod = (a, n) => ((a % n) + n) % n;
const backOut = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const backIn = (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x;
const spring = (t, w = 14, d = 7) => t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(w * t);   // 0→行き過ぎ→1
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function txt(ctx, s, x, y, font, col, align = 'left', base = 'alphabetic', ls = '0px') {
  ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = base; ctx.letterSpacing = ls; ctx.fillText(s, x, y); ctx.letterSpacing = '0px';
}
function tw(ctx, s, font, ls = '0px') { ctx.font = font; ctx.letterSpacing = ls; const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; return w; }
function rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }
function star(k, x, y, R, rot = 0, inner = 0.5, n = 5) { k.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? R * inner : R, a = rot - Math.PI / 2 + i * Math.PI / n; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? k.lineTo(px, py) : k.moveTo(px, py); } k.closePath(); }
function heartPath(k, s) { k.beginPath(); k.moveTo(0, s * 0.92); k.bezierCurveTo(-s * 1.75, -s * 0.12, -s * 0.85, -s * 1.2, 0, -s * 0.42); k.bezierCurveTo(s * 0.85, -s * 1.2, s * 1.75, -s * 0.12, 0, s * 0.92); k.closePath(); }
// 整数→0..1 の決まった乱数（コマ番号ごとの揺れ・入れ替わりに使う。描画時の Math.random は使わない）
// 浮動小数の誤差で周期の終わり（4.6999…）と始まり（0）が別のコマ扱いになるのを防ぐ
const snapU = u => mod(Math.round(u * 1e6) / 1e6, CYC);
function H01(n) { n = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
const TMP = mkCanvas(CW, CH), TK = TMP.getContext('2d');
function stage(k, col = C.navy) { k.fillStyle = col; k.fillRect(0, 0, CW, CH); }
function chars(k, s, font, ls = 0) { k.font = font; const ws = [...s].map(ch => k.measureText(ch).width + ls); const tot = ws.reduce((a, b) => a + b, 0) - ls; let x = -tot / 2; return [...s].map((ch, i) => { const o = { ch, x: x + (ws[i] - ls) / 2, w: ws[i] - ls }; x += ws[i]; return o; }); }
function pathLen(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }
function ptAt(pts, cum, f) { const L = cum[cum.length - 1] * clamp(f); let i = 1; while (i < cum.length - 1 && cum[i] < L) i++; const t = (L - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
const CELLS = [];

// @shared
// 場面（昼・夜・海・山・街・野原）。同じ絵柄がそろわないよう、カードごとに組み合わせを変える
const SUN = [112, 104], MOON = [CW - 112, 104];
function scrA(k, w, h) {
  k.fillStyle = C.cream; k.fillRect(0, 0, w, h);
  k.fillStyle = '#FFD9A8'; k.beginPath(); k.arc(SUN[0], SUN[1], 66, 0, 7); k.fill();
  k.fillStyle = C.coral; k.beginPath(); k.arc(SUN[0], SUN[1], 44, 0, 7); k.fill();
  txt(k, 'DAY', 214, h / 2 + 4, `800 96px ${DISP}`, C.navy, 'left', 'middle', '2px');
  k.fillStyle = '#fff'; rr(k, 400, 34, 96, 26, 13); k.fill(); rr(k, 430, 20, 50, 26, 13); k.fill();
}
function scrB(k, w, h) {
  k.fillStyle = '#16255A'; k.fillRect(0, 0, w, h);
  k.fillStyle = '#fff';[[40, 30, 3], [150, 170, 2.5], [250, 24, 2.5], [330, 180, 3], [500, 30, 2.5], [20, 150, 2]].forEach(s => { k.beginPath(); k.arc(s[0], s[1], s[2], 0, 7); k.fill(); });
  k.fillStyle = C.yel; k.beginPath(); k.arc(MOON[0], MOON[1], 46, 0, 7); k.fill();
  k.fillStyle = '#16255A'; k.beginPath(); k.arc(MOON[0] + 22, MOON[1] - 14, 38, 0, 7); k.fill();
  txt(k, 'NIGHT', 40, h / 2 + 4, `800 88px ${DISP}`, '#fff', 'left', 'middle', '1px');
}
function clipX(k, x0, x1, h) { k.beginPath(); k.rect(x0, 0, x1 - x0, h); k.clip(); }
function pnSea(k, x0, x1, h, t, label) {
  const c = (x0 + x1) / 2; k.save(); clipX(k, x0, x1, h);
  k.fillStyle = '#CFE0FF'; k.fillRect(x0, 0, x1 - x0, h);
  k.fillStyle = C.yel; k.beginPath(); k.arc(c + 120, 54, 30, 0, 7); k.fill();
  k.fillStyle = C.blue; k.fillRect(x0, 126, x1 - x0, h - 126);
  const off = (t / CYC) * 200; k.strokeStyle = '#fff'; k.lineWidth = 6; k.lineCap = 'round';
  for (let j = 0; j < 3; j++) { const y = 146 + j * 22; k.beginPath(); for (let x = x0 - 10; x <= x1 + 10; x += 6) { const yy = y + 4 * Math.sin((x + off * (j % 2 ? -1 : 1) + j * 30) * 2 * Math.PI / 100); x === x0 - 10 ? k.moveTo(x, yy) : k.lineTo(x, yy); } k.stroke(); }
  const bx = c + 26 * Math.sin(2 * Math.PI * t / CYC) + (label ? 110 : 0), by = 124 + 3 * Math.sin(2 * Math.PI * 3 * t / CYC);
  k.fillStyle = '#fff'; k.beginPath(); k.moveTo(bx, by - 62); k.lineTo(bx, by - 8); k.lineTo(bx + 42, by - 8); k.closePath(); k.fill();
  k.fillStyle = C.coral; k.beginPath(); k.moveTo(bx - 40, by - 4); k.lineTo(bx + 50, by - 4); k.lineTo(bx + 36, by + 14); k.lineTo(bx - 28, by + 14); k.closePath(); k.fill();
  if (label) txt(k, 'SEA', x0 + 30, 82, `800 76px ${DISP}`, C.navy, 'left', 'middle', '2px');
  k.restore();
}
function pnMtn(k, x0, x1, h, t, label) {
  const c = (x0 + x1) / 2; k.save(); clipX(k, x0, x1, h);
  k.fillStyle = '#FFE1DA'; k.fillRect(x0, 0, x1 - x0, h);
  k.fillStyle = C.yel; k.beginPath(); k.arc(c - 30, 112, 34, 0, 7); k.fill();
  const tri = (a, px, py, b, col) => { k.fillStyle = col; k.beginPath(); k.moveTo(a, h); k.lineTo(px, py); k.lineTo(b, h); k.closePath(); k.fill(); };
  const snow = (a, px, py, b, f) => { const L = lerp(px, a, f), R = lerp(px, b, f), y = lerp(py, h, f); k.fillStyle = '#fff'; k.beginPath(); k.moveTo(px, py); k.lineTo(R, y); k.lineTo(lerp(px, R, 0.5), y + 10); k.lineTo(px, y - 2); k.lineTo(lerp(L, px, 0.5), y + 10); k.lineTo(L, y); k.closePath(); k.fill(); };
  tri(c - 330, c - 230, 104, c - 110, C.mint);
  tri(c - 110, c + 50, 30, c + 210, C.navy3); snow(c - 110, c + 50, 30, c + 210, 0.22);
  tri(c + 80, c + 190, 86, c + 330, C.blue); snow(c + 80, c + 190, 86, c + 330, 0.2);
  k.fillStyle = C.mint; k.fillRect(x0, h - 20, x1 - x0, 20);
  if (label) txt(k, 'MOUNTAIN', x0 + 26, 54, `800 44px ${DISP}`, C.navy, 'left', 'middle', '1px');
  k.restore();
}
const BLD = [[-250, 70, 116, 0], [-175, 62, 150, 1], [-108, 80, 96, 0], [-22, 64, 172, 1], [48, 92, 122, 0], [146, 58, 150, 1], [210, 80, 108, 0]];
function pnCity(k, x0, x1, h, t, label) {
  const c = (x0 + x1) / 2; k.save(); clipX(k, x0, x1, h);
  k.fillStyle = C.navy2; k.fillRect(x0, 0, x1 - x0, h);
  k.fillStyle = '#fff'; k.beginPath(); k.arc(c + 150, 46, 22, 0, 7); k.fill();
  const stp = Math.floor(t / (CYC / 8));
  BLD.forEach(([dx, bw, bh, ci], bi) => {
    const bx = c + dx, by = h - bh; k.fillStyle = ci ? C.blue : C.navy3; k.fillRect(bx, by, bw, bh);
    let wi = 0; for (let y = by + 14; y < h - 16; y += 22) for (let x = bx + 10; x < bx + bw - 14; x += 18) { const on = H01(bi * 97 + wi * 13 + stp * 7) > 0.35; wi++; k.fillStyle = on ? C.yel : 'rgba(15,26,61,.45)'; k.fillRect(x, y, 9, 11); }
  });
  if (label) { k.fillStyle = 'rgba(15,26,61,.55)'; rr(k, x0 + 18, 28, 196, 70, 14); k.fill(); txt(k, 'CITY', x0 + 34, 64, `800 66px ${DISP}`, '#fff', 'left', 'middle', '2px'); }
  k.restore();
}
function pnField(k, x0, x1, h, t, label) {
  const c = (x0 + x1) / 2; k.save(); clipX(k, x0, x1, h);
  k.fillStyle = '#DDF6EC'; k.fillRect(x0, 0, x1 - x0, h);
  k.fillStyle = '#fff';[[-150, 40], [60, 30], [210, 52]].forEach(([dx, y]) => { const xx = c + dx + 14 * Math.sin(2 * Math.PI * t / CYC + dx); k.beginPath(); k.ellipse(xx, y, 34, 12, 0, 0, 7); k.ellipse(xx + 14, y - 8, 18, 12, 0, 0, 7); k.fill(); });
  k.fillStyle = C.mint; k.beginPath(); k.moveTo(x0, h); k.lineTo(x0, 150); for (let x = x0; x <= x1; x += 10) k.lineTo(x, 150 + 8 * Math.sin((x - c) * 0.02)); k.lineTo(x1, h); k.closePath(); k.fill();
  const mx = c + (label ? 120 : 0), my = 72;
  k.fillStyle = '#fff'; k.beginPath(); k.moveTo(mx - 10, my); k.lineTo(mx + 10, my); k.lineTo(mx + 18, 160); k.lineTo(mx - 18, 160); k.closePath(); k.fill();
  const ang = 2 * Math.PI * 2 * t / CYC + 0.3; k.fillStyle = C.coral;
  for (let i = 0; i < 4; i++) { k.save(); k.translate(mx, my); k.rotate(ang + i * Math.PI / 2); k.beginPath(); k.moveTo(0, -3); k.lineTo(58, -10); k.lineTo(58, 8); k.lineTo(0, 3); k.closePath(); k.fill(); k.restore(); }
  k.fillStyle = C.yel; k.beginPath(); k.arc(mx, my, 8, 0, 7); k.fill();
  [[-200, 176, 0], [-120, 186, 1], [-40, 172, 0], [40, 184, 1], [180, 178, 0], [230, 190, 1]].forEach(([dx, y, ci]) => { k.fillStyle = ci ? C.yel : C.coral; k.beginPath(); k.arc(c + dx, y, 7, 0, 7); k.fill(); });
  if (label) txt(k, 'FIELD', x0 + 28, 70, `800 70px ${DISP}`, C.navy, 'left', 'middle', '2px');
  k.restore();
}
const scSea = (k, w, h) => pnSea(k, 0, w, h, 0, true), scMtn = (k, w, h) => pnMtn(k, 0, w, h, 0, true);
const scCity = (k, w, h) => pnCity(k, 0, w, h, 0, true), scField = (k, w, h) => pnField(k, 0, w, h, 0, true);
const SEG3 = CYC / 2;
function abCell(trans) { return (k, w, h, u) => { u = snapU(u); const sgi = Math.min(1, Math.floor(u / SEG3)), uu = u - sgi * SEG3; trans(k, w, h, uu, sgi, 1 - sgi); }; }
const TA = 0.5, TB = 1.5;
// 破片や紙の形（多角形）のパス。ページめくり（20）とガラス割れ（22）で使う
function polyPath(k, pts) { k.beginPath(); pts.forEach((p, i) => i ? k.lineTo(p[0], p[1]) : k.moveTo(p[0], p[1])); k.closePath(); }

// Motion Prompt #135 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#135
//
// Kaleidoscope / カレイドスコープ
// Pack: motion2 (Motion graphics moves, part 2) · element 15 · Category: Text & shapes
// What happens: An 8-way symmetrical pattern turns and spreads out from the centre, like a kaleidoscope.
// Motion spec:
//   - The area around the centre is split into eight 45° wedges; every other wedge is drawn mirrored, giving eight mirror-symmetric sections.
//   - One wedge holds 13 shapes (circles, diamonds, triangles; four colours; fixed random seed). They travel outward from the centre to radius 300, one full radius per 4.7 s, wrapping back to the centre.
//   - Shapes grow as they go out ((5 + 0.1r) × 0.7–1.4) and spin 0.02 rad per px. They fade in over the first 30 px and out over the last 70 px; each sways ±0.08 rad once per 4.7 s.
//   - The whole pattern turns 90° per 4.7 s (two wedges, so the loop joins up).
//   - A white eight-point star at the centre (radius 20 ± 4, pulsing twice per 4.7 s).
// When to use it: Use it for music videos, live backdrops or dreamy scene changes, wherever a pattern has to hold up on repeat.
// Tags: kaleidoscope, symmetry, mirror, mandala, pattern, radial, psychedelic
// Size: 539x208 px · Cycle: 4.7 s
// Needs: kit motion2 -> https://showheyohtaki.github.io/motion-prompt/api/v1/kit/motion2.js
// Live demo: https://showheyohtaki.github.io/motion-prompt/#135
//
// cells[i](k, w, h, u): k = CanvasRenderingContext2D (already cleared and wrapped in save/restore by the caller), w,h = size, u = seconds in [0, cycle). The picture depends only on u.
// Element code starts here. CELLS, constants and helpers live in the kit.

// @element 15
// 15 カレイドスコープ（万華鏡のように、8分割の対称な模様が回りながら広がる）
const KAL = (() => { const R = rand(1515), a = []; for (let i = 0; i < 13; i++) a.push({ r0: R() * 300, th: 0.06 + R() * 0.66, kind: i % 3, col: PAL[i % 4], sz: 0.7 + R() * 0.7, ph: R() * 6 }); return a; })();
CELLS[14] = (k, w, h, u) => {
  stage(k);
  const X = w / 2, Y = h / 2, RM = 300, rot = (Math.PI / 2) * u / CYC, W8 = Math.PI / 4;
  for (let s = 0; s < 8; s++) {
    k.save(); k.translate(X, Y);
    if (s % 2) { k.rotate(rot + (s + 1) * W8); k.scale(1, -1); } else k.rotate(rot + s * W8);
    k.beginPath(); k.moveTo(0, 0); k.arc(0, 0, RM + 60, -0.006, W8 + 0.006); k.closePath(); k.clip();
    for (const it of KAL) {
      const r = mod(it.r0 + (u / CYC) * RM, RM), th = it.th + 0.08 * Math.sin(2 * Math.PI * u / CYC + it.ph), sz = (5 + r * 0.1) * it.sz;
      const a = smooth(P(r, 0, 30)) * (1 - smooth(P(r, RM - 70, RM))); if (a <= 0) continue;
      k.globalAlpha = a; k.fillStyle = it.col; k.save(); k.translate(Math.cos(th) * r, Math.sin(th) * r); k.rotate(r * 0.02);
      if (it.kind === 0) { k.beginPath(); k.arc(0, 0, sz, 0, 7); k.fill(); }
      else if (it.kind === 1) { k.beginPath(); k.moveTo(0, -sz * 1.2); k.lineTo(sz * 0.8, 0); k.lineTo(0, sz * 1.2); k.lineTo(-sz * 0.8, 0); k.closePath(); k.fill(); }
      else { k.beginPath(); k.moveTo(0, -sz); k.lineTo(sz * 0.95, sz * 0.7); k.lineTo(-sz * 0.95, sz * 0.7); k.closePath(); k.fill(); }
      k.restore();
    }
    k.globalAlpha = 1; k.restore();
  }
  k.fillStyle = '#fff'; star(k, X, Y, 20 + 4 * Math.sin(2 * Math.PI * 2 * u / CYC), rot, 0.5, 8); k.fill();
};

// Motion Prompt #136 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#136
//
// Line boil / ラインボイル
// Pack: motion2 (Motion graphics moves, part 2) · element 16 · Category: Text & shapes
// What happens: A hand-drawn line picture wobbles every few frames while the picture itself stays still.
// Motion spec:
//   - A still line drawing (a yellow star, a white cloud, mint sparkle strokes, a faint ground line). Line widths 6–8, round caps.
//   - The drawing does not move. 47 times per 4.7 s (about every 0.1 s) every point is redrawn with a fixed random offset of up to ±3.5 px in x and in y.
//   - Each line is first turned into a row of points (every 6–13 px; 96 points round the cloud) and drawn as quadratic curves through the midpoints between them, so it wobbles like hand-drawn frames.
//   - The offsets are a hash of the frame number and the point number, so the same frame always looks the same.
// When to use it: Use it on hand-drawn illustrations, icons or lettering to make even a still picture feel drawn by hand.
// Tags: line-boil, boil, hand-drawn, wobble, jitter, sketch, frame-by-frame
// Size: 539x208 px · Cycle: 4.7 s
// Needs: kit motion2 -> https://showheyohtaki.github.io/motion-prompt/api/v1/kit/motion2.js
// Live demo: https://showheyohtaki.github.io/motion-prompt/#136
//
// cells[i](k, w, h, u): k = CanvasRenderingContext2D (already cleared and wrapped in save/restore by the caller), w,h = size, u = seconds in [0, cycle). The picture depends only on u.
// Element code starts here. CELLS, constants and helpers live in the kit.

// @element 16
// 16 ラインボイル（手描き風の線の絵が、数コマごとに小刻みに揺らぐ。絵は動かない）
function densify(pts, closed, step) { const out = [], n = pts.length, m = closed ? n : n - 1; for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), c = Math.max(1, Math.round(d / step)); for (let j = 0; j < c; j++) out.push([lerp(a[0], b[0], j / c), lerp(a[1], b[1], j / c)]); } if (!closed) out.push(pts[n - 1]); return out; }
const LB = (() => {
  const st = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 30 : 70, a = -Math.PI / 2 + i * Math.PI / 5; st.push([150 + Math.cos(a) * r, 112 + Math.sin(a) * r]); }
  const CIR = [[318, 132, 26], [354, 104, 36], [408, 94, 42], [456, 122, 30]], O = [388, 130], cl = [];
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let tm = 0;
    const tx = dx > 0 ? (470 - O[0]) / dx : dx < 0 ? (310 - O[0]) / dx : 1e9, ty = dy > 0 ? (150 - O[1]) / dy : dy < 0 ? (118 - O[1]) / dy : 1e9; tm = Math.min(tx, ty);
    for (const [ccx, ccy, r] of CIR) { const ox = O[0] - ccx, oy = O[1] - ccy, b = ox * dx + oy * dy, c2 = ox * ox + oy * oy - r * r, D = b * b - c2; if (D >= 0) { const t = -b + Math.sqrt(D); if (t > tm) tm = t; } }
    cl.push([O[0] + dx * tm, O[1] + dy * tm]);
  }
  return [
    { pts: densify(st, true, 13), col: C.yel, closed: true, w: 8 },
    { pts: cl, col: '#fff', closed: true, w: 8 },
    { pts: densify([[248, 44], [266, 62]], false, 6), col: C.mint, closed: false, w: 7 },
    { pts: densify([[254, 104], [280, 104]], false, 6), col: C.mint, closed: false, w: 7 },
    { pts: densify([[60, 34], [74, 52]], false, 6), col: C.mint, closed: false, w: 7 },
    { pts: densify([[318, 178], [460, 178]], false, 10), col: C.dim, closed: false, w: 6 },
  ];
})();
CELLS[15] = (k, w, h, u) => {
  u = snapU(u);
  stage(k);
  const fi = Math.floor(u / (CYC / 47));
  k.lineCap = 'round'; k.lineJoin = 'round';
  LB.forEach((sh, si) => {
    const q = sh.pts.map((p, j) => [p[0] + (H01(fi * 7919 + j * 131 + si * 17) - 0.5) * 7, p[1] + (H01(fi * 6007 + j * 97 + si * 29 + 5) - 0.5) * 7]);
    k.strokeStyle = sh.col; k.lineWidth = sh.w; k.beginPath();
    const n = q.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (sh.closed) { const m0 = mid(q[n - 1], q[0]); k.moveTo(m0[0], m0[1]); for (let j = 0; j < n; j++) { const m = mid(q[j], q[(j + 1) % n]); k.quadraticCurveTo(q[j][0], q[j][1], m[0], m[1]); } k.closePath(); }
    else { k.moveTo(q[0][0], q[0][1]); for (let j = 1; j < n - 1; j++) { const m = mid(q[j], q[j + 1]); k.quadraticCurveTo(q[j][0], q[j][1], m[0], m[1]); } k.lineTo(q[n - 1][0], q[n - 1][1]); }
    k.stroke();
  });
};
registry.kaleidoscope = { cell: CELLS[14], w: CW, h: CH, cycle: CYC };
registry.lineBoil = { cell: CELLS[15], w: CW, h: CH, cycle: CYC };
})();

window.MotionPromptCells = registry;
})();

/* Canvas runner: pure cells, driven only by elapsed time; reduced-motion shows a still frame.
   refresh() re-queries the canvases — called after the shell swaps <main> in place
   so pages reached without a reload keep their studies running. */
(function () {
  "use strict";
  var registry = window.MotionPromptCells;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var observers = [];
  var active = [];
  var rafId = 0;

  function paint(canvas, def, u) {
    var ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, def.w, def.h);
    ctx.save();
    def.cell(ctx, def.w, def.h, u);
    ctx.restore();
  }

  function stop() {
    observers.forEach(function (observer) { observer.disconnect(); });
    observers = [];
    active = [];
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
  }

  function setup() {
    stop();
    var canvases = document.querySelectorAll("canvas[data-motion-cell]");
    if (!registry || !canvases.length) return;

    canvases.forEach(function (canvas) {
      var def = registry[canvas.dataset.motionCell];
      if (!def) return;
      canvas.width = def.w;
      canvas.height = def.h;
      paint(canvas, def, 0);
      if (reduce.matches || !("IntersectionObserver" in window)) return;
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var index = active.indexOf(canvas);
          if (entry.isIntersecting) { if (index < 0) active.push(canvas); }
          else if (index >= 0) active.splice(index, 1);
        });
      }, { threshold: 0.05 });
      observer.observe(canvas);
      observers.push(observer);
    });

    var t0 = performance.now();
    function loop(now) {
      if (active.length) {
        var t = (now - t0) / 1000;
        active.forEach(function (canvas) {
          var def = registry[canvas.dataset.motionCell];
          if (def && canvas.isConnected) paint(canvas, def, t % def.cycle);
        });
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  window.MotionPromptCellsRunner = { refresh: setup };
  setup();
})();

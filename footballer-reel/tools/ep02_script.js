const $ = id => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => cl((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);
const eb = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const DURATION = 25.8;
const AMTS = [20,5,50,10,15,30,25,40,8,60,35,12,45,18,22,70,28,55,32,60]; // $K, sums to 640
const mix = (a, b, p) => { const h = s => [1,3,5].map(i => parseInt(s.slice(i,i+2),16)); const A=h(a),B=h(b);
  return '#' + A.map((v,i)=>Math.round(v+(B[i]-v)*p).toString(16).padStart(2,'0')).join(''); };
(function build() {
  let st = ''; for (let i = 0; i < 60; i++) st += `<circle cx="${(i*97)%540}" cy="${(i*53)%330}" r="${1+(i%3)*.6}" fill="#fff" opacity="${.25+(i%5)*.12}"/>`;
  $('stars').innerHTML = st;
  let g = '';
  AMTS.forEach((a, i) => { const x = 90 + (i % 5) * 90, y = 372 + Math.floor(i / 5) * 88;
    g += `<g transform="translate(${x} ${y})"><circle id="fc${i}" r="27" fill="#cfc5b4" stroke="#1b1410" stroke-width="4"/>
      <circle cx="-9" cy="-3" r="3.5" fill="#1b1410"/><circle cx="9" cy="-3" r="3.5" fill="#1b1410"/><path d="M-9 10q9 6 18 0" fill="none" stroke="#1b1410" stroke-width="3.5" stroke-linecap="round"/>
      <text id="ft${i}" y="50" font-size="13" font-weight="800" text-anchor="middle" fill="#1b1410" class="mono" opacity="0">$${a}K</text></g>`; });
  $('faces').innerHTML = g;
})();
const CAPS = [
  [0.1, 1.6, 'Week one.'], [1.7, 4.3, "Your phone won't stop."],
  [7.0, 9.1, 'Nobody asks for a lot.'], [9.2, 11.3, 'Everybody asks.'],
  [19.1, 20.7, 'One person asks for nothing.'], [22.3, 23.1, "He's right."], [23.15, 25.7, "But the car's already in the driveway."],
];
function captionInner(t) {
  const el = $('capText'); const c = CAPS.find(c => t >= c[0] && t < c[1]);
  if (!c) { el.textContent = ''; return; }
  const words = c[2].split(' '), per = (c[1] - c[0]) * .8 / words.length;
  el.setAttribute('opacity', eo(seg(t, c[0], c[0] + .12)) * (1 - eo(seg(t, c[1] - .1, c[1]))));
  const lines = []; let cur = [];
  words.forEach((w, i) => { if (cur.map(c => c[0]).join(' ').length + w.length > 24 && cur.length) { lines.push(cur); cur = []; } cur.push([w, i]); }); lines.push(cur);
  el.innerHTML = lines.map((ln, li) => ln.map(([w, i], k) =>
    `<tspan ${k === 0 ? `x="270" y="${1000 - 46 * (lines.length - 1 - li)}"` : ''} fill="#fff" fill-opacity="${t >= c[0] + i * per ? 1 : .42}">${w}${k < ln.length - 1 ? ' ' : ''}</tspan>`).join('')).join('');
}
function caption(t) {
  captionInner(t);
  const e = $('capText'), sh = $('capShadow');
  sh.innerHTML = e.innerHTML.replace(/fill="#fff" fill-opacity="[^"]*"/g, 'fill="#000"');
  sh.setAttribute('opacity', e.textContent ? .4 * (+e.getAttribute('opacity') || 0) : 0);
}
const SC = ['s1','s3','s4','s5','s7','s6'];
const show = n => SC.forEach(s => $(s).setAttribute('display', s === n ? 'inline' : 'none'));
const pop = (id, t, a, x, y, rise = 18) => { const p = eb(seg(t, a, a + .3)); $(id).setAttribute('opacity', seg(t, a, a + .1)); $(id).setAttribute('transform', `translate(${x} ${y - rise * p}) scale(${.6 + .4 * p})`); };

function render(t) {
  const cuts = [4.4, 6.8, 12.4, 19.0, 22.0]; let f = 0;
  cuts.forEach(c => { const d = t - c; if (d >= 0 && d < .12) f = Math.max(f, .35 * (1 - d / .12)); });
  $('flash').setAttribute('opacity', f);
  if (t < 4.4) {
    show('s1'); const s = 1.05 + .08 * seg(t, 0, 4.4);
    $('cam1').setAttribute('transform', `translate(270 420) scale(${s}) translate(-270 -420)`);
    $('kid1').setAttribute('transform', `translate(${270 + Math.sin(t * 50) * 1.6} ${500 + Math.sin(t * 13) * 2}) scale(1.3)`);
    [[0.3,50,250],[1.0,320,300],[1.7,40,390],[2.4,320,430]].forEach((n, i) => pop('a1' + i, t, n[0], n[1], n[2]));
  } else if (t < 6.8) {
    show('s3'); const u = t - 4.4;
    $('kicker3').setAttribute('opacity', eo(seg(u, 0, .25)));
    const L = $('lines3').children;
    for (let i = 0; i < 4; i++) { const a = .15 + i * .22, p = eb(seg(u, a, a + .28)), y = [440,552,664,776][i] - 40;
      L[i].setAttribute('opacity', seg(u, a, a + .1)); L[i].setAttribute('transform', `translate(270 ${y}) scale(${1.5 - .5 * p}) translate(-270 ${-y})`); }
  } else if (t < 12.4) {
    show('s4'); const u = t - 6.8;
    $('cam4').setAttribute('transform', `translate(270 420) scale(${1.08 + .1 * seg(u, 0, 5.6)}) translate(-270 -420)`);
    $('kid4').setAttribute('transform', `translate(${270 + Math.sin(u * 45) * 1.4} ${488 + Math.sin(u * 11) * 2}) scale(1.3)`);
    $('hud').setAttribute('opacity', eo(seg(u, 0, .25)));
    $('pressure').textContent = Math.round(20 + 25 * eo(seg(u, .3, 5.0))) + '%';
    [[7.2,40,260],[8.4,300,330],[9.7,50,400]].forEach((n, i) => pop('a' + i, t, n[0], n[1], n[2]));
  } else if (t < 19.0) {
    show('s5'); const u = t - 12.4; let sum = 0;
    AMTS.forEach((a, i) => { const st = .5 + i * .15, p = eb(seg(u, st, st + .25)), on = seg(u, st, st + .2); sum += a * on;
      $('fc' + i).setAttribute('fill', mix('#cfc5b4', '#f2a6bf', on)); $('fc' + i).setAttribute('r', 27 + 3 * Math.sin(p * Math.PI));
      $('ft' + i).setAttribute('opacity', on); });
    $('askbar').setAttribute('width', 290 * sum / 530); $('askv').setAttribute('x', 100 + 290 * sum / 530 + 10);
    $('askv').textContent = '$' + Math.round(sum) + 'K';
    const ov = seg(u, 4.7, 5.0); $('over').setAttribute('opacity', ov); $('over').setAttribute('transform', `translate(270 950) scale(${.8 + .2 * eb(ov)}) translate(-270 -950)`);
  } else if (t < 22.0) {
    show('s7'); const u = t - 19.0;
    $('coach').setAttribute('transform', `translate(270 ${520 + Math.sin(u * 3) * 3}) scale(${1.3 + .04 * seg(u, 0, 3)})`);
    $('quote').setAttribute('opacity', seg(u, 1.6, 1.9));
  } else {
    show('s6'); const u = t - 22.0;
    $('headl').setAttribute('opacity', eo(seg(u, .2, .8)) * (.7 + .3 * Math.sin(u * 9)));
    $('car').setAttribute('transform', `translate(${270 + (1 - eo(seg(u, 0, 1.2))) * 90} 640)`);
  }
  caption(t);
}
window.render = render; window.DURATION = DURATION;
if (!location.search.includes('capture')) {
  let t0 = performance.now();
  const loop = now => { let t = (now - t0) / 1000; if (t > DURATION + 1.5) { t0 = now; t = 0; } render(Math.min(t, DURATION)); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); document.addEventListener('click', () => { t0 = performance.now(); });
} else { render(0); }

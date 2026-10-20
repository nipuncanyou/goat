// usage: node capture.js <outDir> <fps> [t1,t2,...]   (explicit times = preview stills)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2], fps = +process.argv[3] || 30;
  const times = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 540, height: 1170 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?capture');
  await p.evaluate(() => document.fonts.ready);
  const D = await p.evaluate(() => window.DURATION);
  const ts = times || Array.from({ length: Math.round(D * fps) }, (_, i) => i / fps);
  for (let i = 0; i < ts.length; i++) {
    await p.evaluate(t => window.render(t), ts[i]);
    await p.screenshot({ path: path.join(out, (times ? 't' + ts[i] : String(i).padStart(4, '0')) + '.png') });
  }
  await b.close();
})();

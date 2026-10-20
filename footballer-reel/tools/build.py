"""Build one episode: frames -> mp4, TTS voice, music bed (ducked), mux.
usage: <venv>/bin/python tools/build.py epNN [--skip-frames]
needs: node+playwright+chromium, ffmpeg, piper-tts (+ en-us-ryan-high voice), numpy
episode folder holds index.html (window.render/DURATION) and lines.json:
  {"arp_from": 10.4, "arp_boost": 14.4, "lines": [[start_s, "text"], ...]}
env: SCRATCH = work dir that holds voice/ (piper model); frames go to $SCRATCH/frames_<ep>
"""
import json, os, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
EP = sys.argv[1]
EPDIR = os.path.join(HERE, '..', EP)
SCR = os.environ['SCRATCH']
VOICE = os.path.join(SCR, 'voice', 'en-us-ryan-high.onnx')
cfg = json.load(open(os.path.join(EPDIR, 'lines.json')))
W = os.path.join(SCR, 'work_' + EP); os.makedirs(W, exist_ok=True)
run = lambda *a, **k: subprocess.run(a, check=True, **k)

# 1) frames -> silent video
dur = float(subprocess.check_output(['node', '-e', f"""
const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch({{executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']}});
const p=await b.newPage();await p.goto('file://'+require('path').resolve('{EPDIR}/index.html')+'?capture');
console.log(await p.evaluate(()=>window.DURATION));await b.close()}})()"""], env={**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()}))
frames = os.path.join(SCR, 'frames_' + EP)
if '--skip-frames' not in sys.argv:
    run('rm', '-rf', frames)
    run('node', os.path.join(HERE, 'capture.js'), os.path.join(EPDIR, 'index.html'), frames, '30',
        env={**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()})
silent = os.path.join(W, 'silent.mp4')
run('ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', frames + '/%04d.png', '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', silent)

# 2) music bed (synthesised)
SR = 44100; N = int(SR * (dur + .2)); t = np.arange(N) / SR
bpm = 104; beat = 60 / bpm; bar = beat * 4
out = np.zeros(N); rs = np.random.RandomState
def add(sig, start):
    i = int(start * SR); n = min(len(sig), N - i)
    if n > 0: out[i:i + n] += sig[:n]
env = lambda x, a, r: np.minimum(x / a, 1) * np.exp(-x / r)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]; bass = [33, 29, 36, 31]
for b in range(int(dur / bar) + 1):
    s = b * bar; k = (b // 2) % 4; x = np.arange(int(bar * SR)) / SR
    pad = sum(sum(np.sin(2 * np.pi * f(m) * h * x) / h ** 1.5 for h in (1, 2, 3)) for m in chords[k])
    add(pad * np.minimum(x / .5, 1) * np.minimum((bar - x) / .4, 1) * .045, s)
    for e in range(8):
        x = np.arange(int(beat / 2 * SR)) / SR
        add(np.sin(2 * np.pi * f(bass[k]) * x) * env(x, .005, .22) * .35, s + e * beat / 2)
    for q in range(4):
        x = np.arange(int(.3 * SR)) / SR
        add(np.sin(2 * np.pi * (48 + 90 * np.exp(-x * 30)) * x) * env(x, .002, .09) * .7, s + q * beat)
        h = rs(b * 4 + q).randn(int(.05 * SR)); h = np.diff(h, prepend=0) * env(np.arange(len(h)) / SR, .001, .015)
        add(h * .12, s + q * beat + beat / 2)
        if q in (1, 3):
            c = rs(q + b).randn(int(.12 * SR)) * env(np.arange(int(.12 * SR)) / SR, .002, .05); add(c * .16, s + q * beat)
for i in range(int(dur / (beat / 2))):
    s = i * beat / 2
    if s < cfg['arp_from']: continue
    k = int(s // (bar * 2)) % 4; m = chords[k][i % 3] + 12; x = np.arange(int(.3 * SR)) / SR
    add(np.sin(2 * np.pi * f(m) * x) * env(x, .004, .12) * (.10 if s < cfg['arp_boost'] else .15), s)
out *= np.minimum(t / .6, 1) * np.minimum((dur + .2 - t) / 1.2, 1); out = np.tanh(out * 1.4) * .8
mw = os.path.join(W, 'music.wav'); w = wave.open(mw, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.stack([out, out], 1) * 32767).astype('<i2').tobytes()); w.close()

# 3) voice lines (fast), EQ'd, mixed with ducked music
ins, fl = [], []
for i, (st, txt) in enumerate(cfg['lines']):
    wav = os.path.join(W, f'v{i}.wav')
    run(os.path.join(os.path.dirname(sys.executable), 'python'), '-m', 'piper', '-m', VOICE, '--length-scale', '0.78',
        '--noise-w', '0.4', '-f', wav, input=txt.encode(), capture_output=True)
    ins += ['-i', wav]; fl.append(f'[{i}:a]adelay={int(st*1000)}|{int(st*1000)}[a{i}]')
n = len(cfg['lines'])
g = ';'.join(fl) + ';' + ''.join(f'[a{i}]' for i in range(n))
g += (f'amix=inputs={n}:normalize=0,highpass=f=90,equalizer=f=250:t=q:w=1:g=-3,equalizer=f=3200:t=q:w=1:g=4,'
      f'equalizer=f=6000:t=q:w=1.5:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=4,'
      f'alimiter=limit=0.95,apad,atrim=0:{dur},asplit[v1][v2];')
g += f'[{n}:a]volume=0.55,atrim=0:{dur}[m];[m][v1]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];'
g += '[duck][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=7[out]'
mix = os.path.join(W, 'mix.wav')
run('ffmpeg', '-v', 'error', '-y', *ins, '-i', mw, '-filter_complex', g, '-map', '[out]', '-ar', '44100', mix)

# 4) mux
final = os.path.join(EPDIR, 'episode.mp4')
run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', mix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-t', str(dur), '-movflags', '+faststart', final)
print('built', final, dur)

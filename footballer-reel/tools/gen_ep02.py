"""Generates ep02/index.html from ep01's shared defs (room, cap, kid) + Episode 2's own scenes."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
s = open('ep01/index.html').read()
head = s[:s.index('<rect width="540" height="1170" fill="#000"/>')]
kid = s[s.index('<g id="kidFront">'):s.index('<g id="notes4">')].replace('id="kidFront"', 'id="kidInner"').replace('id="phone"', 'id="phoneInner"')
head = head.replace('</defs>', '<g id="kidDef">' + kid + '</g>\n</defs>', 1).replace('<title>Day One</title>', '<title>Day One · Ep 2</title>')
tail_caps = s[s.index('<!-- captions -->'):s.index('</svg>')].replace('font-size="40"', 'font-size="38"')

def bubble(i, who, msg):
    return (f'<g id="a{i}" opacity="0"><rect width="190" height="54" rx="12" fill="#f3eadb" stroke="#1b1410" stroke-width="4"/>'
            f'<text x="12" y="21" font-size="10" font-weight="800" fill="#ff2d8a" class="mono" letter-spacing="2">{who}</text>'
            f'<text x="12" y="42" font-size="15" font-weight="700" fill="#1b1410">{msg}</text></g>')

s1 = [('COUSIN', 'you up?'), ('MUM', 'proud of you 🙂'), ('ALEX', "bro it's been ages"), ('AGENT', 'call me back')]
asks = [('COUSIN · $20K', 'just till Friday'), ('OLD MATE · $5K', 'remember me? 😄'), ('UNCLE · $50K', 'business idea?')]
b1 = ''.join(bubble('1' + str(i), *a) for i, a in enumerate(s1))
b4 = ''.join(bubble(i, *a) for i, a in enumerate(asks))
scenes = open(os.path.join('tools', 'ep02_scenes.svg')).read().replace('%%B1%%', b1).replace('%%B4%%', b4)
script = open(os.path.join('tools', 'ep02_script.js')).read()
open('ep02/index.html', 'w').write(head + '<rect width="540" height="1170" fill="#000"/>\n' + scenes + tail_caps + '</svg>\n</div>\n<script>\n' + script + '\n</script>\n</body></html>\n')
print('ok')

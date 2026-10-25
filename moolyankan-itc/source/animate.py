"""Inject entrance animations + slide transitions into a pptxgenjs deck.
usage: animate.py in.pptx anim.json out.pptx"""
import sys, json, re, zipfile

src, spec_path, out = sys.argv[1:4]
spec = json.load(open(spec_path))
ANIMS, TRANS = spec["ANIMS"], spec["TRANS"]

# ---- transitions -------------------------------------------------------
def p14(tag, extra="", dur=1100):
    return (
        '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
        '<mc:Choice xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p14">'
        f'<p:transition spd="slow" p14:dur="{dur}"><p14:{tag}{extra}/></p:transition></mc:Choice>'
        '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
    )
TRANSITIONS = {
    "fade":    '<p:transition spd="slow"><p:fade/></p:transition>',
    "push":    '<p:transition spd="med"><p:push dir="l"/></p:transition>',
    "wipe":    '<p:transition spd="med"><p:wipe dir="r"/></p:transition>',
    "split":   '<p:transition spd="med"><p:split orient="vert" dir="out"/></p:transition>',
    "ripple":  p14("ripple"),
    "doors":   p14("doors", ' dir="vert"'),
    "glitter": p14("glitter", ' pattern="hexagon" dir="r"'),
    "prism":   p14("prism"),
    "vortex":  p14("vortex", ' dir="r"'),
}

# ---- animation XML -----------------------------------------------------
class Ids:
    def __init__(self): self.n = 4
    def __call__(self): self.n += 1; return self.n

def set_vis(ids, spid):
    return (f'<p:set><p:cBhvr><p:cTn id="{ids()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            '<p:to><p:strVal val="visible"/></p:to></p:set>')

def anim_attr(ids, spid, attr, frm, to, dur, additive=True):
    add = ' additive="base"' if additive else ''
    def tav(tm, v):
        kind = "fltVal" if re.fullmatch(r"[0-9.]+", v) else "strVal"
        return f'<p:tav tm="{tm}"><p:val><p:{kind} val="{v}"/></p:val></p:tav>'
    return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr{add}><p:cTn id="{ids()}" dur="{dur}" fill="hold"/>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:tavLst>{tav(0, frm)}{tav(100000, to)}</p:tavLst></p:anim>')

def anim_filter(ids, spid, flt, dur):
    return (f'<p:animEffect transition="in" filter="{flt}"><p:cBhvr><p:cTn id="{ids()}" dur="{dur}"/>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>')

# eff -> (presetID, subtype)
PRESET = {"fade": (10, 0), "wipeL": (22, 8), "wipeD": (22, 4), "wipeU": (22, 1), "zoom": (53, 16),
          "flyB": (2, 4), "flyL": (2, 8), "flyR": (2, 2)}

def effect(ids, spid, eff, delay, dur, first):
    pid, sub = PRESET[eff]
    node = "afterEffect" if first else "withEffect"
    outer = ids()
    body = set_vis(ids, spid)
    if eff == "fade":
        body += anim_filter(ids, spid, "fade", dur)
    elif eff.startswith("wipe"):
        body += anim_filter(ids, spid, {"wipeL": "wipe(left)", "wipeD": "wipe(down)", "wipeU": "wipe(up)"}[eff], dur)
    elif eff == "zoom":
        body += anim_attr(ids, spid, "ppt_w", "0", "#ppt_w", dur) + anim_attr(ids, spid, "ppt_h", "0", "#ppt_h", dur) + anim_filter(ids, spid, "fade", dur)
    elif eff == "flyB":
        body += anim_attr(ids, spid, "ppt_x", "#ppt_x", "#ppt_x", dur) + anim_attr(ids, spid, "ppt_y", "1+#ppt_h/2", "#ppt_y", dur)
    elif eff == "flyL":
        body += anim_attr(ids, spid, "ppt_x", "0-#ppt_w/2", "#ppt_x", dur) + anim_attr(ids, spid, "ppt_y", "#ppt_y", "#ppt_y", dur)
    elif eff == "flyR":
        body += anim_attr(ids, spid, "ppt_x", "1+#ppt_w/2", "#ppt_x", dur) + anim_attr(ids, spid, "ppt_y", "#ppt_y", "#ppt_y", dur)
    return (f'<p:par><p:cTn id="{outer}" presetID="{pid}" presetClass="entr" presetSubtype="{sub}" fill="hold" nodeType="{node}">'
            f'<p:stCondLst><p:cond delay="{int(delay)}"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par>')

def timing(effects):
    ids = Ids()
    inner = "".join(effect(ids, spid, e, d, du, i == 0) for i, (spid, e, d, du) in enumerate(effects))
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{inner}</p:childTnLst></p:cTn></p:par>'
            '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn>'
            '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            '</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')

def patch(xml, no):
    names = {}
    for m in re.finditer(r'<p:cNvPr id="(\d+)" name="([^"]*)"', xml):
        names.setdefault(m.group(2), m.group(1))
    # placeholders are all named "Text 1" by pptxgenjs: resolve by ph type
    for m in re.finditer(r'<p:cNvPr id="(\d+)" name="[^"]*">.*?<p:ph\s[^>]*?type="(body|title)"', xml, re.S):
        names["kicker" if m.group(2) == "body" else "title"] = m.group(1)
    effs, missing = [], []
    for a in sorted(ANIMS.get(str(no), []), key=lambda a: a["delay"]):
        spid = names.get(a["name"])
        if spid is None: missing.append(a["name"]); continue
        effs.append((spid, a["eff"], a["delay"], a["dur"]))
    extra = TRANSITIONS.get(TRANS.get(str(no), ""), "") + (timing(effs) if effs else "")
    assert "</p:clrMapOvr>" in xml, f"slide{no}: no clrMapOvr"
    xml = xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + extra, 1)
    return xml, len(effs), missing

zin = zipfile.ZipFile(src)
zout = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    m = re.fullmatch(r"ppt/slides/slide(\d+)\.xml", item.filename)
    if m:
        xml, n, missing = patch(data.decode("utf8"), int(m.group(1)))
        print(f"slide{m.group(1)}: {n} effects", f"MISSING {missing}" if missing else "")
        data = xml.encode("utf8")
    zout.writestr(item, data)
zout.close()

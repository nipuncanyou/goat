const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const fs = require("fs");
const { applyTheme } = require("/root/.claude/skills/synced/f5b5b3ad-1911-417c-8cf9-bfbdb4bbf7ed_0d8cae53-0716-47b7-8df9-4350f5c95242/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";

// ---------- theme ----------
const THEME = {
  name: "Moolyankan ITC",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2433", lt1: "FFFFFF", dk2: "14294B", lt2: "F1F4F8",
    accent1: "B3202A", accent2: "14294B", accent3: "5B6577",
    accent4: "B8C0CC", accent5: "2F5D9B", accent6: "E3E8F0",
    hlink: "2F5D9B", folHlink: "5B6577",
  },
};
// hex copies only where the library needs hex (charts, backgrounds, icons)
const HEX = { navy: "14294B", red: "B3202A", mute: "B8C0CC", slate: "5B6577", tint: "F1F4F8", ink: "1B2433" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "Moolyankan 2026 — ITC Limited Equity Research";
pres.author = "Moolyankan 2026 Team";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const SH = pres.ShapeType;

// ---------- animation registry ----------
const ANIMS = {};   // slideNo -> [{name, eff, delay, dur}]
const TRANS = {};   // slideNo -> transition key
function reg(no, name, eff, delay = 0, dur = 500) {
  (ANIMS[no] = ANIMS[no] || []).push({ name, eff, delay, dur });
}

// ---------- icons ----------
async function icon(name, color = "#FFFFFF") {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ---------- layouts ----------
const FOOT = "MOOLYANKAN 2026  |  ITC LIMITED  |  ROUND 2";
pres.defineSlideMaster({
  title: "COVER", background: { color: HEX.navy }, objects: [],
});
pres.defineSlideMaster({
  title: "CLOSE", background: { color: HEX.navy }, objects: [],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: "FFFFFF" },
  objects: [
    { text: { text: FOOT, options: { x: 0.6, y: 7.1, w: 8, h: 0.25, fontSize: 9, bold: true, color: C.accent3, margin: 0, isTextBox: true } } },
    {
      placeholder: {
        options: { name: "kicker", type: "body", x: 0.6, y: 0.3, w: 9, h: 0.3, fontSize: 12, bold: true, color: C.accent1, margin: 0, valign: "top", align: "left" },
        text: "",
      },
    },
    {
      placeholder: {
        options: { name: "title", type: "title", x: 0.6, y: 0.62, w: 12.13, h: 1.0, fontSize: 28, bold: true, color: C.text2, margin: 0, valign: "top", align: "left" },
        text: "",
      },
    },
  ],
  slideNumber: { x: 12.2, y: 7.1, w: 0.53, h: 0.25, fontSize: 10, color: C.accent3, align: "right" },
});

// ---------- helpers ----------
function T(s, no, name, text, o, eff, delay, dur) {
  s.addText(text, { objectName: name, isTextBox: true, margin: 0, ...o });
  if (eff) reg(no, name, eff, delay, dur);
}
function R(s, no, name, shape, o, eff, delay, dur) {
  s.addShape(shape, { objectName: name, ...o });
  if (eff) reg(no, name, eff, delay, dur);
}
function ICON(s, no, name, data, x, y, d, fillColor, eff, delay) {
  R(s, no, name + "_c", SH.ellipse, { x, y, w: d, h: d, fill: { color: fillColor }, line: { type: "none" } }, eff, delay, 400);
  s.addImage({ data, x: x + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5, objectName: name + "_i", altText: name });
  if (eff) reg(no, name + "_i", eff, delay, 400);
}
function takeaway(s, no, text, y, h, delay) {
  R(s, no, "take_bg", SH.roundRect, { x: 0.6, y, w: 12.13, h, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.08 }, "wipeL", delay, 600);
  T(s, no, "take_lbl", "SO WHAT", { x: 0.85, y, w: 1.0, h, fontSize: 11, bold: true, color: "FFFFFF", valign: "middle", charSpacing: 2 }, "fade", delay + 300, 400);
  T(s, no, "take_txt", text, { x: 1.95, y, w: 10.6, h, fontSize: 14, color: "FFFFFF", valign: "middle" }, "fade", delay + 450, 500);
}
function foot(s, no, text, y, h, delay) {
  T(s, no, "foot", text, { x: 0.6, y, w: 12.13, h, fontSize: 10, color: C.accent3, valign: "top" }, "fade", delay, 500);
}
function head(s, no, kicker, title) {
  s.addText(kicker, { placeholder: "kicker", objectName: "kicker" });
  s.addText(title, { placeholder: "title", objectName: "title" });
  reg(no, "kicker", "fade", 0, 400);
  reg(no, "title", "wipeL", 150, 700);
}
function panelLabel(s, no, name, text, x, y, w, delay) {
  T(s, no, name, text, { x, y, w, h: 0.3, fontSize: 12, bold: true, color: C.text2, valign: "middle" }, "fade", delay, 400);
}
const chartFont = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt" };

(async () => {
  const ic = {};
  for (const n of ["FaSmoking", "FaShoppingBasket", "FaSeedling", "FaBoxOpen", "FaLaptopCode", "FaHotel",
    "FaChartLine", "FaBullseye", "FaExclamationTriangle", "FaBalanceScale", "FaFlag", "FaSearch",
    "FaLayerGroup", "FaCoins", "FaGavel", "FaIndustry", "FaCalendarCheck", "FaLightbulb", "FaBan"]) ic[n] = await icon(n);
  const icRed = await icon("FaExclamationTriangle", "#B3202A");

  // =====================================================================
  // COVER
  // =====================================================================
  pres.addSection({ title: "Cover" });
  {
    const no = 1;
    const s = pres.addSlide({ masterName: "COVER", sectionTitle: "Cover" });
    // concentric rings, right side
    const rings = [[6.2, 0.18], [4.6, 0.12], [3.0, 0.10]];
    rings.forEach(([d, tr], i) => {
      const cx = 10.4, cy = 3.75;
      R(s, no, "ring" + i, SH.ellipse, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: "FFFFFF", transparency: 100 - tr * 100 }, line: { color: "FFFFFF", width: 1, transparency: 70 } }, "zoom", 200 + i * 250, 900);
    });
    R(s, no, "dot", SH.ellipse, { x: 10.4 - 0.55, y: 3.75 - 0.55, w: 1.1, h: 1.1, fill: { color: C.accent1 }, line: { type: "none" } }, "zoom", 1000, 700);
    s.addImage({ data: ic.FaChartLine, x: 10.4 - 0.27, y: 3.75 - 0.27, w: 0.54, h: 0.54, objectName: "dot_i", altText: "chart" });
    reg(no, "dot_i", "zoom", 1150, 600);

    T(s, no, "c_pill", "MOOLYANKAN 2026  ·  ROUND 2", { x: 0.9, y: 1.35, w: 3.6, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle", shape: SH.roundRect, rectRadius: 0.2, fill: { color: C.accent1 }, charSpacing: 3 }, "flyL", 300, 600);
    T(s, no, "c_title", "ITC Limited", { x: 0.9, y: 2.1, w: 7.2, h: 1.5, fontSize: 80, bold: true, color: "FFFFFF", fontFace: "+mj-lt", valign: "middle" }, "wipeL", 600, 900);
    T(s, no, "c_sub", "Equity Research", { x: 0.9, y: 3.65, w: 7.2, h: 0.6, fontSize: 30, color: "CADCFC", valign: "middle" }, "fade", 1400, 700);
    T(s, no, "c_team", [
      { text: "[Team name]  ·  [Member names]", options: { breakLine: true, fontSize: 16, bold: true, color: "FFFFFF" } },
      { text: "Valuation date: to be finalised after the model is completed", options: { fontSize: 13, color: "B8C0CC" } },
    ], { x: 0.9, y: 5.4, w: 7.2, h: 0.9, valign: "top", paraSpaceAfter: 6 }, "flyB", 1800, 700);
    TRANS[no] = "fade";
  }

  // =====================================================================
  // 1 — INVESTMENT THESIS
  // =====================================================================
  pres.addSection({ title: "Thesis & Business" });
  {
    const no = 2;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Thesis & Business" });
    head(s, no, "01  ·  INVESTMENT THESIS", "A differentiated investment case for ITC Limited");

    // left valuation card
    R(s, no, "fv_card", SH.roundRect, { x: 0.6, y: 1.75, w: 4.6, h: 4.55, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.1 }, "zoom", 400, 700);
    T(s, no, "fv_lbl", "BASE-CASE FAIR VALUE PER SHARE", { x: 0.9, y: 2.0, w: 4.0, h: 0.3, fontSize: 12, bold: true, color: "CADCFC", charSpacing: 1 }, "fade", 900, 400);
    T(s, no, "fv_num", "₹ ——", { x: 0.9, y: 2.35, w: 4.0, h: 1.25, fontSize: 66, bold: true, color: "FFFFFF", fontFace: "+mj-lt", valign: "middle" }, "zoom", 1100, 700);
    T(s, no, "fv_sub", "Pending valuation model", { x: 0.9, y: 3.6, w: 4.0, h: 0.3, fontSize: 13, italic: true, color: "B8C0CC" }, "fade", 1500, 400);
    // rating pills
    ["BUY", "HOLD", "SELL"].forEach((r, i) => {
      T(s, no, "rate" + i, r, { x: 0.9 + i * 1.35, y: 4.15, w: 1.2, h: 0.42, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", shape: SH.roundRect, rectRadius: 0.21, line: { color: "FFFFFF", width: 1, transparency: 40 } }, "flyB", 1600 + i * 150, 500);
    });
    T(s, no, "mini1", [
      { text: "Current market price", options: { fontSize: 11, color: "B8C0CC", breakLine: true } },
      { text: "₹ —  as of valuation date", options: { fontSize: 15, bold: true, color: "FFFFFF" } },
    ], { x: 0.9, y: 4.85, w: 4.0, h: 0.6 }, "fade", 2100, 500);
    T(s, no, "mini2", [
      { text: "Expected return over stated horizon", options: { fontSize: 11, color: "B8C0CC", breakLine: true } },
      { text: "— %  over [horizon]", options: { fontSize: 15, bold: true, color: "FFFFFF" } },
    ], { x: 0.9, y: 5.5, w: 4.0, h: 0.6 }, "fade", 2250, 500);

    // right: three reasons
    panelLabel(s, no, "rs_lbl", "THREE KEY REASONS", 5.5, 1.75, 4, 800);
    for (let i = 0; i < 3; i++) {
      const y = 2.1 + i * 0.82;
      R(s, no, "rs_bg" + i, SH.roundRect, { x: 5.5, y, w: 7.23, h: 0.7, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "flyR", 1000 + i * 250, 600);
      T(s, no, "rs_n" + i, String(i + 1), { x: 5.68, y: y + 0.13, w: 0.44, h: 0.44, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle", shape: SH.ellipse, fill: { color: C.accent1 } }, "zoom", 1200 + i * 250, 400);
      T(s, no, "rs_t" + i, "Reason " + (i + 1) + " — to be drawn from the completed model and valuation", { x: 6.3, y, w: 6.2, h: 0.7, fontSize: 14, color: C.accent3, valign: "middle", italic: true }, "fade", 1300 + i * 250, 500);
    }
    // downside risk
    R(s, no, "risk_bg", SH.roundRect, { x: 5.5, y: 4.62, w: 7.23, h: 0.78, fill: { color: "FFFFFF" }, line: { color: C.accent1, width: 1.5 }, rectRadius: 0.08 }, "flyR", 2000, 600);
    ICON(s, no, "risk_ic", icRed, 5.68, 4.8, 0.42, C.background2, "zoom", 2200);
    T(s, no, "risk_t", [
      { text: "PRINCIPAL DOWNSIDE RISK  ", options: { bold: true, color: C.accent1, fontSize: 11 } },
      { text: "to be identified from the bear-case analysis", options: { italic: true, color: C.accent3, fontSize: 14 } },
    ], { x: 6.3, y: 4.62, w: 6.3, h: 0.78, valign: "middle" }, "fade", 2300, 500);

    // bull/base/bear indicator
    panelLabel(s, no, "gauge_lbl", "BULL / BASE / BEAR VALUATION RANGE", 5.5, 5.45, 5, 2400);
    R(s, no, "g_track", SH.roundRect, { x: 5.8, y: 5.93, w: 6.63, h: 0.1, fill: { color: HEX.mute }, line: { type: "none" }, rectRadius: 0.05 }, "wipeL", 2500, 700);
    [["BEAR", 0, C.accent4], ["BASE", 0.5, C.accent1], ["BULL", 1, C.text2]].forEach(([l, f, col], i) => {
      const cx = 5.8 + f * 6.63;
      R(s, no, "g_dot" + i, SH.ellipse, { x: cx - 0.14, y: 5.84, w: 0.28, h: 0.28, fill: { color: col }, line: { color: "FFFFFF", width: 2 } }, "zoom", 2800 + i * 200, 400);
      T(s, no, "g_lbl" + i, l + "  ₹ —", { x: cx - 0.8, y: 6.14, w: 1.6, h: 0.25, fontSize: 11, bold: true, color: C.accent3, align: "center" }, "fade", 2900 + i * 200, 400);
    });
    takeaway(s, no, "Recommendation, price target and expected return stay blank until the financial model and valuation are complete.", 6.5, 0.48, 3300);
    TRANS[no] = "ripple";
  }

  // =====================================================================
  // 2 — COMPANY OVERVIEW
  // =====================================================================
  {
    const no = 3;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Thesis & Business" });
    head(s, no, "02  ·  COMPANY OVERVIEW", "ITC has diversified beyond cigarettes—but its businesses have different economic models");

    // KPI strip
    [["FY2026 STANDALONE GROSS REVENUE", "₹80,867 crore"], ["FY2026 STANDALONE EBITDA", "₹25,208 crore"]].forEach(([l, v], i) => {
      const x = 0.6 + i * 4.3;
      R(s, no, "kpi_bg" + i, SH.roundRect, { x, y: 1.72, w: 4.1, h: 0.5, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "flyL", 500 + i * 200, 500);
      T(s, no, "kpi_t" + i, [
        { text: l + "   ", options: { fontSize: 10, bold: true, color: C.accent3 } },
        { text: v, options: { fontSize: 16, bold: true, color: C.text2 } },
      ], { x: x + 0.2, y: 1.72, w: 3.8, h: 0.5, valign: "middle" }, "fade", 700 + i * 200, 400);
    });
    T(s, no, "kpi_note", "Standalone figures — not consolidated", { x: 9.2, y: 1.72, w: 3.5, h: 0.5, fontSize: 11, italic: true, color: C.accent3, valign: "middle", align: "right" }, "fade", 1000, 400);

    const tiles = [
      ["FaSmoking", "FMCG — Cigarettes", "Gold Flake, Classic, Wills Navy Cut and other cigarette brands", "Volume, pricing, product mix, taxation, regulation"],
      ["FaShoppingBasket", "FMCG — Others", "Aashirvaad, Sunfeast, Bingo!, YiPPee!, Savlon, Classmate and more", "Brand growth, market share, distribution, ad spend, margins"],
      ["FaSeedling", "Agri Business", "Agri sourcing, processing, commodity trading, exports, value-added products", "Commodity prices, procurement efficiency, crop supply, export demand"],
      ["FaBoxOpen", "Paperboards, Paper & Packaging", "Paperboards, specialty papers, flexible packaging, cartons", "Realisations, input costs, utilisation, demand"],
      ["FaLaptopCode", "Information Technology", "ITC Infotech — technology services and solutions via a subsidiary", "Enterprise client demand, service mix, delivery efficiency, tech spend"],
      ["FaHotel", "ITC Hotels Limited — Associate", "Separately listed hotel company; ITC holds ~40% (verify at valuation cutoff)", "Occupancy, ARR, RevPAR, management fees, expansion economics"],
    ];
    const TW = 3.91, TH = 1.65, GX = 0.2, GY = 0.14;
    tiles.forEach(([ik, name, desc, drv], i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.6 + col * (TW + GX), y = 2.35 + row * (TH + GY);
      const d = 0.9 + i * 220;
      const assoc = i === 5;
      R(s, no, "tile" + i, SH.roundRect, { x, y, w: TW, h: TH, fill: { color: assoc ? "FFFFFF" : C.background2 }, line: assoc ? { color: C.accent3, width: 1.25, dashType: "dash" } : { type: "none" }, rectRadius: 0.08 }, "zoom", d, 550);
      ICON(s, no, "ti" + i, ic[ik], x + 0.18, y + 0.16, 0.55, i === 0 ? C.accent1 : C.text2, "zoom", d + 150);
      T(s, no, "tn" + i, name, { x: x + 0.88, y: y + 0.14, w: TW - 1.05, h: 0.6, fontSize: 14, bold: true, color: C.text2, valign: "middle" }, "fade", d + 200, 450);
      T(s, no, "td" + i, desc, { x: x + 0.2, y: y + 0.78, w: TW - 0.4, h: 0.45, fontSize: 11.5, color: C.text1, valign: "top" }, "fade", d + 300, 450);
      T(s, no, "tk" + i, [
        { text: "Drivers: ", options: { bold: true, color: C.accent1 } },
        { text: drv, options: { color: C.accent3, italic: true } },
      ], { x: x + 0.2, y: y + 1.2, w: TW - 0.4, h: 0.42, fontSize: 10.5, valign: "top" }, "fade", d + 400, 450);
      if (assoc) T(s, no, "assoc_tag", "ASSOCIATE", { x: x + TW - 1.15, y: y + 0.1, w: 1.0, h: 0.22, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle", shape: SH.roundRect, rectRadius: 0.11, fill: { color: C.accent3 } }, "fade", d + 500, 400);
    });
    takeaway(s, no, "ITC's portfolio spans consumer brands, agri sourcing, paper & packaging, technology and a separately held hotel stake — we must distinguish the business portfolio from the financial reporting segments.", 5.98, 0.6, 2600);
    foot(s, no, "Sources: ITC business portfolio (itcportal.com/itc-businesses.html); ITC FY2026 audited results (21 May 2026) and Q4 FY2026 results presentation; ITC Hotels FY2026 results. Reporting note: ITC's website lists Paperboards & Specialty Papers and Packaging separately; its reported financial segment is Paperboards, Paper & Packaging. The Hotels business was demerged into ITC Hotels Limited effective 1 January 2025.", 6.65, 0.42, 3000);
    TRANS[no] = "push";
  }

  // =====================================================================
  // 3 — PROFIT POOLS & CAPITAL ALLOCATION
  // =====================================================================
  pres.addSection({ title: "Evidence" });
  {
    const no = 4;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
    head(s, no, "03  ·  PROFIT POOLS & CAPITAL ALLOCATION", "Cigarettes generated 82.2% of ITC's FY2026 consolidated segment results");

    panelLabel(s, no, "l_lbl", "FY2026 consolidated segment results  (₹ crore)  —  total 27,066, +5.0% YoY", 0.6, 1.72, 6.9, 500);
    const segs = ["FMCG — Cigarettes  (82.2%)", "FMCG — Others  (6.7%)", "Agri Business  (5.9%)", "Paperboards, Paper & Pkg  (2.8%)", "Others  (2.5%)"];
    s.addChart(pres.charts.BAR, [{ name: "FY2026 segment results", labels: segs, values: [22246, 1812, 1584, 754, 670] }], {
      objectName: "chart_results", x: 0.6, y: 2.0, w: 6.9, h: 2.55, barDir: "bar", catAxisOrientation: "maxMin",
      chartColors: [HEX.red, HEX.mute, HEX.mute, HEX.mute, HEX.mute], barGapWidthPct: 35,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "#,##0", dataLabelFontSize: 11, dataLabelColor: HEX.ink, dataLabelFontBold: true,
      catAxisLabelFontSize: 11, catAxisLabelColor: HEX.ink, valAxisHidden: true, valAxisMaxVal: 26500, valAxisMinVal: 0,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false, ...chartFont,
    });
    reg(no, "chart_results", "wipeL", 800, 1200);
    T(s, no, "yoy", "YoY:  Cigarettes +5.5%   ·   FMCG–Others +13.9%   ·   Agri +2.9%   ·   Paper & Pkg −14.6%   ·   Others ≈ flat", { x: 0.6, y: 4.58, w: 6.9, h: 0.28, fontSize: 10, color: C.accent3, valign: "middle" }, "fade", 2000, 500);

    panelLabel(s, no, "r_lbl", "FY2026 segment capex  (₹ crore)", 7.9, 1.72, 4.8, 900);
    const cx = ["FMCG — Others", "FMCG — Cigarettes", "Paper & Pkg", "Agri", "Others"];
    s.addChart(pres.charts.BAR, [{ name: "FY2026 capex", labels: cx, values: [970, 884, 407, 122, 71] }], {
      objectName: "chart_capex", x: 7.9, y: 2.0, w: 4.83, h: 1.75, barDir: "col", chartColors: [HEX.navy, HEX.red, HEX.mute, HEX.mute, HEX.mute], barGapWidthPct: 40,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "#,##0", dataLabelFontSize: 11, dataLabelColor: HEX.ink, dataLabelFontBold: true,
      catAxisLabelFontSize: 9, catAxisLabelColor: HEX.ink, valAxisHidden: true, valAxisMaxVal: 1200, valAxisMinVal: 0,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false, ...chartFont,
    });
    reg(no, "chart_capex", "wipeD", 1200, 1000);
    [["2,454", "Segment capex\n(₹ crore)"], ["298", "Unallocated corporate\n(₹ crore)"], ["2,752", "Total consolidated\n(₹ crore)"]].forEach(([v, l], i) => {
      const x = 7.9 + i * 1.65;
      R(s, no, "cap_bg" + i, SH.roundRect, { x, y: 3.78, w: 1.53, h: 0.82, fill: { color: i === 2 ? C.text2 : C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "zoom", 1900 + i * 200, 450);
      T(s, no, "cap_v" + i, v, { x, y: 3.8, w: 1.53, h: 0.4, fontSize: 20, bold: true, fontFace: "+mj-lt", color: i === 2 ? "FFFFFF" : C.text2, align: "center", valign: "middle" }, "fade", 2050 + i * 200, 400);
      T(s, no, "cap_l" + i, l, { x, y: 4.18, w: 1.53, h: 0.4, fontSize: 9, color: i === 2 ? "CADCFC" : C.accent3, align: "center", valign: "top" }, "fade", 2100 + i * 200, 400);
    });

    const ins = [
      ["TODAY'S PROFIT ENGINE", "Cigarettes ≈ 82.2% of total reported segment results.", C.accent1],
      ["THE GROWTH CANDIDATE", "FMCG–Others results +13.9% in FY2026 and the largest segment capex share (₹970 cr).", C.text2],
      ["THE INVESTMENT QUESTION", "Can newer consumer businesses turn growth and reinvestment into sustainably attractive incremental returns?", C.text2],
    ];
    ins.forEach(([l, t, col], i) => {
      const x = 0.6 + i * 4.11;
      R(s, no, "in_bg" + i, SH.roundRect, { x, y: 4.98, w: 3.91, h: 1.0, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "flyB", 2700 + i * 250, 550);
      T(s, no, "in_l" + i, l, { x: x + 0.18, y: 5.05, w: 3.55, h: 0.25, fontSize: 10.5, bold: true, color: col, charSpacing: 1 }, "fade", 2900 + i * 250, 400);
      T(s, no, "in_t" + i, t, { x: x + 0.18, y: 5.3, w: 3.55, h: 0.65, fontSize: 12, color: C.text1, valign: "top" }, "fade", 3000 + i * 250, 400);
    });
    takeaway(s, no, "ITC has diversified its business portfolio more than its operating-profit base. The question is whether non-cigarette businesses can add profit without compromising capital efficiency.", 6.08, 0.58, 3700);
    foot(s, no, "Source: ITC audited consolidated results FY2026 (segment revenue, results, assets, liabilities); ITC Report & Accounts 2026 (capex) — itcportal.com. Chart rounded to nearest ₹ crore; shares may sum to 100.1% due to rounding. Segment results are not PAT, free cash flow or EVA — not net profit or ROCE.", 6.72, 0.36, 4000);
    TRANS[no] = "doors";
  }

  // =====================================================================
  // 4 — INDUSTRY & COMPETITOR BENCHMARKING (pending research)
  // =====================================================================
  {
    const no = 5;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
    head(s, no, "04  ·  INDUSTRY & COMPETITOR BENCHMARKING", "Where does ITC possess a durable competitive advantage—and where is it vulnerable?");
    T(s, no, "pend", "PENDING INDUSTRY RESEARCH", { x: 10.4, y: 0.28, w: 2.33, h: 0.3, fontSize: 10, bold: true, color: C.accent1, align: "center", valign: "middle", line: { color: C.accent1, width: 1 }, shape: SH.roundRect, rectRadius: 0.15 }, "fade", 600, 400);
    const pan = [
      ["FaSmoking", "Cigarettes", "Taxation, regulation, pricing, demand and illicit-market risk"],
      ["FaShoppingBasket", "FMCG", "Branded packaged-goods growth, market share, advertising and competition"],
      ["FaBoxOpen", "Paper & Packaging", "Input costs, capacity utilisation, pricing and demand"],
      ["FaSeedling", "Agri Business", "Commodity volatility, sourcing and export demand"],
    ];
    const PW = 2.9, PG = 0.177;
    pan.forEach(([ik, t, d], i) => {
      const x = 0.6 + i * (PW + PG), y = 1.78;
      R(s, no, "pn" + i, SH.roundRect, { x, y, w: PW, h: 1.75, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "flyB", 600 + i * 220, 600);
      ICON(s, no, "pi" + i, ic[ik], x + 0.2, y + 0.18, 0.5, i === 0 ? C.accent1 : C.text2, "zoom", 800 + i * 220);
      T(s, no, "pt" + i, t, { x: x + 0.85, y: y + 0.18, w: PW - 1.0, h: 0.5, fontSize: 16, bold: true, color: C.text2, valign: "middle" }, "fade", 900 + i * 220, 400);
      T(s, no, "pd" + i, d, { x: x + 0.2, y: y + 0.85, w: PW - 0.4, h: 0.8, fontSize: 12.5, color: C.text1, valign: "top" }, "fade", 1000 + i * 220, 400);
    });
    panelLabel(s, no, "peer_lbl", "PEER COMPARISON  —  standardised reporting periods, margins and valuation dates", 0.6, 3.72, 12, 1800);
    const hd = (t, al) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy }, fontSize: 12, align: al || "left", valign: "middle" } });
    const cl = (t, o) => ({ text: t, options: { fontSize: 12, color: HEX.slate, valign: "middle", italic: !!(o && o.it), bold: !!(o && o.b), ...(o || {}) } });
    const rows = [
      [hd("Business"), hd("Candidate peers"), hd("Reporting period", "center"), hd("Margins", "center"), hd("Valuation (date)", "center")],
      [cl("Cigarettes", { b: true, color: HEX.navy }), cl("Godfrey Phillips India, VST Industries (starting points)"), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true })],
      [cl("FMCG", { b: true, color: HEX.navy }), cl("Selected branded FMCG companies"), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true })],
      [cl("Paper & Packaging", { b: true, color: HEX.navy }), cl("Selected paper & packaging manufacturers"), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true })],
      [cl("Agri Business", { b: true, color: HEX.navy }), cl("To be selected"), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true }), cl("Pending", { align: "center", it: true })],
    ];
    s.addTable(rows, { objectName: "peer_tbl", x: 0.6, y: 4.05, w: 12.13, colW: [2.2, 4.93, 1.8, 1.6, 1.6], rowH: 0.4, border: { type: "solid", color: "FFFFFF", pt: 1 }, fill: { color: HEX.tint }, margin: [0, 0.1, 0, 0.1] });
    reg(no, "peer_tbl", "wipeD", 2000, 1000);
    takeaway(s, no, "No unverified market shares or industry-size estimates will appear here — only sourced figures and like-for-like comparisons.", 6.3, 0.55, 3200);
    TRANS[no] = "wipe";
  }

  // =====================================================================
  // 5 — FINANCIAL PERFORMANCE & CAPITAL EFFICIENCY
  // =====================================================================
  {
    const no = 6;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
    head(s, no, "05  ·  FINANCIAL PERFORMANCE & CAPITAL EFFICIENCY", "Profit contribution, capital invested and incremental returns tell different stories");

    panelLabel(s, no, "l_lbl", "Net segment assets, FY2026 year-end  (₹ crore)", 0.6, 1.72, 6.3, 500);
    const nm = ["Cigarettes", "FMCG — Others", "Agri", "Paper & Pkg", "Others"];
    s.addChart(pres.charts.BAR, [{ name: "Net segment assets", labels: nm, values: [8246, 10270, 6008, 8626, 1766] }], {
      objectName: "chart_nsa", x: 0.6, y: 2.0, w: 6.3, h: 3.0, barDir: "col", chartColors: [HEX.red, HEX.navy, HEX.mute, HEX.mute, HEX.mute], barGapWidthPct: 40,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "#,##0", dataLabelFontSize: 11, dataLabelColor: HEX.ink, dataLabelFontBold: true,
      catAxisLabelFontSize: 11, catAxisLabelColor: HEX.ink, valAxisHidden: true, valAxisMaxVal: 12000, valAxisMinVal: 0,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false, ...chartFont,
    });
    reg(no, "chart_nsa", "wipeD", 800, 1100);

    panelLabel(s, no, "r_lbl", "Share of segment results vs share of net segment assets  (%)", 7.2, 1.72, 5.53, 1000);
    s.addChart(pres.charts.BAR, [
      { name: "Share of FY2026 segment results", labels: nm, values: [82.2, 6.7, 5.9, 2.8, 2.5] },
      { name: "Share of net segment assets", labels: nm, values: [23.6, 29.4, 17.2, 24.7, 5.1] },
    ], {
      objectName: "chart_share", x: 7.2, y: 2.0, w: 5.53, h: 3.0, barDir: "col", barGrouping: "clustered", chartColors: [HEX.navy, HEX.mute], barGapWidthPct: 50,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", dataLabelFontSize: 9, dataLabelColor: HEX.ink, dataLabelFontBold: true,
      catAxisLabelFontSize: 10, catAxisLabelColor: HEX.ink, valAxisHidden: true, valAxisMaxVal: 95, valAxisMinVal: 0,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: true, legendPos: "t", legendFontSize: 10, legendColor: HEX.ink, legendFontFace: "+mn-lt", ...chartFont,
    });
    reg(no, "chart_share", "wipeL", 1300, 1100);

    const ins = [
      ["FaChartLine", "Cigarettes is the dominant operating-profit contributor."],
      ["FaLayerGroup", "FMCG–Others has the largest net segment asset base and the largest segment capex allocation."],
      ["FaBoxOpen", "Paperboards, Paper & Packaging delivered lower segment results in FY2026 despite higher reported revenue."],
    ];
    ins.forEach(([ik, t], i) => {
      const x = 0.6 + i * 4.11;
      R(s, no, "in_bg" + i, SH.roundRect, { x, y: 5.12, w: 3.91, h: 0.9, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "flyB", 2400 + i * 250, 550);
      ICON(s, no, "in_i" + i, ic[ik], x + 0.15, 5.12 + 0.2, 0.5, i === 0 ? C.accent1 : C.text2, "zoom", 2550 + i * 250);
      T(s, no, "in_t" + i, t, { x: x + 0.8, y: 5.12, w: 3.0, h: 0.9, fontSize: 12, color: C.text1, valign: "middle" }, "fade", 2650 + i * 250, 400);
    });
    takeaway(s, no, "The best business to reinvest in is not necessarily the one that generates the most profit — the decisive test is the return earned on additional capital.", 6.12, 0.52, 3500);
    foot(s, no, "Source: ITC FY2026 consolidated segment reporting; net segment assets = segment assets − segment liabilities (our calculation). Shares in the right chart are derived from the figures shown. Net segment assets are not invested capital, and segment results ÷ net assets is not segment ROCE. Five-year trends, cash flow and working capital to follow from the historical model.", 6.7, 0.38, 3900);
    TRANS[no] = "glitter";
  }

  // =====================================================================
  // 6 — THESIS & CATALYSTS (pending)
  // =====================================================================
  pres.addSection({ title: "Valuation & Recommendation" });
  {
    const no = 7;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Valuation & Recommendation" });
    head(s, no, "06  ·  INVESTMENT THESIS & CATALYSTS", "What is the market missing about ITC?");
    T(s, no, "pend", "FINAL THESIS PENDING MODEL", { x: 10.2, y: 0.28, w: 2.53, h: 0.3, fontSize: 10, bold: true, color: C.accent1, align: "center", valign: "middle", line: { color: C.accent1, width: 1 }, shape: SH.roundRect, rectRadius: 0.15 }, "fade", 600, 400);

    R(s, no, "hyp_bg", SH.roundRect, { x: 0.6, y: 1.75, w: 12.13, h: 1.0, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.1 }, "wipeL", 500, 800);
    ICON(s, no, "hyp_i", ic.FaLightbulb, 0.85, 2.0, 0.5, C.accent1, "zoom", 1000);
    T(s, no, "hyp_t", [
      { text: "RESEARCH HYPOTHESIS — NOT YET OUR THESIS", options: { fontSize: 10.5, bold: true, color: "CADCFC", breakLine: true } },
      { text: "Can FMCG–Others progressively increase its contribution to operating profits while cigarettes remains the dominant profit engine?", options: { fontSize: 17, bold: true, color: "FFFFFF", fontFace: "+mj-lt" } },
    ], { x: 1.6, y: 1.75, w: 10.9, h: 1.0, valign: "middle", paraSpaceAfter: 3 }, "fade", 1100, 700);

    panelLabel(s, no, "ev_lbl", "EVIDENCE SO FAR  (FY2026, consolidated)", 0.6, 2.95, 6, 1400);
    [["6.7%", "FMCG–Others share of reported segment results"], ["+13.9%", "FMCG–Others segment results growth YoY"], ["₹970 cr", "FMCG–Others capex — largest of any segment"]].forEach(([v, l], i) => {
      const x = 0.6 + i * 4.11;
      R(s, no, "ev_bg" + i, SH.roundRect, { x, y: 3.28, w: 3.91, h: 1.05, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "zoom", 1600 + i * 250, 550);
      T(s, no, "ev_v" + i, v, { x: x + 0.2, y: 3.3, w: 1.75, h: 1.0, fontSize: 28, bold: true, color: C.text2, fontFace: "+mj-lt", valign: "middle" }, "fade", 1750 + i * 250, 450);
      T(s, no, "ev_l" + i, l, { x: x + 2.0, y: 3.3, w: 1.8, h: 1.0, fontSize: 11, color: C.accent3, valign: "middle" }, "fade", 1850 + i * 250, 450);
    });

    const blocks = [
      ["FaSearch", "Market misconception", "If supported by evidence"],
      ["FaChartLine", "What underpins our view", "Two or three financial / operational developments"],
      ["FaCalendarCheck", "Measurable catalysts", "With expected timing"],
      ["FaBan", "What would invalidate it", "The evidence that proves us wrong"],
    ];
    blocks.forEach(([ik, t, d], i) => {
      const x = 0.6 + i * (2.9 + 0.177), y = 4.55;
      R(s, no, "bl_bg" + i, SH.roundRect, { x, y, w: 2.9, h: 1.85, fill: { color: "FFFFFF" }, line: { color: HEX.mute, width: 1.25, dashType: "dash" }, rectRadius: 0.08 }, "flyB", 2600 + i * 220, 550);
      ICON(s, no, "bl_i" + i, ic[ik], x + 0.2, y + 0.18, 0.5, i === 3 ? C.accent1 : C.text2, "zoom", 2750 + i * 220);
      T(s, no, "bl_t" + i, t, { x: x + 0.85, y: y + 0.18, w: 1.9, h: 0.5, fontSize: 14, bold: true, color: C.text2, valign: "middle" }, "fade", 2850 + i * 220, 400);
      T(s, no, "bl_d" + i, [{ text: d, options: { breakLine: true, fontSize: 12, color: C.text1 } }, { text: "Pending forecasts and valuation", options: { fontSize: 11, italic: true, color: C.accent3 } }], { x: x + 0.2, y: y + 0.85, w: 2.5, h: 0.9, valign: "top", paraSpaceAfter: 4 }, "fade", 2950 + i * 220, 400);
    });
    foot(s, no, "Evidence so far: ITC audited consolidated segment results FY2026 and ITC Report & Accounts 2026 (see slide 3). The hypothesis is a research question, not a conclusion.", 6.55, 0.4, 3900);
    TRANS[no] = "split";
  }

  // =====================================================================
  // 7 — VALUATION (structure only, outputs pending)
  // =====================================================================
  {
    const no = 8;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Valuation & Recommendation" });
    head(s, no, "07  ·  VALUATION", "What is ITC Limited worth after accounting for its operating businesses and investments?");
    T(s, no, "pend", "OUTPUTS PENDING MODEL", { x: 10.4, y: 0.28, w: 2.33, h: 0.3, fontSize: 10, bold: true, color: C.accent1, align: "center", valign: "middle", line: { color: C.accent1, width: 1 }, shape: SH.roundRect, rectRadius: 0.15 }, "fade", 600, 400);

    const BW = 2.75, BG = 0.377;
    const lay = [
      ["LAYER 1", "Operating businesses", "Continuing businesses valued by DCF, relative valuation or another suitable method", "FaIndustry"],
      ["LAYER 2", "Separately valued investments", "ITC Hotels stake (~40%) and other material non-operating investments not already included", "FaHotel"],
      ["LAYER 3", "Equity-value reconciliation", "Less debt, corporate costs and other adjustments; ownership interests; no double-counting", "FaBalanceScale"],
      ["RESULT", "Equity value per share", "₹ —", "FaCoins"],
    ];
    lay.forEach(([lb, t, d, ik], i) => {
      const x = 0.6 + i * (BW + BG), y = 1.78, last = i === 3;
      R(s, no, "ly_bg" + i, SH.roundRect, { x, y, w: BW, h: 2.5, fill: { color: last ? C.text2 : C.background2 }, line: { type: "none" }, rectRadius: 0.1 }, "flyL", 500 + i * 450, 650);
      ICON(s, no, "ly_i" + i, ic[ik], x + 0.2, y + 0.2, 0.5, last ? C.accent1 : C.text2, "zoom", 800 + i * 450);
      T(s, no, "ly_l" + i, lb, { x: x + 0.85, y: y + 0.22, w: 1.8, h: 0.46, fontSize: 11, bold: true, color: last ? "CADCFC" : C.accent1, valign: "middle", charSpacing: 2 }, "fade", 900 + i * 450, 400);
      T(s, no, "ly_t" + i, t, { x: x + 0.2, y: y + 0.85, w: BW - 0.4, h: 0.6, fontSize: 15, bold: true, color: last ? "FFFFFF" : C.text2, fontFace: "+mj-lt", valign: "top" }, "fade", 1000 + i * 450, 400);
      if (last) T(s, no, "ly_d" + i, "₹ ——", { x: x + 0.2, y: y + 1.35, w: BW - 0.4, h: 0.9, fontSize: 48, bold: true, color: "FFFFFF", fontFace: "+mj-lt", valign: "middle" }, "zoom", 2500, 700);
      else T(s, no, "ly_d" + i, d, { x: x + 0.2, y: y + 1.4, w: BW - 0.4, h: 1.0, fontSize: 12, color: C.text1, valign: "top" }, "fade", 1100 + i * 450, 400);
      if (i < 3) T(s, no, "ar" + i, i === 1 ? "→" : (i === 0 ? "+" : "→"), { x: x + BW, y: y + 0.95, w: BG, h: 0.5, fontSize: 24, bold: true, color: C.accent1, align: "center", valign: "middle" }, "zoom", 1300 + i * 450, 400);
    });

    panelLabel(s, no, "out_lbl", "FINAL VALUATION OUTPUTS", 0.6, 4.45, 6, 2800);
    const outs = ["DCF fair value / share", "Relative-valuation cross-check", "SOTP valuation", "Market price on valuation date", "Base-case upside / downside", "Bull / Base / Bear fair values"];
    const OW = 1.9, OG = (12.13 - 6 * OW) / 5;
    outs.forEach((o, i) => {
      const x = 0.6 + i * (OW + OG);
      R(s, no, "ou_bg" + i, SH.roundRect, { x, y: 4.8, w: OW, h: 1.1, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "flyB", 3000 + i * 180, 500);
      T(s, no, "ou_v" + i, "—", { x, y: 4.85, w: OW, h: 0.5, fontSize: 26, bold: true, color: C.text2, fontFace: "+mj-lt", align: "center", valign: "middle" }, "zoom", 3150 + i * 180, 400);
      T(s, no, "ou_l" + i, o, { x: x + 0.1, y: 5.35, w: OW - 0.2, h: 0.5, fontSize: 10.5, color: C.accent3, align: "center", valign: "top" }, "fade", 3250 + i * 180, 400);
    });
    R(s, no, "hn_bg", SH.roundRect, { x: 0.6, y: 6.05, w: 12.13, h: 0.55, fill: { color: "FFFFFF" }, line: { color: C.accent1, width: 1.25 }, rectRadius: 0.08 }, "wipeL", 4200, 600);
    T(s, no, "hn_t", [
      { text: "ITC Hotels is valued as a separate listed associate:  ", options: { bold: true, color: C.accent1 } },
      { text: "verified shareholding × market capitalisation on the valuation date, with ownership and transaction adjustments — not accounting carrying value, and not its full hotel revenue or profit.", options: { color: C.text1 } },
    ], { x: 0.8, y: 6.05, w: 11.8, h: 0.55, fontSize: 11.5, valign: "middle" }, "fade", 4500, 500);
    foot(s, no, "All financial assumptions, WACC inputs, terminal-value assumptions, multiples, ownership percentages and adjustments will be documented in the Excel model.", 6.72, 0.3, 4800);
    TRANS[no] = "prism";
  }

  // =====================================================================
  // 8 — RISK, SCENARIOS & RECOMMENDATION (pending)
  // =====================================================================
  {
    const no = 9;
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Valuation & Recommendation" });
    head(s, no, "08  ·  RISK, SCENARIOS & FINAL RECOMMENDATION", "What could make our thesis right—or wrong?");
    T(s, no, "pend", "OUTPUTS PENDING MODEL", { x: 10.4, y: 0.28, w: 2.33, h: 0.3, fontSize: 10, bold: true, color: C.accent1, align: "center", valign: "middle", line: { color: C.accent1, width: 1 }, shape: SH.roundRect, rectRadius: 0.15 }, "fade", 600, 400);

    const mh = (t, sub, fill) => ({ text: [{ text: t, options: { bold: true, fontSize: 16, breakLine: true } }, { text: sub, options: { fontSize: 10.5 } }], options: { color: "FFFFFF", fill: { color: fill }, align: "center", valign: "middle" } });
    const lab = (t) => ({ text: t, options: { bold: true, color: HEX.navy, fontSize: 13, valign: "middle" } });
    const pc = (t) => ({ text: t, options: { italic: true, color: HEX.slate, fontSize: 12.5, align: "center", valign: "middle" } });
    const rows = [
      [{ text: "Metric", options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy }, fontSize: 13, valign: "middle" } },
        mh("BULL", "Stronger growth, margin improvement or favourable valuation assumptions", "2F5D9B"),
        mh("BASE", "Most defensible assumptions supported by history and evidence", HEX.navy),
        mh("BEAR", "Lower growth, margin compression, adverse regulation, weak execution or multiple contraction", HEX.red)],
      [lab("Fair value per share"), pc("Model output"), pc("Model output"), pc("Model output")],
      [lab("Return from market price"), pc("Model output"), pc("Model output"), pc("Model output")],
      [lab("Key assumptions"), pc("To be stated explicitly"), pc("To be stated explicitly"), pc("To be stated explicitly")],
      [lab("Primary risks"), pc("To be stated explicitly"), pc("To be stated explicitly"), pc("To be stated explicitly")],
    ];
    s.addTable(rows, { objectName: "scn_tbl", x: 0.6, y: 1.75, w: 12.13, colW: [2.5, 3.21, 3.21, 3.21], rowH: [1.0, 0.48, 0.48, 0.48, 0.48], border: { type: "solid", color: "FFFFFF", pt: 2 }, fill: { color: HEX.tint }, margin: [0, 0.1, 0, 0.1] });
    reg(no, "scn_tbl", "wipeD", 700, 1200);

    panelLabel(s, no, "con_lbl", "RECOMMENDATION — DERIVED FROM THE MODEL, NOT FITTED TO A STORY", 0.6, 4.85, 9, 2200);
    [["FaFlag", "Recommendation"], ["FaCoins", "Margin of safety"], ["FaCalendarCheck", "Investment horizon"], ["FaExclamationTriangle", "Thesis-invalidation trigger"]].forEach(([ik, t], i) => {
      const x = 0.6 + i * (2.9 + 0.177);
      R(s, no, "cn_bg" + i, SH.roundRect, { x, y: 5.2, w: 2.9, h: 1.1, fill: { color: i === 0 ? C.text2 : C.background2 }, line: { type: "none" }, rectRadius: 0.08 }, "zoom", 2500 + i * 250, 550);
      ICON(s, no, "cn_i" + i, ic[ik], x + 0.18, 5.2 + 0.28, 0.5, i === 0 ? C.accent1 : C.text2, "zoom", 2650 + i * 250);
      T(s, no, "cn_t" + i, [{ text: t, options: { fontSize: 13, bold: true, color: i === 0 ? "FFFFFF" : C.text2, breakLine: true } }, { text: "Pending model", options: { fontSize: 12, italic: true, color: i === 0 ? "B8C0CC" : C.accent3 } }], { x: x + 0.8, y: 5.2, w: 2.0, h: 1.1, valign: "middle", paraSpaceAfter: 2 }, "fade", 2750 + i * 250, 450);
    });
    foot(s, no, "Scenario probabilities and the final recommendation will be derived from our valuation, margin of safety, investment horizon and primary thesis-invalidation trigger — never manufactured to fit a predetermined story.", 6.5, 0.4, 3800);
    TRANS[no] = "push";
  }

  // =====================================================================
  // THANK YOU
  // =====================================================================
  pres.addSection({ title: "Close" });
  {
    const no = 10;
    const s = pres.addSlide({ masterName: "CLOSE", sectionTitle: "Close" });
    [[7.0, 0.14], [5.0, 0.10]].forEach(([d, tr], i) => {
      R(s, no, "ring" + i, SH.ellipse, { x: 6.67 - d / 2, y: 3.75 - d / 2, w: d, h: d, fill: { color: "FFFFFF", transparency: 100 - tr * 100 }, line: { color: "FFFFFF", width: 1, transparency: 75 } }, "zoom", 200 + i * 300, 1000);
    });
    T(s, no, "ty", "Thank You", { x: 1.67, y: 2.55, w: 10, h: 1.4, fontSize: 80, bold: true, color: "FFFFFF", fontFace: "+mj-lt", align: "center", valign: "middle" }, "zoom", 700, 900);
    T(s, no, "ty_itc", "ITC Limited  ·  Equity Research", { x: 1.67, y: 4.0, w: 10, h: 0.5, fontSize: 24, color: "CADCFC", align: "center", valign: "middle" }, "fade", 1500, 700);
    T(s, no, "ty_team", "[Team name]  ·  Moolyankan 2026  ·  Round 2", { x: 3.67, y: 4.8, w: 6, h: 0.42, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", shape: SH.roundRect, rectRadius: 0.21, fill: { color: C.accent1 } }, "flyB", 1900, 600);
    TRANS[no] = "vortex";
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  fs.writeFileSync(OUT.replace(/\.pptx$/, "") + ".anim.json", JSON.stringify({ ANIMS, TRANS }, null, 1));
  console.log("built", OUT);
})();

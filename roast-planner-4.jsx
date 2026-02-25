import { useState, useMemo, useRef, useEffect } from "react";

const BATCH_TYPES = [
  { id: "standard", label: "Large (20.2 lb)",  weight: 20.2 },
  { id: "dark",     label: "Medium (19.8 lb)", weight: 19.8 },
  { id: "decaf",    label: "Small (10.73 lb)", weight: 10.73 },
];
const BATCH_MAP = Object.fromEntries(BATCH_TYPES.map(b => [b.id, b]));
const trunc4 = n => Math.trunc(n * 10000) / 10000;
const LB_TO_KG = 0.453592;
const formatWt = (lbs, units, decimals = 2) =>
  units === "kg"
    ? `${(lbs * LB_TO_KG).toFixed(decimals)} kg`
    : `${lbs.toFixed(decimals)} lb`;

const DEFAULT_GROUPS = [
  { id:"french",    label:"French Roast",                  tag:"FR",  batch:"standard", active:true, roastLoss:0, type:"blend",         components:[] },
  { id:"sure",      label:"Sure Thing",                    tag:"ST",  batch:"standard", active:true, roastLoss:0, type:"blend",         components:[] },
  { id:"dark",      label:"Dark Roast",                    tag:"DR",  batch:"dark",     active:true, roastLoss:0, type:"blend",         components:[] },
  { id:"430",       label:"4:30 a.m.",                     tag:"430", batch:"standard", active:true, roastLoss:0, type:"blend",         components:[] },
  { id:"decafDark", label:"Decaf Dark Roast",              tag:"DDR", batch:"decaf",    active:true, roastLoss:0, type:"blend",         components:[] },
  { id:"danche",    label:"Single Origin Medium — Danche", tag:"SOM", batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"decaf",     label:"Decaf",                         tag:"DC",  batch:"decaf",    active:true, roastLoss:0, type:"blend",         components:[] },
  { id:"nano",      label:"Nano Genji Ethiopia",           tag:"NG",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"cesar",     label:"César Marin Peru",              tag:"CM",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"ayla",      label:"Ayla Ethiopia",                 tag:"AE",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"jhoan",     label:"Jhoan Vergara Colombia",        tag:"JV",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"victor",    label:"Victor Bermudez Gesha",         tag:"VB",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"fidencio",  label:"Fidencio Adarme Colombia",      tag:"FA",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"jose",      label:"Jose Uribe Lasso Colombia",     tag:"JUL", batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
  { id:"illimani",  label:"Illimani Bolivia",              tag:"IB",  batch:"standard", active:true, roastLoss:0, type:"single_origin", components:[] },
];

const DEFAULT_PRODUCTS = [
  { id:"p001", name:"Dragonfly French Roast - 12oz", lbs:0.75, group:"french", active:true },
  { id:"p002", name:"Dragonfly French Roast - 5lb",  lbs:5,    group:"french", active:true },
  { id:"p003", name:"Thatcher's Blend - 8oz",        lbs:0.5,   group:"sure", active:true },
  { id:"p004", name:"Thatcher's Blend - 10oz",       lbs:0.625, group:"sure", active:true },
  { id:"p005", name:"Thatcher's Blend - 2lb",        lbs:2,     group:"sure", active:true },
  { id:"p006", name:"Thatcher's Blend - 5lb",        lbs:5,     group:"sure", active:true },
  { id:"p007", name:"Thatcher's Blend - Bulk (Per lb.)", lbs:1, group:"sure", active:true },
  { id:"p008", name:"Woodlawn Blend - 10oz",         lbs:0.625, group:"sure", active:true },
  { id:"p009", name:"Woodlawn Blend - 2lb",          lbs:2,     group:"sure", active:true },
  { id:"p010", name:"Woodlawn Blend - 5lb",          lbs:5,     group:"sure", active:true },
  { id:"p011", name:"Woodlawn Blend - 10lb Bucket",  lbs:10,    group:"sure", active:true },
  { id:"p012", name:"Woodlawn Blend - 15lb Bucket",  lbs:15,    group:"sure", active:true },
  { id:"p013", name:"Lionheart Blend - 10oz",        lbs:0.625, group:"sure", active:true },
  { id:"p014", name:"Lionheart Blend - 2lb",         lbs:2,     group:"sure", active:true },
  { id:"p015", name:"Lionheart Blend - 5lb",         lbs:5,     group:"sure", active:true },
  { id:"p016", name:"Bialy Bird - 10oz",             lbs:0.625, group:"sure", active:true },
  { id:"p017", name:"Bialy Bird - 2lb",              lbs:2,     group:"sure", active:true },
  { id:"p018", name:"Bialy Bird - 5lb",              lbs:5,     group:"sure", active:true },
  { id:"p019", name:"Sure Thing - 8oz",              lbs:0.5,   group:"sure", active:true },
  { id:"p020", name:"Sure Thing - 10oz",             lbs:0.625, group:"sure", active:true },
  { id:"p021", name:"Sure Thing - 2lb",              lbs:2,     group:"sure", active:true },
  { id:"p022", name:"Sure Thing - 5lb",              lbs:5,     group:"sure", active:true },
  { id:"p023", name:"Sure Thing Wholesale - 10oz",   lbs:0.625, group:"sure", active:true },
  { id:"p024", name:"Sure Thing Wholesale - 2lb",    lbs:2,     group:"sure", active:true },
  { id:"p025", name:"Sure Thing Wholesale - 5lb",    lbs:5,     group:"sure", active:true },
  { id:"p026", name:"Sure Thing Wholesale - 10lb Bucket", lbs:10, group:"sure", active:true },
  { id:"p027", name:"Sure Thing Wholesale - 15lb Bucket", lbs:15, group:"sure", active:true },
  { id:"p028", name:"Sure Thing Subscription - 10oz", lbs:0.625, group:"sure", active:true },
  { id:"p029", name:"Sure Thing Subscription - 2lb", lbs:2,     group:"sure", active:true },
  { id:"p030", name:"Sure Thing Subscription - 5lb", lbs:5,     group:"sure", active:true },
  { id:"p031", name:"TRADE Sure Thing - 10.9oz",     lbs:0.68,  group:"sure", active:true },
  { id:"p032", name:"TRADE Sure Thing - 2lb",        lbs:2,     group:"sure", active:true },
  { id:"p033", name:"Realm Sure Thing - 5lb",        lbs:5,     group:"sure", active:true },
  { id:"p034", name:"Realm Sure Thing - 10lb Bucket", lbs:10,   group:"sure", active:true },
  { id:"p035", name:"Realm Sure Thing - 15lb Bucket", lbs:15,   group:"sure", active:true },
  { id:"p036", name:"Grocery Retail - Sure Thing",   lbs:0.625, group:"sure", active:true },
  { id:"p037", name:"Kleiner Bear Espresso Roast - 12oz", lbs:0.75, group:"dark", active:true },
  { id:"p038", name:"Kleiner Bear Espresso Roast - 5lb",  lbs:5,    group:"dark", active:true },
  { id:"p039", name:"Benaiah Brew - 10oz",           lbs:0.625, group:"dark", active:true },
  { id:"p040", name:"Benaiah Brew - 5lb",            lbs:5,     group:"dark", active:true },
  { id:"p041", name:"RB Mean Street - 12oz",         lbs:0.75,  group:"dark", active:true },
  { id:"p042", name:"RB Mean Street - 2lb",          lbs:2,     group:"dark", active:true },
  { id:"p043", name:"RB Mean Street - 5lb",          lbs:5,     group:"dark", active:true },
  { id:"p044", name:"RB Mean Street - 10lb Bucket",  lbs:10,    group:"dark", active:true },
  { id:"p045", name:"RB Mean Street - 15lb Bucket",  lbs:15,    group:"dark", active:true },
  { id:"p046", name:"Shudder - 10oz",                lbs:0.625, group:"dark", active:true },
  { id:"p047", name:"Shudder - 5lb",                 lbs:5,     group:"dark", active:true },
  { id:"p048", name:"TRADE The Void - 10.9oz",       lbs:0.68,  group:"dark", active:true },
  { id:"p049", name:"TRADE The Void - 2lb",          lbs:2,     group:"dark", active:true },
  { id:"p050", name:"SNEAKERWAVE - 10oz",            lbs:0.625, group:"430", active:true },
  { id:"p051", name:"SNEAKERWAVE - 5lb",             lbs:5,     group:"430", active:true },
  { id:"p052", name:"Stacks Blend - 8oz",            lbs:0.5,   group:"430", active:true },
  { id:"p053", name:"Stacks Blend - 10oz",           lbs:0.625, group:"430", active:true },
  { id:"p054", name:"Stacks Blend - 2lb",            lbs:2,     group:"430", active:true },
  { id:"p055", name:"Stacks Blend - 5lb",            lbs:5,     group:"430", active:true },
  { id:"p056", name:"RB Boulder Blend - 12oz",       lbs:0.75,  group:"430", active:true },
  { id:"p057", name:"RB Boulder Blend - 2lb",        lbs:2,     group:"430", active:true },
  { id:"p058", name:"RB Boulder Blend - 5lb",        lbs:5,     group:"430", active:true },
  { id:"p059", name:"4:30 a.m. - 8oz",              lbs:0.5,   group:"430", active:true },
  { id:"p060", name:"4:30 a.m. - 10oz",             lbs:0.625, group:"430", active:true },
  { id:"p061", name:"4:30 a.m. - 2lb",              lbs:2,     group:"430", active:true },
  { id:"p062", name:"4:30 a.m. - 5lb",              lbs:5,     group:"430", active:true },
  { id:"p063", name:"4:30 a.m. Wholesale - 10oz",   lbs:0.625, group:"430", active:true },
  { id:"p064", name:"4:30 a.m. Wholesale - 2lb",    lbs:2,     group:"430", active:true },
  { id:"p065", name:"4:30 a.m. Wholesale - 5lb",    lbs:5,     group:"430", active:true },
  { id:"p066", name:"4:30 a.m. Wholesale - 10lb Bucket", lbs:10, group:"430", active:true },
  { id:"p067", name:"4:30 a.m. Wholesale - 15lb Bucket", lbs:15, group:"430", active:true },
  { id:"p068", name:"4:30 a.m. Subscription - 10oz", lbs:0.625, group:"430", active:true },
  { id:"p069", name:"4:30 a.m. Subscription - 2lb", lbs:2,     group:"430", active:true },
  { id:"p070", name:"4:30 a.m. Subscription - 5lb", lbs:5,     group:"430", active:true },
  { id:"p071", name:"TRADE 4:30 a.m. - 10.9oz",    lbs:0.68,  group:"430", active:true },
  { id:"p072", name:"TRADE 4:30 a.m. - 2lb",       lbs:2,     group:"430", active:true },
  { id:"p073", name:"Realm 4:30 a.m. - 5lb",       lbs:5,     group:"430", active:true },
  { id:"p074", name:"Realm 4:30 a.m. - 10lb Bucket", lbs:10,  group:"430", active:true },
  { id:"p075", name:"Realm 4:30 a.m. - 15lb Bucket", lbs:15,  group:"430", active:true },
  { id:"p076", name:"Grocery Retail - 4:30 a.m.",  lbs:0.625, group:"430", active:true },
  { id:"p077", name:"RB Shine Bright - 12oz",       lbs:0.75,  group:"430", active:true },
  { id:"p078", name:"RB Shine Bright - 2lb",        lbs:2,     group:"430", active:true },
  { id:"p079", name:"RB Shine Bright - 5lb",        lbs:5,     group:"430", active:true },
  { id:"p080", name:"Walk-up Window Decaf - 12oz",  lbs:0.75,  group:"decafDark", active:true },
  { id:"p081", name:"Walk-up Window Decaf - 5lb",   lbs:5,     group:"decafDark", active:true },
  { id:"p082", name:"Dragonfly Single Origin - 12oz", lbs:0.75, group:"danche", active:true },
  { id:"p083", name:"Dragonfly Single Origin - 5lb",  lbs:5,   group:"danche", active:true },
  { id:"p084", name:"Single Origin Subscription - 10oz", lbs:0.625, group:"danche", active:true },
  { id:"p085", name:"Single Origin Subscription - 2lb",  lbs:2,    group:"danche", active:true },
  { id:"p086", name:"Single Origin Subscription - 5lb",  lbs:5,    group:"danche", active:true },
  { id:"p087", name:"Decaf Huila - 8oz",             lbs:0.5,   group:"decaf", active:true },
  { id:"p088", name:"Decaf Huila - 10oz",            lbs:0.625, group:"decaf", active:true },
  { id:"p089", name:"Decaf Huila - 2lb",             lbs:2,     group:"decaf", active:true },
  { id:"p091", name:"Desert Decaf - 10oz",           lbs:0.625, group:"decaf", active:true },
  { id:"p092", name:"Desert Decaf - 5lb",            lbs:5,     group:"decaf", active:true },
  { id:"p093", name:"RB Lanterns Out - 12oz",        lbs:0.75,  group:"decaf", active:true },
  { id:"p094", name:"RB Lanterns Out - 5lb",         lbs:5,     group:"decaf", active:true },
  { id:"p095", name:"Realm Decaf - 5lb",             lbs:5,     group:"decaf", active:true },
  { id:"p096", name:"TRADE Colombia Huila Decaf - 10.9oz", lbs:0.68, group:"decaf", active:true },
  { id:"p097", name:"TRADE Colombia Huila Decaf - 2lb",    lbs:2,    group:"decaf", active:true },
  { id:"p098", name:"Nano Genji Ethiopia - 8oz",     lbs:0.5,   group:"nano", active:true },
  { id:"p099", name:"Nano Genji Ethiopia - 10oz",    lbs:0.625, group:"nano", active:true },
  { id:"p100", name:"Nano Genji Ethiopia - 2lb",     lbs:2,     group:"nano", active:true },
  { id:"p101", name:"Nano Genji Ethiopia - 5lb",     lbs:5,     group:"nano", active:true },
  { id:"p102", name:"Realm SO 1 - Africa - 5lb",     lbs:5,     group:"nano", active:true },
  { id:"p103", name:"Grocery Retail - S.O. 1 - Africa", lbs:0.625, group:"nano", active:true },
  { id:"p104", name:"César Marin Peru - 6oz",        lbs:0.375, group:"cesar", active:true },
  { id:"p105", name:"César Marin Peru - 10oz",       lbs:0.625, group:"cesar", active:true },
  { id:"p106", name:"César Marin Peru - 2lb",        lbs:2,     group:"cesar", active:true },
  { id:"p107", name:"César Marin Peru - 5lb",        lbs:5,     group:"cesar", active:true },
  { id:"p108", name:"TRADE César Marin Peru - 10.9oz", lbs:0.68, group:"cesar", active:true },
  { id:"p109", name:"TRADE César Marin Peru - 2lb",  lbs:2,     group:"cesar", active:true },
  { id:"p110", name:"Realm SO 2 - Americas - 5lb",   lbs:5,     group:"cesar", active:true },
  { id:"p111", name:"Grocery Retail - S.O. 2 - Americas", lbs:0.625, group:"cesar", active:true },
  { id:"p112", name:"Ayla Ethiopia - 8oz",           lbs:0.5,   group:"ayla", active:true },
  { id:"p114", name:"Ayla Ethiopia - 2lb",           lbs:2,     group:"ayla", active:true },
  { id:"p115", name:"Ayla Ethiopia - 5lb",           lbs:5,     group:"ayla", active:true },
  { id:"p116", name:"TRADE Ayla Ethiopia - 10.9oz",  lbs:0.68,  group:"ayla", active:true },
  { id:"p117", name:"TRADE Ayla Ethiopia - 2lb",     lbs:2,     group:"ayla", active:true },
  { id:"p118", name:"Jhoan Vergara Colombia - 6oz",  lbs:0.375, group:"jhoan", active:true },
  { id:"p119", name:"Jhoan Vergara Colombia - 10oz", lbs:0.625, group:"jhoan", active:true },
  { id:"p120", name:"Jhoan Vergara Colombia - 2lb",  lbs:2,     group:"jhoan", active:true },
  { id:"p121", name:"Jhoan Vergara Colombia - 5lb",  lbs:5,     group:"jhoan", active:true },
  { id:"p122", name:"Victor Bermudez Gesha Colombia - 6oz",  lbs:0.375, group:"victor", active:true },
  { id:"p123", name:"Victor Bermudez Gesha Colombia - 10oz", lbs:0.625, group:"victor", active:true },
  { id:"p124", name:"Victor Bermudez Gesha Colombia - 2lb",  lbs:2,     group:"victor", active:true },
  { id:"p125", name:"Victor Bermudez Gesha Colombia - 5lb",  lbs:5,     group:"victor", active:true },
  { id:"p126", name:"Fidencio Adarme Colombia - 8oz",  lbs:0.5,   group:"fidencio", active:true },
  { id:"p127", name:"Fidencio Adarme Colombia - 10oz", lbs:0.625, group:"fidencio", active:true },
  { id:"p128", name:"Fidencio Adarme Colombia - 2lb",  lbs:2,     group:"fidencio", active:true },
  { id:"p129", name:"Fidencio Adarme Colombia - 5lb",  lbs:5,     group:"fidencio", active:true },
  { id:"p130", name:"TRADE Fidencio Adarme Colombia - 10.9oz", lbs:0.68, group:"fidencio", active:true },
  { id:"p131", name:"TRADE Fidencio Adarme Colombia - 2lb",    lbs:2,    group:"fidencio", active:true },
  { id:"p132", name:"Jose Uribe Lasso Colombia - 6oz",  lbs:0.375, group:"jose", active:true },
  { id:"p133", name:"Jose Uribe Lasso Colombia - 10oz", lbs:0.625, group:"jose", active:true },
  { id:"p134", name:"Jose Uribe Lasso Colombia - 2lb",  lbs:2,     group:"jose", active:true },
  { id:"p135", name:"Jose Uribe Lasso Colombia - 5lb",  lbs:5,     group:"jose", active:true },
  { id:"p136", name:"TRADE Illimani Bolivia - 10.9oz",  lbs:0.68,  group:"illimani", active:true },
  { id:"p137", name:"TRADE Illimani Bolivia - 2lb",     lbs:2,     group:"illimani", active:true },
];

// ── Colors & style atoms ──────────────────────────────────────
const C = {
  bg:"#F6F4EB",        // white
  surface:"#EAE8D8",   // slightly off-white for panels
  surfaceHi:"#DDD9C4", // deeper for highlights
  border:"#C8C4A8",    // warm border
  borderSub:"#D8D4BC",
  amber:"#B29244",     // yellow
  terra:"#B75742",     // terracotta
  cream:"#231F20",     // black (text)
  muted:"#6B7360",     // green (muted text)
  dim:"#B0AC98",       // light dim text
  green:"#6B7360",     // green
  greenDim:"#DDE4D8",  // light green tint
  sage:"#596E6E",      // blue
  black:"#231F20",     // primary button black
};
const mono  = { fontFamily:"'Roboto Mono', monospace", fontWeight:400 };
const serif = { fontFamily:"'Roboto Mono', monospace", fontWeight:700 };
const inputBase = {
  background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4,
  color:C.cream, fontFamily:"'Roboto Mono', monospace", fontSize:12,
  outline:"none", padding:"6px 10px", width:"100%",
};

// ── Calc ──────────────────────────────────────────────────────
function calcGroup(group, orders, products, leftover, batchOverrides = {}) {
  const baseWeight = BATCH_MAP[group.batch]?.weight ?? 20.2;
  const batchWeight = batchOverrides[group.batch] ?? baseWeight;
  const roastLossPct = group.roastLoss ?? 0;
  const roastFactor = Math.max(0.001, 1 - roastLossPct / 100);
  const items = products
    .filter(p => p.group === group.id)
    .map(p => {
      const totalQty = orders.filter(o => o.productId === p.id).reduce((s, o) => s + o.qty, 0);
      return { ...p, totalQty, totalLbs: totalQty * p.lbs };
    })
    .filter(p => p.totalQty > 0);
  const totalLbs = items.reduce((s, i) => s + i.totalLbs, 0);
  const neededRoasted = Math.max(0, totalLbs - leftover);
  const neededGreen = roastLossPct > 0 ? neededRoasted / roastFactor : neededRoasted;
  const batches = trunc4(neededGreen / batchWeight);
  return { totalLbs, needed: neededGreen, neededRoasted, batches, batchesUp: Math.ceil(batches), batchWeight, roastFactor, roastLossPct, items };
}

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ value, onChange, size = "md" }) {
  const w = size === "sm" ? 28 : 34;
  const h = size === "sm" ? 15 : 18;
  const d = size === "sm" ? 9  : 12;
  return (
    <div onClick={() => onChange(!value)} style={{
      width:w, height:h, borderRadius:h, cursor:"pointer",
      background: value ? C.terra : C.dim, position:"relative",
      transition:"background 0.18s", flexShrink:0,
      border:`1px solid ${value ? C.terra : C.borderSub}`,
    }}>
      <div style={{
        width:d, height:d, borderRadius:"50%",
        background: value ? C.amber : C.muted,
        position:"absolute", top:(h-d)/2,
        left: value ? w - d - (h-d)/2 : (h-d)/2,
        transition:"left 0.18s",
      }} />
    </div>
  );
}

// ── ReportsModal ───────────────────────────────────────────────
function ReportsModal({ savedSummaries, units, onClose }) {
  const [reportTab, setReportTab] = useState("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const filtered = savedSummaries.filter(s => {
    const d = s.productionDate || s.savedAt?.slice(0,10) || "";
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  }).slice().sort((a, b) => {
    const da = a.productionDate || a.savedAt?.slice(0,10) || "";
    const db = b.productionDate || b.savedAt?.slice(0,10) || "";
    return da.localeCompare(db);
  });

  const totalDays      = filtered.length;
  const totalBatches   = filtered.reduce((s, d) => s + d.totalBatches, 0);
  const totalGreenLbs  = filtered.reduce((s, d) => s + parseFloat(d.totalGreen), 0);
  const totalOrderedLbs = filtered.reduce((s, d) => s + parseFloat(d.totalOrdered), 0);

  const groupMap = {};
  filtered.forEach(day => {
    (day.groups || []).forEach(g => {
      if (!groupMap[g.label]) groupMap[g.label] = { label:g.label, tag:g.tag, batches:0, greenLbs:0, days:0 };
      groupMap[g.label].batches  += g.batches;
      groupMap[g.label].greenLbs += parseFloat(g.needed);
      groupMap[g.label].days     += 1;
    });
  });
  const groupStats = Object.values(groupMap).sort((a,b) => b.batches - a.batches);
  const maxBatches = groupStats[0]?.batches || 1;

  // Package size aggregation
  const sizeMap = {};
  const skuMap  = {};
  filtered.forEach(day => {
    (day.packageSizes || []).forEach(s => {
      if (!sizeMap[s.size]) sizeMap[s.size] = { size: s.size, qty: 0, totalLbs: 0 };
      sizeMap[s.size].qty      += s.qty;
      sizeMap[s.size].totalLbs += s.totalLbs;
    });
    (day.skus || []).forEach(s => {
      if (!skuMap[s.name]) skuMap[s.name] = { name: s.name, qty: 0, totalLbs: 0 };
      skuMap[s.name].qty      += s.qty;
      skuMap[s.name].totalLbs += s.totalLbs;
    });
  });
  const sizeOrder = s => {
    const m = s.match(/^(\d+\.?\d*)(oz|lb|lb Bucket)/i);
    if (!m) return 999;
    const n = parseFloat(m[1]), u = m[2].toLowerCase();
    if (u === "oz") return n / 16;
    if (u === "lb") return n;
    if (u === "lb bucket") return n + 100;
    return 999;
  };
  const packageSizeStats = Object.values(sizeMap).sort((a,b) => sizeOrder(a.size) - sizeOrder(b.size));
  const skuStats         = Object.values(skuMap).sort((a,b) => b.qty - a.qty);
  const maxSizeQty = packageSizeStats[0]?.qty || 1;

  const statBox = (label, value, sub) => (
    <div style={{ flex:1, minWidth:120, padding:"14px 18px", background:C.surfaceHi, border:`1px solid ${C.borderSub}`, borderRadius:6 }}>
      <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{label}</div>
      <div style={{ ...mono, fontSize:22, color:C.amber, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:C.dim, marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:780, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ ...serif, fontSize:16, color:C.amber }}>Production Reports</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{savedSummaries.length} archived day{savedSummaries.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"10px 20px", borderBottom:`1px solid ${C.borderSub}`, background:C.surfaceHi, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Date Range</span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...mono, fontSize:11, padding:"4px 8px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, color:C.cream, outline:"none", colorScheme:"light" }} />
            <span style={{ color:C.dim, fontSize:11 }}>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...mono, fontSize:11, padding:"4px 8px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, color:C.cream, outline:"none", colorScheme:"light" }} />
          </div>
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ fontSize:10, color:C.dim, background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, padding:"3px 8px", cursor:"pointer" }}>Clear</button>}
          <span style={{ ...mono, fontSize:10, color:C.muted, marginLeft:"auto" }}>{totalDays} day{totalDays !== 1 ? "s" : ""} in range</span>
        </div>
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
          {[["overview","Overview"],["byGroup","By Group"],["packageSizes","Package Sizes"],["timeline","Timeline"]].map(([t,lbl]) => (
            <button key={t} onClick={() => setReportTab(t)} style={{
              padding:"9px 20px", fontSize:11, border:"none", borderBottom: reportTab===t ? `2px solid ${C.terra}` : "2px solid transparent",
              background:"none", color: reportTab===t ? C.amber : C.dim, cursor:"pointer",
              fontFamily:"'Roboto Mono', monospace", fontWeight: reportTab===t ? 600 : 400,
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          {totalDays === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:C.dim, fontSize:12, fontStyle:"italic" }}>No data in selected range.</div>}
          {totalDays > 0 && reportTab === "overview" && (
            <div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:20 }}>
                {statBox("Production Days", totalDays)}
                {statBox("Total Batches", totalBatches, `${(totalBatches/totalDays).toFixed(1)} avg / day`)}
                {statBox("Total Green Used", formatWt(totalGreenLbs, units), `${formatWt(totalGreenLbs/totalDays, units)} avg / day`)}
                {statBox("Total Roasted Ordered", formatWt(totalOrderedLbs, units))}
              </div>
              <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Batches by Group</div>
              {groupStats.slice(0,8).map(g => (
                <div key={g.label} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, color:C.cream }}>{g.label}</span>
                    <span style={{ ...mono, fontSize:11, color:C.amber }}>{g.batches} batch{g.batches !== 1 ? "es" : ""} <span style={{ color:C.dim }}>· {formatWt(g.greenLbs, units)} green · {g.days} day{g.days!==1?"s":""}</span></span>
                  </div>
                  <div style={{ height:6, background:C.surfaceHi, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(g.batches/maxBatches)*100}%`, background:C.black, borderRadius:3, transition:"width 0.3s" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalDays > 0 && reportTab === "byGroup" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 110px 110px 80px", gap:8, padding:"5px 0", borderBottom:`1px solid ${C.border}`, fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
                <span>Group</span><span style={{ textAlign:"right" }}>Batches</span><span style={{ textAlign:"right" }}>Green Used</span><span style={{ textAlign:"right" }}>Avg/Day Run</span><span style={{ textAlign:"right" }}>Days Run</span>
              </div>
              {groupStats.map(g => (
                <div key={g.label} style={{ display:"grid", gridTemplateColumns:"1fr 80px 110px 110px 80px", gap:8, padding:"8px 0", borderBottom:`1px solid ${C.borderSub}`, alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, color:C.cream }}>{g.label}</div>
                    <div style={{ ...mono, fontSize:9, color:C.dim }}>{g.tag}</div>
                  </div>
                  <div style={{ ...mono, fontSize:14, color:C.terra, textAlign:"right" }}>{g.batches}</div>
                  <div style={{ ...mono, fontSize:11, color:C.amber, textAlign:"right" }}>{formatWt(g.greenLbs, units)}</div>
                  <div style={{ ...mono, fontSize:11, color:C.muted, textAlign:"right" }}>{(g.batches/g.days).toFixed(1)}</div>
                  <div style={{ ...mono, fontSize:11, color:C.dim, textAlign:"right" }}>{g.days}</div>
                </div>
              ))}
            </div>
          )}
          {totalDays > 0 && reportTab === "packageSizes" && (
            <div>
              {packageSizeStats.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0", color:C.dim, fontSize:12, fontStyle:"italic" }}>
                  No package size data in this range. Re-save sheets to capture this data.
                </div>
              )}
              {packageSizeStats.length > 0 && (
                <>
                  {/* Bar chart by size */}
                  <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>Units by Package Size</div>
                  {packageSizeStats.map(s => (
                    <div key={s.size} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:11, color:C.cream }}>{s.size}</span>
                        <span style={{ ...mono, fontSize:11, color:C.amber }}>
                          {s.qty} units <span style={{ color:C.dim }}>· {formatWt(s.totalLbs, units)}</span>
                        </span>
                      </div>
                      <div style={{ height:6, background:C.surfaceHi, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(s.qty/maxSizeQty)*100}%`, background:C.amber+"99", borderRadius:3, transition:"width 0.3s" }} />
                      </div>
                    </div>
                  ))}

                </>
              )}
            </div>
          )}
          {totalDays > 0 && reportTab === "timeline" && (
            <div>
              {filtered.slice().reverse().map(day => (
                <div key={day.id} style={{ marginBottom:14, padding:"12px 14px", background:C.surfaceHi, border:`1px solid ${C.borderSub}`, borderRadius:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ ...serif, fontSize:13, color:C.amber }}>{day.dateStr}</div>
                      {day.notes && <div style={{ fontSize:10, color:C.muted, fontStyle:"italic", marginTop:2 }}>{day.notes}</div>}
                    </div>
                    <div style={{ display:"flex", gap:16 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Batches</div>
                        <div style={{ ...mono, fontSize:18, color:C.terra, lineHeight:1 }}>{day.totalBatches}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Green</div>
                        <div style={{ ...mono, fontSize:13, color:C.amber }}>{formatWt(parseFloat(day.totalGreen), units)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Ordered</div>
                        <div style={{ ...mono, fontSize:13, color:C.muted }}>{formatWt(parseFloat(day.totalOrdered), units)}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {(day.groups || []).map((g, gi) => (
                      <div key={gi} style={{ padding:"3px 9px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, fontSize:10 }}>
                        <span style={{ color:C.muted }}>{g.label}</span>
                        <span style={{ ...mono, color:C.terra, marginLeft:6 }}>{g.batches}×</span>
                        <span style={{ color:C.dim, marginLeft:4 }}>{formatWt(parseFloat(g.needed), units)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Catalog Modal (2 tabs: Products | Groups) ─────────────────
function CatalogManager({ groups, products, batchOverrides={}, units="lbs", onUpdateGroups, onUpdateProducts, onClose }) {
  const [tab, setTab] = useState("groups");

  // ── Products tab state ────────────────────────────────────
  const [pSearch, setPSearch] = useState("");
  const [pFilterGroup, setPFilterGroup] = useState("all");
  const [pFilterStatus, setPFilterStatus] = useState("all");
  const [pAdding, setPAdding] = useState(false);
  const [pNew, setPNew] = useState({ name:"", lbs:"", group: groups[0]?.id ?? "" });
  const [pEditId, setPEditId] = useState(null);
  const [pEdit, setPEdit] = useState({});

  // ── Groups tab state ──────────────────────────────────────
  const [gAdding, setGAdding] = useState(false);
  const [gNew, setGNew] = useState({ label:"", batch:"standard", type:"single_origin", roastLoss:"", components:[{ id:Date.now()+"", name:"", pct:"" }] });
  const [gEditId, setGEditId] = useState(null);
  const [gEdit, setGEdit] = useState({});

  // products tab helpers
  const filteredProds = products.filter(p => {
    const g = groups.find(g => g.id === p.group);
    return p.name.toLowerCase().includes(pSearch.toLowerCase())
      && (pFilterGroup === "all" || p.group === pFilterGroup)
;
  });
  const groupedProds = groups.map(g => ({ ...g, items: filteredProds.filter(p => p.group === g.id) })).filter(g => g.items.length > 0);

  function addProduct() {
    const lbs = parseFloat(pNew.lbs);
    if (!pNew.name.trim() || isNaN(lbs) || lbs <= 0 || !pNew.group) return;
    onUpdateProducts([...products, { id:"p"+Date.now(), name:pNew.name.trim(), lbs, group:pNew.group, active:true, createdAt: new Date().toISOString().slice(0,10) }]);
    setPNew(p => ({ ...p, name:"", lbs:"" }));
    setPAdding(false);
  }
  function saveProductEdit() {
    const lbs = parseFloat(pEdit.lbs);
    if (!pEdit.name?.trim() || isNaN(lbs)) { setPEditId(null); return; }
    onUpdateProducts(products.map(p => p.id === pEditId ? { ...p, name:pEdit.name.trim(), lbs, group:pEdit.group } : p));
    setPEditId(null);
  }

  // groups tab helpers
  function setGroupType(gId, type) {
    onUpdateGroups(groups.map(g => g.id === gId ? { ...g, type } : g));
  }
  function addComponent(gId) {
    onUpdateGroups(groups.map(g => g.id === gId
      ? { ...g, components: [...(g.components || []), { id: Date.now()+Math.random()+"", name:"", pct:0 }] }
      : g));
  }
  function updateComponent(gId, compId, field, value) {
    onUpdateGroups(groups.map(g => g.id === gId
      ? { ...g, components: (g.components || []).map(c => c.id === compId ? { ...c, [field]: value } : c) }
      : g));
  }
  function removeComponent(gId, compId) {
    onUpdateGroups(groups.map(g => g.id === gId
      ? { ...g, components: (g.components || []).filter(c => c.id !== compId) }
      : g));
  }
  function addGroup() {
    if (!gNew.label.trim()) return;
    const id = "g" + Date.now();
    const tag = autoTag(gNew.label);
    const components = (gNew.type === "blend" ? gNew.components || [] : []).map(c => ({ ...c, pct: parseFloat(c.pct)||0 }));
    onUpdateGroups([...groups, { id, label:gNew.label.trim(), tag, batch:gNew.batch, active:true, roastLoss:parseFloat(gNew.roastLoss)||0, type:gNew.type||"single_origin", components, createdAt: new Date().toISOString().slice(0,10) }]);
    setGNew({ label:"", batch:"standard", type:"single_origin", roastLoss:"", components:[{ id:Date.now()+"", name:"", pct:"" }] });
    setGAdding(false);
  }
  function saveGroupEdit() {
    if (!gEdit.label?.trim() || !gEdit.tag?.trim()) { setGEditId(null); return; }
    onUpdateGroups(groups.map(g => g.id === gEditId ? { ...g, label:gEdit.label.trim(), tag:gEdit.tag.trim().toUpperCase(), batch:gEdit.batch, roastLoss: gEdit.roastLoss ?? 0 } : g));
    setGEditId(null);
  }
  function deleteGroup(id) {
    onUpdateGroups(groups.filter(g => g.id !== id));
    onUpdateProducts(products.map(p => p.group === id ? { ...p, group: "" } : p));
  }



  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      padding:"8px 18px", background:"none", border:"none",
      borderBottom: tab === id ? `2px solid ${C.amber}` : "2px solid transparent",
      color: tab === id ? C.amber : C.muted,
      fontSize:12, cursor:"pointer", fontFamily:"'Roboto Mono', monospace",
      transition:"color 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:600, maxHeight:"84vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div style={{ padding:"14px 18px 0", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ ...serif, fontSize:15, color:C.amber }}>Manage Catalog</span>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.muted }}>
                <span style={{ ...mono, color:C.green }}>{groups.length}</span> groups ·{" "}
                <span style={{ ...mono, color:C.green }}>{products.length}</span> products
              </span>
              <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:0 }}>
            {tabBtn("groups", "Roast Groups")}
            {tabBtn("products", "Products")}
          </div>
        </div>

        {/* ── PRODUCTS TAB ── */}
        {tab === "products" && (
          <>
            <div style={{ padding:"10px 18px", borderBottom:`1px solid ${C.borderSub}`, display:"flex", gap:8, alignItems:"center" }}>
              <input type="text" placeholder="Search…" value={pSearch} onChange={e => setPSearch(e.target.value)} style={{ ...inputBase, flex:1 }} />
              <select value={pFilterGroup} onChange={e => setPFilterGroup(e.target.value)} style={{ ...inputBase, width:"auto", flex:"0 0 148px" }}>
                <option value="all">All groups</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>

              <button onClick={() => setPAdding(true)} style={{ padding:"6px 14px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer", whiteSpace:"nowrap" }}>+ Add</button>
            </div>

            {pAdding && (
              <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, background:C.surfaceHi }}>
                <div style={{ fontSize:10, color:C.amber, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>New Product</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input autoFocus type="text" placeholder="Product name" value={pNew.name} onChange={e => setPNew(p => ({ ...p, name:e.target.value }))}
                    onKeyDown={e => e.key==="Enter" && addProduct()} style={{ ...inputBase, flex:1 }} />
                  <input type="number" placeholder="lbs" step="0.001" min="0" value={pNew.lbs} onChange={e => setPNew(p => ({ ...p, lbs:e.target.value }))}
                    onKeyDown={e => e.key==="Enter" && addProduct()} style={{ ...inputBase, width:68 }} />
                  <select value={pNew.group} onChange={e => setPNew(p => ({ ...p, group:e.target.value }))} style={{ ...inputBase, width:"auto", flex:"0 0 148px" }}>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={addProduct} style={{ padding:"5px 16px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer" }}>Add</button>
                  <button onClick={() => setPAdding(false)} style={{ padding:"5px 16px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.dim, fontSize:11, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ flex:1, overflowY:"auto" }}>
              {groupedProds.length === 0 && <div style={{ padding:"28px", textAlign:"center", color:C.dim, fontSize:11 }}>No products match</div>}
              {groupedProds.map(g => (
                <div key={g.id}>
                  <div style={{ padding:"5px 18px", fontSize:9, color: C.amber, textTransform:"uppercase", letterSpacing:"0.12em", background:C.surfaceHi, borderTop:`1px solid ${C.borderSub}`, borderBottom:`1px solid ${C.borderSub}`, display:"flex", alignItems:"center", gap:8 }}>
                    {g.label}
                    
                  </div>
                  {g.items.map(p => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 18px", borderBottom:`1px solid ${C.borderSub}` }}>
                      {pEditId === p.id ? (
                        <>
                          <input autoFocus type="text" value={pEdit.name} onChange={e => setPEdit(v => ({ ...v, name:e.target.value }))}
                            onKeyDown={e => { if(e.key==="Enter") saveProductEdit(); if(e.key==="Escape") setPEditId(null); }}
                            style={{ ...inputBase, flex:1, padding:"3px 6px", fontSize:11 }} />
                          <input type="number" value={pEdit.lbs} step="0.001" min="0" onChange={e => setPEdit(v => ({ ...v, lbs:e.target.value }))}
                            style={{ ...inputBase, width:64, padding:"3px 6px", fontSize:11, ...mono }} />
                          <select value={pEdit.group} onChange={e => setPEdit(v => ({ ...v, group:e.target.value }))}
                            style={{ ...inputBase, width:"auto", flex:"0 0 140px", padding:"3px 6px", fontSize:11 }}>
                            {groups.map(g2 => <option key={g2.id} value={g2.id}>{g2.label}</option>)}
                          </select>
                          <button onClick={saveProductEdit} style={{ padding:"3px 10px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer" }}>Save</button>
                          <button onClick={() => setPEditId(null)} style={{ padding:"3px 8px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.dim, fontSize:11, cursor:"pointer" }}>✕</button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex:1, fontSize:11, color: C.cream }}>{p.name}</span>
                          <span style={{ ...mono, fontSize:10, color:C.dim, minWidth:42, textAlign:"right" }}>{p.lbs} lb</span>
                          <button onClick={() => { setPEditId(p.id); setPEdit({ name:p.name, lbs:String(p.lbs), group:p.group }); }} title="Edit" style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:13, padding:"0 3px" }}>✏</button>
                          <button onClick={() => onUpdateProducts(products.filter(x => x.id!==p.id))} title="Delete" style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:15, lineHeight:1, padding:"0 3px" }}>×</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── GROUPS TAB ── */}
        {tab === "groups" && (
          <>
            <div style={{ padding:"10px 18px", borderBottom:`1px solid ${C.borderSub}`, display:"flex", justifyContent:"flex-end" }}>
              <button onClick={() => setGAdding(true)} style={{ padding:"6px 14px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer" }}>+ New Group</button>
            </div>

            {gAdding && (() => {
              const batchWt = batchOverrides[gNew.batch] ?? (BATCH_MAP[gNew.batch]?.weight ?? 20.2);
              const totalPct = (gNew.components||[]).reduce((s,c) => s + (parseFloat(c.pct)||0), 0);
              const pctOk = Math.abs(totalPct - 100) < 0.01;
              return (
                <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, background:C.surfaceHi, display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:10, color:C.amber, textTransform:"uppercase", letterSpacing:"0.1em" }}>New Roast Group</div>
                  {/* Row 1: name + type toggle + batch */}
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <input autoFocus type="text" placeholder="Group name (e.g. Washed Ethiopia)" value={gNew.label}
                      onChange={e => setGNew(g => ({ ...g, label:e.target.value }))}
                      onKeyDown={e => e.key==="Enter" && addGroup()}
                      style={{ ...inputBase, flex:2, minWidth:160 }} />
                    <div style={{ display:"flex", borderRadius:4, overflow:"hidden", border:`1px solid ${C.border}`, flexShrink:0 }}>
                      {["single_origin","blend"].map(t => (
                        <button key={t} onClick={() => setGNew(g => ({ ...g, type:t, components: t==="blend" ? [{ id:Date.now()+"", name:"", pct:"" }] : [] }))}
                          style={{ padding:"5px 12px", background: gNew.type===t ? C.amber : C.surfaceHi, border:"none", color: gNew.type===t ? "#fff" : C.dim, fontSize:10, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
                          {t === "blend" ? "Blend" : "Single Origin"}
                        </button>
                      ))}
                    </div>
                    <select value={gNew.batch} onChange={e => setGNew(g => ({ ...g, batch:e.target.value }))}
                      style={{ ...inputBase, width:"auto", flex:"0 0 172px" }}>
                      {BATCH_TYPES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                      <input type="number" min="0" max="50" step="0.1" placeholder="0" value={gNew.roastLoss}
                        onChange={e => setGNew(g => ({ ...g, roastLoss: e.target.value }))}
                        style={{ ...inputBase, width:52, padding:"5px 6px", ...mono, textAlign:"center" }} />
                      <span style={{ fontSize:10, color:C.dim, whiteSpace:"nowrap" }}>% loss</span>
                    </div>
                  </div>
                  {/* Row 2: blend components */}
                  {gNew.type === "blend" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4, paddingLeft:4, borderLeft:`2px solid ${C.amber}` }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 64px 60px 24px", gap:6, alignItems:"center" }}>
                        <span style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.07em" }}>Component</span>
                        <span style={{ fontSize:9, color:C.dim, textAlign:"center" }}>%</span>
                        <span style={{ fontSize:9, color:C.dim, textAlign:"right" }}>lbs</span>
                        <span />
                      </div>
                      {(gNew.components||[]).map((comp, ci) => {
                        const pct = parseFloat(comp.pct)||0;
                        const lbs = (pct/100)*batchWt;
                        return (
                          <div key={comp.id} style={{ display:"grid", gridTemplateColumns:"1fr 64px 60px 24px", gap:6, alignItems:"center" }}>
                            <input placeholder={`Component ${ci+1}`} value={comp.name}
                              onChange={e => setGNew(g => ({ ...g, components: g.components.map((c,i) => i===ci ? { ...c, name:e.target.value } : c) }))}
                              style={{ ...inputBase, padding:"3px 6px", fontSize:11 }} />
                            <input type="number" min="0" max="100" step="0.1" placeholder="%" value={comp.pct}
                              onChange={e => setGNew(g => ({ ...g, components: g.components.map((c,i) => i===ci ? { ...c, pct:e.target.value } : c) }))}
                              style={{ ...inputBase, padding:"3px 5px", fontSize:11, ...mono, textAlign:"center", color:C.amber }} />
                            <span style={{ ...mono, fontSize:11, color:C.dim, textAlign:"right" }}>
                              {pct > 0 ? lbs.toFixed(2) : "—"}
                            </span>
                            {gNew.components.length > 1
                              ? <button onClick={() => setGNew(g => ({ ...g, components: g.components.filter((_,i) => i!==ci) }))}
                                  style={{ fontSize:10, padding:"2px 5px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer" }}>×</button>
                              : <span />
                            }
                          </div>
                        );
                      })}
                      {/* totals row */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 64px 60px 24px", gap:6, alignItems:"center", borderTop:`1px solid ${C.borderSub}`, paddingTop:4 }}>
                        <button onClick={() => setGNew(g => ({ ...g, components: [...g.components, { id:Date.now()+"", name:"", pct:"" }] }))}
                          style={{ justifySelf:"start", fontSize:9, padding:"2px 8px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer" }}>+ add</button>
                        <span style={{ ...mono, fontSize:10, color: pctOk ? C.green : totalPct > 0 ? C.terra : C.dim, textAlign:"center" }}>
                          {totalPct > 0 ? `${totalPct}%` : ""}
                        </span>
                        <span style={{ ...mono, fontSize:10, color:C.muted, textAlign:"right" }}>
                          {totalPct > 0 ? ((totalPct/100)*batchWt).toFixed(2) : "—"}
                        </span>
                        <span />
                      </div>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={addGroup} style={{ padding:"5px 16px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer" }}>Add Group</button>
                    <button onClick={() => setGAdding(false)} style={{ padding:"5px 16px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.dim, fontSize:11, cursor:"pointer" }}>Cancel</button>
                  </div>
                </div>
              );
            })()}

            <div style={{ flex:1, overflowY:"auto" }}>
              {groups.map(g => {
                const prodCount = products.filter(p => p.group === g.id).length;
                const components = g.components || [];
                const totalPct = components.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
                const isBlend = g.type === "blend";
                return (
                  <div key={g.id} style={{ borderBottom:`1px solid ${C.borderSub}` }}>
                    {/* Main row */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 18px" }}>

                    {gEditId === g.id ? (
                      <>
                        <input autoFocus type="text" value={gEdit.label} onChange={e => setGEdit(v => ({ ...v, label:e.target.value }))}
                          onKeyDown={e => { if(e.key==="Enter") saveGroupEdit(); if(e.key==="Escape") setGEditId(null); }}
                          style={{ ...inputBase, flex:1, padding:"3px 6px", fontSize:12 }} />
                        <input type="text" value={gEdit.tag} maxLength={5} onChange={e => setGEdit(v => ({ ...v, tag:e.target.value }))}
                          style={{ ...inputBase, width:64, padding:"3px 6px", fontSize:11, ...mono, textTransform:"uppercase" }} />
                        <select value={gEdit.batch} onChange={e => setGEdit(v => ({ ...v, batch:e.target.value }))}
                          style={{ ...inputBase, width:"auto", flex:"0 0 148px", padding:"3px 6px", fontSize:11 }}>
                          {BATCH_TYPES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                        </select>
                        <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                          <input type="number" step="0.1" min="0" max="50" value={gEdit.roastLoss ?? 0}
                            onChange={e => setGEdit(v => ({ ...v, roastLoss: parseFloat(e.target.value)||0 }))}
                            style={{ ...mono, width:44, padding:"3px 5px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4, color:C.muted, fontSize:11, outline:"none", textAlign:"center" }} />
                          <span style={{ fontSize:10, color:C.dim }}>%</span>
                        </div>
                        <button onClick={saveGroupEdit} style={{ padding:"3px 10px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer" }}>Save</button>
                        <button onClick={() => setGEditId(null)} style={{ padding:"3px 8px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.dim, fontSize:11, cursor:"pointer" }}>✕</button>
                      </>
                    ) : (
                      <>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, color: C.cream }}>{g.label}</div>
                          <div style={{ fontSize:10, color:C.dim, marginTop:2 }}>
                            <span style={{ ...mono, color:C.amber, marginRight:8 }}>{g.tag}</span>
                            {BATCH_MAP[g.batch]?.label.split(" (")[0]} ({formatWt(batchOverrides[g.batch] ?? BATCH_MAP[g.batch]?.weight ?? 20.2, units)}/batch)
                            <span style={{ color:C.dim }}> · {prodCount} product{prodCount !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        {/* SO / Blend toggle */}
                        <div style={{ display:"flex", flexShrink:0, borderRadius:4, overflow:"hidden", border:`1px solid ${C.border}` }}>
                          {[["single_origin","SO"],["blend","BLEND"]].map(([t, lbl]) => (
                            <button key={t} onClick={() => setGroupType(g.id, t)} style={{
                              padding:"3px 8px", fontSize:9, border:"none", cursor:"pointer",
                              background: g.type === t ? (t === "blend" ? C.terra : C.amber+"33") : "transparent",
                              color: g.type === t ? (t === "blend" ? "#fff" : C.amber) : C.dim,
                              fontFamily:"'Roboto Mono', monospace", fontWeight: g.type === t ? 600 : 400,
                            }}>{lbl}</button>
                          ))}
                        </div>
                        {/* Batch size */}
                        <select value={g.batch}
                          onChange={e => onUpdateGroups(groups.map(x => x.id===g.id ? { ...x, batch:e.target.value } : x))}
                          style={{ ...inputBase, width:"auto", flex:"0 0 auto", padding:"3px 6px", fontSize:10, color:C.muted }}>
                          {BATCH_TYPES.map(b => <option key={b.id} value={b.id}>{b.label.split(" (")[0]} ({formatWt(batchOverrides[b.id] ?? b.weight, units)})</option>)}
                        </select>
                        {/* Roast loss */}
                        <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                          <span style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Loss</span>
                          <input
                            type="number" step="0.1" min="0" max="50"
                            value={g.roastLoss ?? 0}
                            onChange={e => onUpdateGroups(groups.map(x => x.id===g.id ? { ...x, roastLoss: parseFloat(e.target.value)||0 } : x))}
                            style={{ ...mono, width:46, padding:"3px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4, color:(g.roastLoss ?? 0) > 0 ? C.amber : C.dim, fontSize:11, outline:"none", textAlign:"center" }}
                          />
                          <span style={{ fontSize:10, color:C.dim }}>%</span>
                        </div>
                        <button onClick={() => { setGEditId(g.id); setGEdit({ label:g.label, tag:g.tag, batch:g.batch, roastLoss: g.roastLoss ?? 0 }); }} title="Edit" style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:13, padding:"0 4px" }}>✏</button>
                        <button onClick={() => deleteGroup(g.id)} title="Delete" style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:15, lineHeight:1, padding:"0 4px" }}>×</button>
                      </>
                    )}
                    </div>

                    {/* Blend component editor — always visible when type is blend */}
                    {isBlend && gEditId !== g.id && (
                      <div style={{ marginLeft:46, marginRight:18, marginBottom:10, padding:"10px 14px", background:C.surfaceHi, borderRadius:5, border:`1px solid ${C.borderSub}` }}>
                        <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                          Blend Components
                          {components.length > 0 && (
                            <span style={{ ...mono, marginLeft:8, color: Math.abs(totalPct - 100) < 0.1 ? C.green : C.terra }}>
                              {totalPct.toFixed(1)}%
                              {Math.abs(totalPct - 100) < 0.1 ? " ✓" : " (must = 100%)"}
                            </span>
                          )}
                        </div>
                        {components.map((comp, ci) => (
                          <div key={comp.id} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:5 }}>
                            <input
                              type="text" placeholder={`Component ${ci + 1} (e.g. Ethiopia Danche)`}
                              value={comp.name}
                              onChange={e => updateComponent(g.id, comp.id, "name", e.target.value)}
                              style={{ ...inputBase, flex:1, padding:"4px 7px", fontSize:11 }}
                            />
                            <input
                              type="number" step="0.1" min="0" max="100"
                              value={comp.pct}
                              onChange={e => updateComponent(g.id, comp.id, "pct", parseFloat(e.target.value)||0)}
                              style={{ ...mono, width:52, padding:"4px 6px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, color:C.amber, fontSize:11, outline:"none", textAlign:"center" }}
                            />
                            <span style={{ fontSize:10, color:C.dim, flexShrink:0 }}>%</span>
                            <button onClick={() => removeComponent(g.id, comp.id)} style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:14, lineHeight:1, padding:"0 2px", flexShrink:0 }}>×</button>
                          </div>
                        ))}
                        <button onClick={() => addComponent(g.id)} style={{ fontSize:10, color:C.muted, background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, padding:"3px 10px", cursor:"pointer", marginTop: components.length > 0 ? 2 : 0 }}>
                          + Add Component
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function RoastPlanner() {
  const [groups, setGroups]     = useState(DEFAULT_GROUPS);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders]     = useState([]);
  const [leftovers, setLeftovers] = useState({});
  const [search, setSearch]     = useState("");
  const [qty, setQty]           = useState(1);
  const [dropOpen, setDropOpen] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [logoSrc, setLogoSrc] = useState(() => { try { return localStorage.getItem("pt_logo") || ""; } catch(e) { return ""; } });
  const [showSettings, setShowSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvUnmatched, setCsvUnmatched] = useState([]); // [{ name, qty }]
  const [addingSkus, setAddingSkus] = useState({});           // { [name]: { lbs:"", group:"", addingGroup:false, newGroup:{ label:"", tag:"", batch:"standard" } } }
  const [ignoredSkus, setIgnoredSkus] = useState([]);          // permanently ignored SKU names
  const [importedHashes, setImportedHashes] = useState([]);    // fingerprints of already-imported CSVs
  const [pendingImport, setPendingImport] = useState(null);     // { incoming, unmatched, label, hash, errorMsg }
  const [unmatchedByDate, setUnmatchedByDate] = useState({});   // { [date]: [{ name, qty }] }
  const [batchOverrides, setBatchOverrides] = useState({});
  const [savedSummaries, setSavedSummaries] = useState([]);
  const [units, setUnits] = useState("lbs");
  const dropRef = useRef(null);
  const csvRef  = useRef(null);
  const suppressCatalogSave = useRef(false); // prevents storage write during date-switch catalog swap
  const latestCatalog = useRef({ products: [], groups: [] }); // always tracks live catalog for new-date forward

  // Persist
  useEffect(() => {
    (async () => {
      try {
        const r1 = await window.storage.get("pt_orders");    if (r1) setOrders(JSON.parse(r1.value));
        const r2 = await window.storage.get("pt_leftovers"); if (r2) setLeftovers(JSON.parse(r2.value));
        const r3 = await window.storage.get("pt_products");  if (r3) setProducts(JSON.parse(r3.value));
        const r4 = await window.storage.get("pt_groups");    if (r4) setGroups(JSON.parse(r4.value));
        const r5 = await window.storage.get("pt_settings");  if (r5) setBatchOverrides(JSON.parse(r5.value));
        const r6 = await window.storage.get("pt_saved");     if (r6) setSavedSummaries(JSON.parse(r6.value));
        const r7 = await window.storage.get("pt_units");     if (r7) setUnits(r7.value);
        const r8 = await window.storage.get("pt_ignored");   if (r8) setIgnoredSkus(JSON.parse(r8.value));
        const r9 = await window.storage.get("pt_hashes");   if (r9) setImportedHashes(JSON.parse(r9.value));
        // Seed latestCatalog after load so forward-date navigation inherits persisted state
        const lp = r3 ? JSON.parse(r3.value) : null;
        const lg = r4 ? JSON.parse(r4.value) : null;
        if (lp && lg) latestCatalog.current = { products: lp, groups: lg };
      } catch {}
    })();
  }, []);
  useEffect(() => { window.storage?.set("pt_orders",    JSON.stringify(orders)).catch(()=>{}); }, [orders]);
  useEffect(() => { window.storage?.set("pt_leftovers", JSON.stringify(leftovers)).catch(()=>{}); }, [leftovers]);
  useEffect(() => {
    if (suppressCatalogSave.current) return;
    latestCatalog.current = { products, groups };
    window.storage?.set("pt_products", JSON.stringify(products)).catch(()=>{});
  }, [products, groups]);

  useEffect(() => { window.storage?.set("pt_ignored",   JSON.stringify(ignoredSkus)).catch(()=>{}); }, [ignoredSkus]);
  useEffect(() => { window.storage?.set("pt_hashes",    JSON.stringify(importedHashes)).catch(()=>{}); }, [importedHashes]);
  useEffect(() => { window.storage?.set("pt_settings",  JSON.stringify(batchOverrides)).catch(()=>{}); }, [batchOverrides]);
  useEffect(() => { window.storage?.set("pt_saved",     JSON.stringify(savedSummaries)).catch(()=>{}); }, [savedSummaries]);
  useEffect(() => { window.storage?.set("pt_units",     units).catch(()=>{}); }, [units]);
  useEffect(() => { if (logoSrc) { try { localStorage.setItem('pt_logo', logoSrc); } catch(e) {} } }, [logoSrc]);

  useEffect(() => {
    const h = e => { if (!dropRef.current?.contains(e.target)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeGroups   = useMemo(() => groups, [groups]);
  const activeProducts = useMemo(() => products.filter(p => groups.find(g => g.id === p.group)), [products, groups]);
  // Filter out any unmatched SKUs that have since been added to the catalog or ignored
  const visibleUnmatched = useMemo(() =>
    csvUnmatched.filter(u => !products.find(p => p.name === u.name) && !ignoredSkus.includes(u.name)),
    [csvUnmatched, products, ignoredSkus]);
  const productById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return activeProducts.filter(p => p.name.toLowerCase().includes(q)).slice(0, 14);
  }, [search, activeProducts]);

  // Only plan for active groups
  const plan = useMemo(() =>
    groups.map(g => ({ ...g, calc: calcGroup(g, orders, products, leftovers[g.id] ?? 0, batchOverrides) })),
    [groups, orders, products, leftovers, batchOverrides]);

  const grandTotalLbs = useMemo(() =>
    orders.reduce((s, o) => s + (productById[o.productId]?.lbs || 0) * o.qty, 0),
    [orders, productById]);

  const roastNeeded = plan.filter(g => g.calc.needed > 0);

  function addOrder(product) {
    setOrders(prev => {
      const idx = prev.findIndex(o => o.productId === product.id);
      if (idx >= 0) return prev.map((o,i) => i===idx ? { ...o, qty: o.qty+qty } : o);
      return [...prev, { id: Date.now()+Math.random(), productId: product.id, qty }];
    });
    setSearch(""); setQty(1); setDropOpen(false);
  }

  function parsePaste() {
    const lines = pasteText.trim().split("\n").filter(Boolean);
    const incoming = [];
    const unmatched = [];
    for (const line of lines) {
      const parts = line.trim().split(/\t+|\s{2,}/);
      if (parts.length < 2) continue;
      const name = parts[0].trim();
      const q = parseInt(parts[parts.length-1]);
      const prod = activeProducts.find(p => p.name === name);
      if (prod && q > 0) incoming.push({ id: Date.now()+Math.random(), productId: prod.id, qty: q });
      else if (name && !ignoredSkus.includes(name)) unmatched.push({ name, qty: q || 0 });
    }
    if (incoming.length > 0) mergeOrders(incoming);
    if (unmatched.length > 0) { setCsvUnmatched(unmatched); setCsvError(`${incoming.length} imported. ${unmatched.length} unmatched — click to add.`); }
    setPasteText(""); setPasteMode(false);
  }

  function parseLbsFromSkuName(name) {
    const m = name.match(/-(\s*)(\d+\.?\d*)(oz|lb)$/i);
    if (!m) return "";
    const num = parseFloat(m[2]), unit = m[3].toLowerCase();
    return unit === "lb" ? String(num) : String(parseFloat((num / 16).toFixed(4)));
  }
  function skuToGroupLabel(name) {
    // "TRADE Sure Thing - 10.9oz" → "Sure Thing"
    const noSize = name.replace(/\s*-\s*[\d.]+\s*(oz|lb)\s*$/i, "").trim();
    const noPrefix = noSize.replace(/^TRADE\s+/i, "").trim();
    return noPrefix;
  }
  function startAddSku(name) {
    const label = skuToGroupLabel(name);
    setAddingSkus(prev => ({
      ...prev,
      [name]: { lbs: parseLbsFromSkuName(name), group: groups[0]?.id || "",
                addingGroup: false, newGroupError: null,
                newGroup: { label, batch:"standard", type:"single_origin", components:[{ id:Date.now()+"", name:"" }] } }
    }));
  }
  function cancelAddSku(name) {
    setAddingSkus(prev => { const n = { ...prev }; delete n[name]; return n; });
  }
  function autoTag(label) {
    // "Gititu AA Kenya" → "GAK" — initials of each word, max 5 chars
    return label.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 5);
  }
  function commitNewGroup(skuName) {
    const s = addingSkus[skuName];
    const ng = s?.newGroup;
    if (!ng?.label.trim()) {
      setAddingSkus(prev => ({ ...prev, [skuName]: { ...prev[skuName], newGroupError: "Group name is required" } }));
      return;
    }
    const tag = autoTag(ng.label);
    const groupId = "g" + Date.now();
    const components = (ng.type === "blend" ? ng.components || [] : []).map(c => ({ ...c, pct: 0 }));
    setGroups(prev => [...prev, { id: groupId, label: ng.label.trim(), tag, batch: ng.batch, active: true, roastLoss: parseFloat(ng.roastLoss)||0, type: ng.type || "single_origin", components, createdAt: productionDate }]);
    setAddingSkus(prev => ({ ...prev, [skuName]: { ...prev[skuName], group: groupId, addingGroup: false, newGroupError: null } }));
  }
  function confirmAddSku(sku) {
    const s = addingSkus[sku.name] || {};
    const lbsNum = parseFloat(s.lbs);
    if (!s.group || isNaN(lbsNum) || lbsNum <= 0) return;
    const newProd = { id: "p"+Date.now(), name: sku.name, lbs: lbsNum, group: s.group, active: true, createdAt: productionDate };
    setProducts(prev => [...prev, newProd]);
    if (sku.qty > 0) setOrders(prev => [...prev, { id: Date.now()+Math.random(), productId: newProd.id, qty: sku.qty }]);
    setCsvUnmatched(prev => prev.filter(s => s.name !== sku.name));
    setAddingSkus(prev => { const n = { ...prev }; delete n[sku.name]; return n; });
    // Remove from ALL dates so it never re-appears on any date
    setUnmatchedByDate(prev => {
      const next = {};
      for (const [d, list] of Object.entries(prev)) {
        const filtered = list.filter(u => u.name !== sku.name);
        if (filtered.length > 0) next[d] = filtered;
      }
      return next;
    });
  }
  function ignoreSku(name) {
    setIgnoredSkus(prev => prev.includes(name) ? prev : [...prev, name]);
    setCsvUnmatched(prev => prev.filter(s => s.name !== name));
    setAddingSkus(prev => { const n = { ...prev }; delete n[name]; return n; });
    setUnmatchedByDate(prev => {
      const next = {};
      for (const [d, list] of Object.entries(prev)) {
        const filtered = list.filter(u => u.name !== name);
        if (filtered.length > 0) next[d] = filtered;
      }
      return next;
    });
  }

  function formatBatchSize(sizeStr) {
    // "10.934928204369928 oz" → "10.9oz"  |  "32 oz" → "2lb"  |  "2 lb" → "2lb"
    const match = sizeStr.trim().match(/^([\d.]+)\s*(oz|lb)$/i);
    if (!match) return sizeStr.trim();
    let num = parseFloat(match[1]);
    let unit = match[2].toLowerCase();
    // Convert 32oz → 2lb
    if (unit === "oz" && num === 32) { num = 2; unit = "lb"; }
    const formatted = Number.isInteger(num) ? String(num) : num.toFixed(1);
    return formatted + unit;
  }

  function mergeOrders(incoming) {
    setOrders(prev => {
      const merged = [...prev];
      for (const item of incoming) {
        const existing = merged.find(o => o.productId === item.productId);
        if (existing) existing.qty += item.qty;
        else merged.push(item);
      }
      return merged;
    });
  }

  function hashText(str) {
    // Simple djb2 hash — fast, no crypto needed
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  function commitImport(incoming, unmatched, hash, errorMsg) {
    mergeOrders(incoming);
    if (unmatched.length > 0) { setCsvUnmatched(unmatched); }
    setCsvError(errorMsg);
    if (hash) setImportedHashes(prev => prev.includes(hash) ? prev : [...prev, hash]);
    setPendingImport(null);
  }

  function handleCsvFile(file) {
    if (!file) return;
    setCsvError("");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const hash = hashText(text);
        const isDuplicate = importedHashes.includes(hash);
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setCsvError("CSV must have a header row and at least one data row."); return; }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));

        // ── Batch CSV format (has internal_id + size columns) ──────────────
        const internalIdCol = headers.findIndex(h => h === "internal_id");
        const sizeCol       = headers.findIndex(h => h === "size");
        const qtyCol        = headers.findIndex(h => h === "quantity");

        if (internalIdCol !== -1 && sizeCol !== -1) {
          // Aggregate: build Map<skuName → totalQty>
          const tally = new Map();
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map(c => c.trim().replace(/^"|'|"|'$/g, ""));
            const internalId = cols[internalIdCol]?.trim();
            const size       = cols[sizeCol]?.trim();
            const q          = qtyCol !== -1 ? parseInt(cols[qtyCol]) || 1 : 1;
            if (!internalId || !size) continue;
            const sku = `${internalId} - ${formatBatchSize(size)}`;
            tally.set(sku, (tally.get(sku) || 0) + q);
          }

          const incoming  = [];
          const unmatched = [];
          for (const [sku, qty] of tally) {
            const prod = activeProducts.find(p => p.name === sku);
            if (prod) incoming.push({ id: Date.now()+Math.random(), productId: prod.id, qty });
            else if (!ignoredSkus.includes(sku)) unmatched.push({ name: sku, qty });
          }
          if (incoming.length === 0) { setCsvUnmatched(unmatched); setCsvError(`No matching products found. ${unmatched.length} SKU${unmatched.length !== 1 ? "s" : ""} unmatched.`); return; }
          const batchMsg = `Imported ${incoming.length} SKU${incoming.length !== 1 ? "s" : ""} from batch. ${unmatched.length} unmatched.`;
          if (isDuplicate) { setPendingImport({ incoming, unmatched, hash, errorMsg: batchMsg, label: file.name }); return; }
          commitImport(incoming, unmatched, hash, batchMsg);
          return;
        }

        // ── Standard format: look for name + qty columns ───────────────────
        const nameCol = headers.findIndex(h => h.includes("name") || h.includes("product") || h.includes("item"));
        const qtyCol2 = headers.findIndex(h => h.includes("qty") || h.includes("quantity") || h.includes("count") || h.includes("amount"));

        if (nameCol === -1 || qtyCol2 === -1) {
          const fallbackIncoming = [];
          const fallbackUnmatched = [];
          for (let i = 0; i < lines.length; i++) {
            const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            if (cols.length < 2) continue;
            const name = cols[0];
            const q = parseInt(cols[cols.length - 1]);
            const prod = activeProducts.find(p => p.name === name);
            if (prod && q > 0) fallbackIncoming.push({ id: Date.now()+Math.random(), productId: prod.id, qty: q });
            else if (name && !ignoredSkus.includes(name)) fallbackUnmatched.push({ name, qty: q || 0 });
          }
          if (fallbackIncoming.length === 0) { setCsvUnmatched(fallbackUnmatched); setCsvError(`No matching products found. ${fallbackUnmatched.length} skipped (no match).`); return; }
          const fbMsg = `Imported ${fallbackIncoming.length} item${fallbackIncoming.length !== 1 ? "s" : ""}. ${fallbackUnmatched.length} skipped (no match).`;
          if (isDuplicate) { setPendingImport({ incoming: fallbackIncoming, unmatched: fallbackUnmatched, hash, errorMsg: fbMsg, label: file.name }); return; }
          commitImport(fallbackIncoming, fallbackUnmatched, hash, fbMsg);
          return;
        }

        const incoming = [];
        const unmatched = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          if (cols.length <= Math.max(nameCol, qtyCol2)) continue;
          const name = cols[nameCol];
          const q = parseInt(cols[qtyCol2]);
          const prod = activeProducts.find(p => p.name === name);
          if (prod && q > 0) incoming.push({ id: Date.now()+Math.random(), productId: prod.id, qty: q });
          else if (name && !ignoredSkus.includes(name)) unmatched.push({ name, qty: q || 0 });
        }
        if (incoming.length === 0) { setCsvUnmatched(unmatched); setCsvError(`No matching products found. ${unmatched.length} skipped (no match).`); return; }
        const stdMsg = `Imported ${incoming.length} item${incoming.length !== 1 ? "s" : ""}. ${unmatched.length} skipped (no match).`;
        if (isDuplicate) { setPendingImport({ incoming, unmatched, hash, errorMsg: stdMsg, label: file.name }); return; }
        commitImport(incoming, unmatched, hash, stdMsg);
      } catch (err) {
        setCsvError("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(file);
    csvRef.current.value = "";
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const [productionDate, setProductionDate] = useState(todayISO);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [autoSaveTime, setAutoSaveTime] = useState(null);

  function formatDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  }

  const [showPickList, setShowPickList] = useState(false);
  const [pickSort, setPickSort] = useState({ field:"size", dir:"desc" });
  const [expandedItems, setExpandedItems] = useState({});
  const [showBatchSummary, setShowBatchSummary] = useState(false);

  function openEditAsText() {
    const text = orders
      .map(o => {
        const p = productById[o.productId];
        return p ? `${p.name}\t${o.qty}` : null;
      })
      .filter(Boolean)
      .join("\n");
    setPasteText(text);
    setPasteMode(true);
  }

  function saveSummary(notes) {
    const totalBatches = roastNeeded.reduce((s, g) => s + g.calc.batchesUp, 0);
    const totalOrdered = plan.reduce((s, g) => s + g.calc.totalLbs, 0);
    const totalGreen   = roastNeeded.reduce((s, g) => s + g.calc.batchesUp * g.calc.batchWeight, 0);
    const snapshot = {
      id: Date.now(),
      dateStr: formatDate(productionDate),
      productionDate,
      savedAt: new Date().toISOString(),
      totalBatches,
      totalOrdered: totalOrdered.toFixed(2),
      totalGreen: totalGreen.toFixed(2),
      notes,
      groups: roastNeeded.map(g => ({
        label: g.label, tag: g.tag, batches: g.calc.batchesUp,
        needed: g.calc.needed.toFixed(2), ordered: g.calc.totalLbs.toFixed(2),
        roastLoss: g.calc.roastLossPct,
      })),
      packageSizes: pickList.bySizeAll.map(s => ({ size: s.size, qty: s.qty, totalLbs: s.totalLbs })),
      skus: pickList.bySku.map(s => ({ name: s.name, qty: s.qty, totalLbs: s.totalLbs })),
      leftovers,
      catalogSnapshot: { products, groups },
        autoSaved: false,
    };
    setSavedSummaries(prev => [snapshot, ...prev]);
  }

  // Build pick list data
  const pickList = useMemo(() => {
    if (!orders.length) return { byGroup: [], bySizeAll: [], bySku: [] };

    const items = orders
      .map(o => ({ ...o, product: productById[o.productId] }))
      .filter(o => o.product);

    const byGroup = groups.map(g => {
      const nameMap = {};
      items
        .filter(o => o.product.group === g.id)
        .forEach(o => {
          const n = o.product.name;
          if (!nameMap[n]) nameMap[n] = { name: n, qty: 0, lbs: o.product.lbs, totalLbs: 0 };
          nameMap[n].qty += o.qty;
          nameMap[n].totalLbs += o.qty * o.product.lbs;
        });
      return { ...g, items: Object.values(nameMap) };
    }).filter(g => g.items.length > 0);

    const sizeMap = {};
    items.forEach(o => {
      const parts = o.product.name.split(" - ");
      const size = parts[parts.length - 1];
      if (!sizeMap[size]) sizeMap[size] = { size, qty: 0, totalLbs: 0 };
      sizeMap[size].qty += o.qty;
      sizeMap[size].totalLbs += o.qty * o.product.lbs;
    });
    const sizeOrder = s => {
      const m = s.match(/^(\d+\.?\d*)(oz|lb|lb Bucket)/i);
      if (!m) return 999;
      const n = parseFloat(m[1]), unit = m[2].toLowerCase();
      if (unit === "oz") return n / 16;
      if (unit === "lb") return n;
      if (unit === "lb bucket") return n + 100;
      return 999;
    };
    const bySizeAll = Object.values(sizeMap).sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size));

    // Combine identical SKU names across groups
    const skuMap = {};
    items.forEach(o => {
      const name = o.product.name;
      if (!skuMap[name]) skuMap[name] = { name, qty: 0, totalLbs: 0, lbs: o.product.lbs };
      skuMap[name].qty += o.qty;
      skuMap[name].totalLbs += o.qty * o.product.lbs;
    });
    const bySku = Object.values(skuMap).sort((a, b) => a.name.localeCompare(b.name));

    return { byGroup, bySizeAll, bySku };
  }, [orders, productById, groups]);

  // Debounced autosave — upserts by productionDate whenever orders change
  useEffect(() => {
    if (!orders.length) return;
    setAutoSaveStatus("saving");
    const t = setTimeout(() => {
      const totalBatches = roastNeeded.reduce((s, g) => s + g.calc.batchesUp, 0);
      const totalOrdered = plan.reduce((s, g) => s + g.calc.totalLbs, 0);
      const totalGreen   = roastNeeded.reduce((s, g) => s + g.calc.batchesUp * g.calc.batchWeight, 0);
      const snapshot = {
        productionDate,
        dateStr:      formatDate(productionDate),
        savedAt:      new Date().toISOString(),
        totalBatches,
        totalOrdered: totalOrdered.toFixed(2),
        totalGreen:   totalGreen.toFixed(2),
        notes:        "",
        groups: roastNeeded.map(g => ({
          label: g.label, tag: g.tag, batches: g.calc.batchesUp,
          needed: g.calc.needed.toFixed(2), ordered: g.calc.totalLbs.toFixed(2),
          roastLoss: g.calc.roastLossPct,
        })),
        packageSizes: pickList.bySizeAll.map(s => ({ size: s.size, qty: s.qty, totalLbs: s.totalLbs })),
        skus:         pickList.bySku.map(s => ({ name: s.name, qty: s.qty, totalLbs: s.totalLbs })),
        leftovers,
        // Only capture catalogSnapshot when NOT viewing a past-date restored catalog
        catalogSnapshot: suppressCatalogSave.current ? undefined : { products, groups },
        autoSaved:    true,
      };
      setSavedSummaries(prev => {
        const existing = prev.find(s => s.productionDate === productionDate && s.autoSaved);
        if (existing) return prev.map(s => s === existing ? { ...snapshot, id: s.id, notes: s.notes, catalogSnapshot: snapshot.catalogSnapshot ?? s.catalogSnapshot } : s);
        return [{ ...snapshot, id: Date.now() }, ...prev];
      });
      setAutoSaveStatus("saved");
      setAutoSaveTime(new Date());
    }, 1500);
    return () => clearTimeout(t);
  }, [orders, productionDate]); // eslint-disable-line

  function printPickList() {
    const dir = pickSort.dir === "asc" ? 1 : -1;
    const sorted = (items) => [...items].sort((a, b) =>
      pickSort.field === "size" ? (a.lbs - b.lbs) * dir : a.name.localeCompare(b.name) * dir
    );

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pick List — ${formatDate(productionDate)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Roboto Mono', monospace; font-size: 11px; color: #231F20; padding: 24px; }
  h1 { font-size: 15px; margin-bottom: 2px; }
  .sub { font-size: 10px; color: #888; margin-bottom: 16px; }
  .sizes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #ccc; }
  .size-box { border: 1px solid #ccc; border-radius: 4px; padding: 6px 12px; min-width: 80px; }
  .size-label { font-size: 8px; text-transform: uppercase; color: #888; }
  .size-qty { font-size: 18px; font-weight: 700; }
  .size-wt { font-size: 9px; color: #888; }
  .group { margin-bottom: 14px; }
  .group-header { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #B29244; padding-bottom: 4px; border-bottom: 1px solid #ccc; margin-bottom: 4px; }
  .item { display: flex; align-items: center; gap: 10px; padding: 4px 0; border-bottom: 1px solid #eee; }
  .checkbox { width: 14px; height: 14px; border: 1px solid #aaa; border-radius: 2px; flex-shrink: 0; }
  .item-name { flex: 1; }
  .item-qty { font-weight: 700; min-width: 28px; text-align: right; }
  .item-wt { color: #888; min-width: 60px; text-align: right; }
  .group-total { text-align: right; font-size: 10px; color: #888; padding: 3px 0; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
<h1>Pick List</h1>
<div class="sub">${formatDate(productionDate)}</div>

<div class="sizes">
${pickList.bySizeAll.map(s => `
  <div class="size-box">
    <div class="size-label">${s.size}</div>
    <div class="size-qty">${s.qty}</div>
    <div class="size-wt">${formatWt(s.totalLbs, units)}</div>
  </div>`).join('')}
</div>

${pickList.byGroup.map(g => `
<div class="group">
  <div class="group-header">${g.label}</div>
  ${sorted(g.items).map(item => `
  <div class="item">
    <div class="checkbox"></div>
    <div class="item-name">${item.name}</div>
    <div class="item-qty">×${item.qty}</div>
    <div class="item-wt">${formatWt(item.totalLbs, units)}</div>
  </div>`).join('')}
  <div class="group-total">${formatWt(g.items.reduce((s, i) => s + i.totalLbs, 0), units)}</div>
</div>`).join('')}

<div class="footer">
  <span>${orders.reduce((s, o) => s + o.qty, 0)} units across ${orders.length} products</span>
  <span><strong>${formatWt(grandTotalLbs, units)}</strong> total</span>
</div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=700,height=900');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  }

  return (
    <div style={{ fontFamily:"'Roboto Mono', monospace", background:C.bg, color:C.cream, minHeight:"100vh", display:"flex", flexDirection:"column", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        html,body,#root { height:100%; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#DDD9C4} ::-webkit-scrollbar-thumb{background:#C8C4A8;border-radius:3px}
        input[type=number]{-moz-appearance:textfield} input[type=number]::-webkit-inner-spin-button{opacity:0.4}
        select option{background:#EAE8D8}
      `}</style>

      {/* Header */}
      <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:10 }}>
        {/* Logo upload area */}
        {logoSrc
          ? <div style={{ position:"relative", display:"flex", alignItems:"center", cursor:"pointer" }} onClick={() => document.getElementById("logo-upload-input").click()} title="Click to change logo">
              <img src={logoSrc} alt="Logo" style={{ height:44, maxWidth:180, objectFit:"contain", display:"block" }} />
            </div>
          : <label htmlFor="logo-upload-input" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:44, width:100, border:`1px dashed ${C.border}`, borderRadius:4, cursor:"pointer", color:C.muted, fontSize:10, fontFamily:"'Roboto Mono', monospace", textAlign:"center", lineHeight:1.3, padding:"0 8px" }}>
              + Add Logo
            </label>
        }
        <input id="logo-upload-input" type="file" accept="image/*" style={{ display:"none" }}
          onChange={e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => setLogoSrc(ev.target.result);
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
        <div style={{ display:"flex", flexDirection:"column", gap:2, marginLeft:8 }}>
          <div style={{ fontSize:8, color:C.terra, textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:"'Roboto Mono', monospace" }}>Production Date</div>
          <div style={{ fontSize:8, ...mono, letterSpacing:"0.05em", color: autoSaveStatus === "saving" ? C.dim : C.green, transition:"color 0.3s", minHeight:11 }}>
            {autoSaveStatus === "saving"
              ? "saving…"
              : autoSaveTime
              ? `✓ autosaved · ${autoSaveTime.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })} ${autoSaveTime.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", second:"2-digit" })}`
              : ""}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4, cursor:"pointer" }}
            onClick={() => document.getElementById("prod-date-input").showPicker?.()}>
            <span style={{ fontSize:11, color:C.amber }}>📅</span>
            <input
              id="prod-date-input"
              type="date"
              value={productionDate}
              onChange={e => {
                const d = e.target.value;
                // Flush current date's state to savedSummaries immediately before switching
                if (orders.length > 0) {
                  const skuSnap = orders.map(o => { const p = products.find(x => x.id === o.productId); return p ? { name: p.name, qty: o.qty } : null; }).filter(Boolean);
                  setSavedSummaries(prev => {
                    const existing = prev.find(s => s.productionDate === productionDate && s.autoSaved);
                    if (existing) {
                      return prev.map(s => s === existing ? { ...s, skus: skuSnap, leftovers, catalogSnapshot: { products, groups } } : s);
                    }
                    // No snapshot yet — create one now so the data isn't lost
                    return [{ id: Date.now(), productionDate, dateStr: formatDate(productionDate), savedAt: new Date().toISOString(), totalBatches: 0, totalOrdered: "0", totalGreen: "0", notes: "", groups: [], packageSizes: [], skus: skuSnap, leftovers, catalogSnapshot: { products, groups }, autoSaved: true }, ...prev];
                  });
                }
                // Save current date's unmatched SKUs before switching
                if (csvUnmatched.length > 0) {
                  setUnmatchedByDate(prev => ({ ...prev, [productionDate]: csvUnmatched }));
                } else {
                  setUnmatchedByDate(prev => { const n = { ...prev }; delete n[productionDate]; return n; });
                }
                setProductionDate(d);
                // Clear transient sheet state
                setCsvError("");
                setCsvUnmatched([]);
                setAddingSkus({});
                setPendingImport(null);
                // Restore from saved snapshot if one exists for this date, otherwise clear orders only
                const saved = savedSummaries.find(s => (s.productionDate || s.savedAt?.slice(0,10)) === d);
                if (saved) {
                  // Past date with snapshot: restore catalog state as it was on that date
                  suppressCatalogSave.current = true;
                  if (saved.catalogSnapshot) {
                    setProducts(saved.catalogSnapshot.products);
                    setGroups(saved.catalogSnapshot.groups);
                  } else {
                    // Fall back to createdAt filtering — only show products/groups that existed on or before this date
                    const lp = latestCatalog.current.products;
                    const lg = latestCatalog.current.groups;
                    setProducts(lp.filter(p => !p.createdAt || p.createdAt <= d));
                    setGroups(lg.filter(g => !g.createdAt || g.createdAt <= d));
                  }
                  setTimeout(() => { suppressCatalogSave.current = false; }, 100);
                  // Restore orders from snapshot
                  const snapProducts = saved.catalogSnapshot?.products
                    ?? latestCatalog.current.products.filter(p => !p.createdAt || p.createdAt <= d);
                  const restored = (saved.skus || []).map(sku => {
                    const product = snapProducts.find(p => p.name === sku.name);
                    return product ? { id: Date.now() + Math.random(), productId: product.id, qty: sku.qty } : null;
                  }).filter(Boolean);
                  setOrders(restored);
                  setLeftovers(saved.leftovers || {});
                  setImportedHashes([]);
                } else {
                  // New/future date: restore latest catalog, clear orders/leftovers
                  suppressCatalogSave.current = true;
                  setProducts(latestCatalog.current.products.length ? latestCatalog.current.products : products);
                  setGroups(latestCatalog.current.groups.length ? latestCatalog.current.groups : groups);
                  setTimeout(() => { suppressCatalogSave.current = false; }, 100);
                  setOrders([]);
                  setLeftovers({});
                  setImportedHashes([]);
                }
                // Restore any pending unmatched SKUs for the new date (filtering out ones now in catalog)
                const savedUnmatched = unmatchedByDate[d] || [];
                if (savedUnmatched.length > 0) {
                  const stillUnmatched = savedUnmatched.filter(u => !ignoredSkus.includes(u.name));
                  if (stillUnmatched.length > 0) setCsvUnmatched(stillUnmatched);
                }
              }}
              style={{ ...mono, fontSize:11, background:"none", border:"none", color:C.cream, cursor:"pointer", outline:"none", colorScheme:"light" }}
            />
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>

          <button onClick={() => setShowPickList(true)} disabled={!orders.length} style={{ padding:"5px 14px", background: orders.length ? C.bg : "none", border:`1px solid ${orders.length ? C.bg : C.border}`, borderRadius:5, color: orders.length ? C.cream : C.dim, fontSize:11, cursor: orders.length ? "pointer" : "default", fontFamily:"'Roboto Mono', monospace", fontWeight: orders.length ? 600 : 400 }}>
            ☰ Pick List
          </button>
          <button onClick={() => setShowReports(true)} style={{ padding:"5px 14px", background:C.bg, border:`1px solid ${C.bg}`, borderRadius:5, color:C.cream, fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
            ▦ Reports
          </button>
          <button onClick={() => setShowCatalog(true)} style={{ padding:"5px 14px", background:C.bg, border:`1px solid ${C.bg}`, borderRadius:5, color:C.cream, fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
            ⚙ Catalog
          </button>
          <button onClick={() => setShowSettings(true)} style={{ padding:"5px 14px", background:C.bg, border:`1px solid ${C.bg}`, borderRadius:5, color:C.cream, fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
            ⚙ Settings
          </button>
        </div>
      </header>

      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Sidebar */}
        <aside style={{ width:300, minWidth:300, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.borderSub}` }}>
            <div style={{ ...serif, fontSize:11, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Orders</div>
            {!pasteMode ? (
              <>
                <div ref={dropRef} style={{ position:"relative" }}>
                  <input type="text" placeholder="Search active products…" value={search}
                    onChange={e => { setSearch(e.target.value); setDropOpen(true); }}
                    onFocus={() => setDropOpen(true)}
                    style={{ ...inputBase, width:"100%" }} />
                  {dropOpen && suggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 3px)", left:0, right:0, zIndex:100, background:C.surface, border:`1px solid ${C.border}`, borderRadius:5, maxHeight:240, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,0.6)" }}>
                      {suggestions.map(p => (
                        <div key={p.id} onMouseDown={() => addOrder(p)}
                          style={{ padding:"7px 10px", cursor:"pointer", borderBottom:`1px solid ${C.borderSub}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surfaceHi}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ fontSize:11, color:C.cream }}>{p.name}</span>
                          <span style={{ ...mono, fontSize:10, color:C.dim }}>{p.lbs}lb</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ marginTop:8, display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:C.muted }}>Qty</span>
                  <input type="number" min="1" value={qty}
                    onChange={e => setQty(Math.max(1, parseInt(e.target.value)||1))}
                    style={{ ...mono, width:56, padding:"4px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4, color:C.amber, fontSize:12, outline:"none", textAlign:"center" }} />
                  <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                    <button onClick={() => setPasteMode(true)} style={{ fontSize:10, color:C.muted, background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, padding:"4px 7px", cursor:"pointer" }}>
                      Paste
                    </button>
                    <button onClick={() => csvRef.current?.click()} style={{ fontSize:10, color:C.muted, background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, padding:"4px 7px", cursor:"pointer" }}>
                      CSV
                    </button>
                    <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display:"none" }} onChange={e => handleCsvFile(e.target.files[0])} />
                  </div>
                </div>
                {csvError && (
                  <div style={{ marginTop:6, fontSize:10, lineHeight:1.5, color: csvError.startsWith("No matching") || csvError.startsWith("Failed") ? C.terra : C.muted }}>
                    {csvError.split(/(\d+ skipped \(no match\))/)[0]}
                    {visibleUnmatched.length > 0
                      ? <span onClick={() => setCsvUnmatched([...csvUnmatched])} style={{ color:C.terra, textDecoration:"underline", cursor:"pointer" }}>{visibleUnmatched.length} unmatched — click to add</span>
                      : null
                    }
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ fontSize:10, color:C.muted, marginBottom:6 }}>Paste tab-separated (Name → Qty)</div>
                <textarea autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6}
                  placeholder={"Paste one item per line — product name, then a tab, then quantity:\n\nExample:\nSure Thing - 5lb\t3\nNano Genji Ethiopia - 2lb\t2\n4:30 a.m. - 10oz\t12\n\nNames must match exactly as they appear in the catalog."}
                  style={{ ...inputBase, resize:"vertical", ...mono, fontSize:11, lineHeight:1.5 }} />
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <button onClick={parsePaste} style={{ flex:1, padding:"6px", background:C.black, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer" }}>Import</button>
                  <button onClick={() => setPasteMode(false)} style={{ flex:1, padding:"6px", background:"none", border:`1px solid ${C.border}`, borderRadius:4, color:C.muted, fontSize:11, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ flex:1, overflowY:"auto" }}>
            {orders.length === 0 && (
              <div style={{ padding:"28px 16px", textAlign:"center", color:C.dim, fontSize:11, fontStyle:"italic" }}>Search or paste items to begin</div>
            )}
            {orders.map(o => {
              const p = productById[o.productId];
              if (!p) return null;
              return (
                <div key={o.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 16px", borderBottom:`1px solid ${C.borderSub}` }}>
                  <div style={{ flex:1, fontSize:11, color:C.cream, lineHeight:1.3 }}>{p.name}</div>
                  <input type="number" min="1" value={o.qty}
                    onChange={e => { const n=parseInt(e.target.value); if(n>0) setOrders(prev=>prev.map(x=>x.id===o.id?{...x,qty:n}:x)); }}
                    style={{ ...mono, width:40, padding:"2px 4px", background:C.surfaceHi, border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.amber, fontSize:11, outline:"none", textAlign:"center" }} />
                  <div style={{ ...mono, fontSize:10, color:C.dim, minWidth:38, textAlign:"right" }}>{formatWt(p.lbs*o.qty, units)}</div>
                  <button onClick={() => setOrders(prev=>prev.filter(x=>x.id!==o.id))} style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:14, lineHeight:1, padding:"0 2px" }}>×</button>
                </div>
              );
            })}
          </div>

          {orders.length > 0 && (
            <div style={{ borderTop:`1px solid ${C.border}`, padding:"10px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                <span style={{ color:C.muted }}>{orders.length} items</span>
                <span style={{ ...mono, color:C.amber }}>{formatWt(grandTotalLbs, units)} total</span>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <button onClick={openEditAsText} style={{ flex:1, padding:"5px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.muted, fontSize:10, cursor:"pointer" }}>
                  Edit as Text
                </button>
                <button onClick={() => setOrders([])} style={{ flex:1, padding:"5px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.dim, fontSize:10, cursor:"pointer" }}>
                  Clear All
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main panel */}
        <main style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
          {plan.length === 0 && (
            <div style={{ padding:"50px 0", textAlign:"center", color:C.dim }}>
              <div style={{ ...serif, fontSize:22, marginBottom:8, color:C.cream }}>No active groups</div>
              <div style={{ fontSize:12 }}>Enable roast groups in <strong style={{ color:C.muted }}>⚙ Manage Catalog → Roast Groups</strong></div>
            </div>
          )}
          {plan.length > 0 && plan.every(g => g.calc.totalLbs === 0 && !leftovers[g.id]) && (
            <div style={{ padding:"60px 0", textAlign:"center", color:C.dim }}>
              <div style={{ ...serif, fontSize:26, marginBottom:8, color:C.cream }}>No orders yet</div>
              <div style={{ fontSize:12 }}>Add items in the left panel to build your roast plan.</div>
            </div>
          )}

          {/* Batch Summary */}
          {roastNeeded.length > 0 && (() => {
            const byBatch = {};
            roastNeeded.forEach(g => {
              const key = g.batch;
              if (!byBatch[key]) byBatch[key] = { groups: [], totalBatches: 0, batchWeight: g.calc.batchWeight };
              byBatch[key].groups.push(g);
              byBatch[key].totalBatches += g.calc.batchesUp;
            });
            const totalBatches  = roastNeeded.reduce((s, g) => s + g.calc.batchesUp, 0);
            const totalOrdered  = plan.reduce((s, g) => s + g.calc.totalLbs, 0);
            const totalGreen    = roastNeeded.reduce((s, g) => s + g.calc.batchesUp * g.calc.batchWeight, 0);
            return (
              <div style={{ marginBottom:16, background:C.surface, border:`1px solid ${C.terra}44`, borderRadius:8, overflow:"hidden" }}>
                <div style={{ background:C.surfaceHi, borderBottom:`1px solid ${C.terra}44`, padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ ...serif, fontSize:12, color:C.amber, letterSpacing:"0.04em" }}>Today's Roast Summary</span>
                  <div style={{ display:"flex", gap:24, alignItems:"flex-end" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>Roasted Coffee Ordered</div>
                      <div style={{ ...mono, fontSize:13, color:C.amber }}>{formatWt(totalOrdered, units)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>Green Needed</div>
                      <div style={{ ...mono, fontSize:13, color:C.amber }}>{formatWt(totalGreen, units)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>Total Batches</div>
                      <div style={{ ...mono, fontSize:22, color:C.terra, lineHeight:1 }}>{totalBatches}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding:"10px 0", display:"flex", flexWrap:"wrap" }}>
                  {Object.entries(byBatch).map(([batchType, info], i) => (
                    <div key={batchType} style={{
                      flex:1, minWidth:160, padding:"6px 20px",
                      borderLeft: i > 0 ? `1px solid ${C.borderSub}` : "none",
                    }}>
                      <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>
                        {BATCH_MAP[batchType]?.label.split(" (")[0]} ({formatWt(info.batchWeight, units)}/batch)
                      </div>
                      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8 }}>
                        <span style={{ ...mono, fontSize:28, color:C.terra, lineHeight:1 }}>{info.totalBatches}</span>
                        <span style={{ fontSize:10, color:C.muted }}>batch{info.totalBatches !== 1 ? "es" : ""}</span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {info.groups.map(g => (
                          <div key={g.id} style={{ display:"flex", justifyContent:"space-between", fontSize:10 }}>
                            <span style={{ color:C.muted }}>{g.label}</span>
                            <span style={{ ...mono, color:C.amber }}>
                              {g.calc.batchesUp} <span style={{ color:C.dim }}>({formatWt(g.calc.batchesUp * g.calc.batchWeight, units, 1)} green)</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(310px, 1fr))", gap:12 }}>
            {plan.map(g => {
              const { calc } = g;
              const needsRoast = calc.needed > 0;
              const hasActivity = calc.totalLbs > 0 || (leftovers[g.id] ?? 0) > 0;
              const accent = needsRoast ? C.terra : hasActivity ? C.green : C.borderSub;
              const headerBg = needsRoast ? C.surfaceHi : hasActivity ? C.greenDim : C.surfaceHi;
              const headerColor = needsRoast ? C.amber : hasActivity ? C.green : C.muted;

              return (
                <div key={g.id} style={{ background:C.surface, border:`1px solid ${accent}${hasActivity ? "40" : "80"}`, borderRadius:7, overflow:"hidden" }}>
                  <div style={{ background:headerBg, borderBottom:`1px solid ${accent}40`, padding:"9px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <span style={{ ...serif, fontSize:13, color:headerColor }}>{g.label}</span>
                      <span style={{ ...mono, fontSize:8, color: g.type === "blend" ? C.terra+"99" : C.amber+"66", marginLeft:7, letterSpacing:"0.08em" }}>
                        {g.type === "blend" ? "BLEND" : "SO"}
                      </span>
                    </div>
                    <span style={{ ...mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:accent }}>
                      {needsRoast ? "● ROAST" : hasActivity ? "✓ COVERED" : ""}
                    </span>
                  </div>

                  {/* Component breakdown — blends only */}
                  {(() => {
                    if (g.type !== "blend") return null;
                    const comps = (g.components || []).filter(c => c.name);
                    if (!comps.length) return null;
                    return (
                      <div style={{ padding:"5px 14px 6px", borderBottom:`1px solid ${C.borderSub}`, display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
                        {comps.map((c, i) => (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 7px", background:C.surfaceHi, border:`1px solid ${C.borderSub}`, borderRadius:3 }}>
                            <span style={{ fontSize:10, color:C.muted }}>{c.name}</span>
                            {c.pct > 0 && <span style={{ ...mono, fontSize:9, color:C.dim }}>{c.pct}%</span>}
                          </div>
                        ))}
                        {g.type === "blend" && needsRoast && (g.components||[]).filter(c => c.name && c.pct > 0).length > 0 && (() => {
                          const greenNeeded = g.calc.batchesUp * g.calc.batchWeight;
                          return (g.components||[]).filter(c => c.name && c.pct > 0).map((c, i) => (
                            <div key={"lb"+i} style={{ ...mono, fontSize:9, color:C.dim, padding:"2px 6px", background:C.bg, border:`1px solid ${C.borderSub}`, borderRadius:3 }}>
                              {c.name.split(" ")[0]}: <span style={{ color:C.amber }}>{formatWt(greenNeeded * c.pct / 100, units)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    );
                  })()}

                  {calc.items.length > 0 && (() => {
                    const open = !!expandedItems[g.id];
                    return (
                      <div style={{ borderBottom:`1px solid ${C.borderSub}` }}>
                        <div onClick={() => setExpandedItems(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 14px", cursor:"pointer", userSelect:"none" }}>
                          <span style={{ fontSize:9, color:C.dim }}>{open ? "▾" : "▸"}</span>
                          <span style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>{calc.items.length} SKU{calc.items.length !== 1 ? "s" : ""}</span>
                        </div>
                        {open && calc.items.map(item => (
                          <div key={item.id} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"3px 14px", borderTop:`1px solid ${C.borderSub}` }}>
                            <span style={{ color:C.muted }}>{item.name}</span>
                            <span style={{ ...mono, color:C.amber }}>×{item.totalQty} <span style={{ color:C.dim }}>({formatWt(item.totalLbs, units)})</span></span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div style={{ padding:"10px 14px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                      <div>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Ordered</div>
                        <div style={{ ...mono, fontSize:13, color: calc.totalLbs > 0 ? C.amber : C.dim }}>{formatWt(calc.totalLbs, units)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Leftover</div>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <input type="number" step="0.1" min="0" value={leftovers[g.id] ?? 0}
                            onChange={e => setLeftovers(prev => ({ ...prev, [g.id]: parseFloat(e.target.value)||0 }))}
                            style={{ ...mono, width:62, padding:"3px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4, color:C.amber, fontSize:12, outline:"none" }} />
                          <span style={{ fontSize:10, color:C.dim }}>lb</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Needed</div>
                        <div style={{ ...mono, fontSize:13, color: needsRoast ? C.terra : C.dim }}>
                          {needsRoast ? formatWt(calc.needed, units) : "—"}
                        </div>
                        {needsRoast && calc.roastLossPct > 0 && (
                          <div style={{ fontSize:9, color:C.dim, marginTop:2 }}>green ({calc.roastLossPct}% loss)</div>
                        )}
                      </div>
                    </div>

                    {needsRoast && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.borderSub}`, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                        <div>
                          <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>
                            Batches <span style={{ color:C.cream }}>({formatWt(calc.batchWeight, units)} green/batch)</span>
                          </div>
                          <div style={{ ...mono, fontSize:15, color:C.amber, marginTop:4 }}>{calc.batches.toFixed(4)}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>Round Up</div>
                          <div style={{ ...mono, fontSize:32, color:C.terra, lineHeight:1, marginTop:2 }}>{calc.batchesUp}</div>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const lo = leftovers[g.id] ?? 0;
                      const roastedOutput = calc.batchesUp * calc.batchWeight * calc.roastFactor;
                      const predicted = needsRoast
                        ? lo + roastedOutput - calc.totalLbs
                        : lo - calc.totalLbs;
                      const hasAny = calc.totalLbs > 0 || lo > 0;
                      if (!hasAny) return null;
                      return (
                        <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${C.borderSub}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>Predicted Leftover</div>
                          <div style={{ ...mono, fontSize:14, color: predicted >= 0 ? C.green : C.terra }}>
                            {predicted >= 0 ? formatWt(predicted, units) : "−" + formatWt(Math.abs(predicted), units)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {showCatalog && (
        <CatalogManager
          groups={groups}
          products={products}
          batchOverrides={batchOverrides}
          units={units}
          onUpdateGroups={setGroups}
          onUpdateProducts={setProducts}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {showSettings && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:440, display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ ...serif, fontSize:15, color:C.amber }}>Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:"18px" }}>
              {/* Units */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Weight Units</div>
                <div style={{ display:"flex", borderRadius:5, overflow:"hidden", border:`1px solid ${C.border}`, width:"fit-content" }}>
                  {[["lbs","lbs"],["kg","kg"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setUnits(val)} style={{
                      padding:"7px 22px", border:"none", cursor:"pointer",
                      background: units === val ? C.amber : "transparent",
                      color: units === val ? C.bg : C.muted,
                      fontFamily:"'Roboto Mono', monospace", fontWeight: units === val ? 700 : 400, fontSize:13,
                    }}>{lbl}</button>
                  ))}
                </div>
                <div style={{ fontSize:10, color:C.dim, marginTop:6 }}>
                  Applies to all weight displays across the app.
                </div>
              </div>

              <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>Batch Sizes ({units === "kg" ? "kg" : "lbs"} green per batch)</div>
              {BATCH_TYPES.map(b => (
                <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.borderSub}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:C.cream }}>{b.label.split(" (")[0]}</div>
                    <div style={{ fontSize:10, color:C.dim, marginTop:2 }}>Default: {formatWt(b.weight, units)}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <input type="number" step="0.1" min="1" max="200"
                      value={units === "kg"
                        ? +((batchOverrides[b.id] ?? b.weight) * LB_TO_KG).toFixed(3)
                        : (batchOverrides[b.id] ?? b.weight)}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        const lbsVal = units === "kg" ? v / LB_TO_KG : v;
                        setBatchOverrides(prev => ({ ...prev, [b.id]: isNaN(lbsVal) ? b.weight : +lbsVal.toFixed(4) }));
                      }}
                      style={{ ...mono, width:72, padding:"5px 8px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:4, color:C.amber, fontSize:13, outline:"none", textAlign:"center" }} />
                    <span style={{ fontSize:11, color:C.dim }}>{units}</span>
                  </div>
                  <button onClick={() => setBatchOverrides(prev => { const n={...prev}; delete n[b.id]; return n; })}
                    style={{ fontSize:10, color:C.dim, background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, padding:"4px 8px", cursor:"pointer" }}>
                    Reset
                  </button>
                </div>
              ))}
              <div style={{ marginTop:14, fontSize:10, color:C.dim, lineHeight:1.5 }}>
                Changes apply immediately to all batch calculations. Reset restores factory defaults.
              </div>
            </div>
          </div>
        </div>
      )}


      {showReports && (
        <ReportsModal
          savedSummaries={savedSummaries}
          units={units}
          onClose={() => setShowReports(false)}
        />
      )}

      {pendingImport && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:400, padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,0.7)", display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <span style={{ fontSize:22, lineHeight:1 }}>⚠️</span>
              <div>
                <div style={{ ...serif, fontSize:14, color:C.amber, marginBottom:4 }}>Duplicate CSV Detected</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>
                  <strong style={{ color:C.cream }}>{pendingImport.label}</strong> appears to have already been imported.
                  Adding it again will increase quantities for {pendingImport.incoming.length} SKU{pendingImport.incoming.length !== 1 ? "s" : ""}.
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => commitImport(pendingImport.incoming, pendingImport.unmatched, pendingImport.hash, pendingImport.errorMsg)}
                style={{ flex:1, padding:"8px", background:C.black, border:"none", borderRadius:5, color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
                Add Anyway
              </button>
              <button
                onClick={() => { setPendingImport(null); setCsvError("Import cancelled — duplicate file."); }}
                style={{ flex:1, padding:"8px", background:"none", border:`1px solid ${C.border}`, borderRadius:5, color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
                Ignore
              </button>
            </div>
          </div>
        </div>
      )}

      {showPickList && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={e => e.target === e.currentTarget && setShowPickList(false)}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:680, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>

            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ ...serif, fontSize:15, color:C.amber }}>Pick List</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{formatDate(productionDate)}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {/* View toggle */}

                <div style={{ display:"flex", borderRadius:4, overflow:"hidden", border:`1px solid ${C.border}` }}>
                  {[["product","Product"],["size","Size"]].map(([f,lbl]) => (
                    <button key={f} onClick={() => setPickSort(s => ({ field:f, dir: s.field===f ? (s.dir==="asc" ? "desc" : "asc") : "asc" })) } style={{
                      padding:"4px 10px", fontSize:10, border:"none", cursor:"pointer",
                      background: pickSort.field === f ? C.sage : "transparent",
                      color: pickSort.field === f ? "#fff" : C.dim,
                      fontFamily:"'Roboto Mono', monospace",
                    }}>{lbl} {pickSort.field===f ? (pickSort.dir==="asc" ? "↑" : "↓") : ""}</button>
                  ))}
                </div>
                <button onClick={printPickList} style={{ padding:"5px 12px", background:"none", border:`1px solid ${C.border}`, borderRadius:4, color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>Print</button>
                <button onClick={() => setShowPickList(false)} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
            </div>

            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

              {/* Package Size Summary */}
              <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background:C.surfaceHi }}>
                <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Package Size Summary</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {pickList.bySizeAll.map(s => (
                    <div key={s.size} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, minWidth:120 }}>
                      <div>
                        <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.size}</div>
                        <div style={{ ...mono, fontSize:18, color:C.amber, lineHeight:1, marginTop:2 }}>{s.qty}</div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding:"14px 20px" }}>
                <>
                    <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>All Items by Roast Group</div>
                    {pickList.byGroup.map((g) => (
                      <div key={g.id} style={{ marginBottom:16 }}>
                        <div style={{ fontSize:10, color:C.amber, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, paddingBottom:4, borderBottom:`1px solid ${C.border}` }}>{g.label}</div>
                        {[...g.items].sort((a,b) => {
                            const dir = pickSort.dir === "asc" ? 1 : -1;
                            return pickSort.field === "size" ? (a.lbs - b.lbs)*dir : a.name.localeCompare(b.name)*dir;
                          }).map((item, ii) => (
                          <div key={ii} style={{ display:"flex", alignItems:"center", gap:12, padding:"5px 0", borderBottom:`1px solid ${C.borderSub}` }}>
                            <div style={{ width:16, height:16, border:`1px solid ${C.dim}`, borderRadius:3, flexShrink:0 }} />
                            <div style={{ flex:1, fontSize:12, color:C.cream }}>{item.name}</div>
                            <div style={{ ...mono, fontSize:13, color:C.amber, minWidth:28, textAlign:"right" }}>×{item.qty}</div>
                            <div style={{ ...mono, fontSize:10, color:C.dim, minWidth:60, textAlign:"right" }}>{formatWt(item.totalLbs, units)}</div>
                          </div>
                        ))}
                        <div style={{ display:"flex", justifyContent:"flex-end", padding:"4px 0", fontSize:10, color:C.dim }}>
                          <span style={{ ...mono, color:C.muted }}>{formatWt(g.items.reduce((s, i) => s + i.totalLbs, 0), units)}</span>
                        </div>
                      </div>
                    ))}
                  </>

                <div style={{ marginTop:8, paddingTop:12, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:C.muted }}>
                    {orders.reduce((s, o) => s + o.qty, 0)} units across {orders.length} products
                  </span>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>Total Ordered</div>
                    <div style={{ ...mono, fontSize:16, color:C.amber }}>{formatWt(grandTotalLbs, units)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchSummary && (() => {
        const totalBatches = roastNeeded.reduce((s, g) => s + g.calc.batchesUp, 0);
        const totalOrdered = plan.reduce((s, g) => s + g.calc.totalLbs, 0);
        const totalGreen   = roastNeeded.reduce((s, g) => s + g.calc.batchesUp * g.calc.batchWeight, 0);

        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
            onClick={e => e.target === e.currentTarget && setShowBatchSummary(false)}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:640, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>

              <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ ...serif, fontSize:15, color:C.amber }}>Batch Summary</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{formatDate(productionDate)}</div>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <button onClick={() => window.print()} style={{ padding:"5px 12px", background:"none", border:`1px solid ${C.border}`, borderRadius:4, color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>Print</button>
                  <button onClick={() => setShowBatchSummary(false)} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
                </div>
              </div>

              {/* Top stats */}
              <div style={{ padding:"12px 0", borderBottom:`1px solid ${C.border}`, background:C.surfaceHi, display:"flex" }}>
                {[
                  { label:"Roasted Coffee Ordered", value: formatWt(totalOrdered, units) },
                  { label:"Total Green Needed",     value: formatWt(totalGreen, units) },
                  { label:"Total Batches",          value: String(totalBatches), big:true },
                ].map((s, i) => (
                  <div key={i} style={{ flex:1, padding:"4px 24px", borderLeft: i > 0 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{s.label}</div>
                    <div style={{ ...mono, fontSize: s.big ? 28 : 15, color: s.big ? C.terra : C.amber, lineHeight:1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ flex:1, overflowY:"auto" }}>
                <div style={{ padding:"10px 20px 0" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 64px 100px 100px 100px", padding:"5px 0", borderBottom:`1px solid ${C.border}`, fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", gap:8 }}>
                    <span>Roast Group</span>
                    <span style={{ textAlign:"right" }}>Batches</span>
                    <span style={{ textAlign:"right" }}>Green Needed</span>
                    <span style={{ textAlign:"right" }}>Ordered</span>
                    <span style={{ textAlign:"right" }}>Pred. Leftover</span>
                  </div>
                </div>

                {[
                  { label:"Needs Roasting",      items: roastNeeded },
                  { label:"Covered by Stock",    items: plan.filter(g => g.calc.totalLbs > 0 && g.calc.neededRoasted === 0) },
                ].map(section => section.items.length === 0 ? null : (
                  <div key={section.label} style={{ padding:"0 20px" }}>
                    <div style={{ fontSize:9, color:C.amber, textTransform:"uppercase", letterSpacing:"0.1em", margin:"10px 0 4px" }}>{section.label}</div>
                    {section.items.map(g => {
                      const lo = leftovers[g.id] ?? 0;
                      const roastedOutput = g.calc.batchesUp * g.calc.batchWeight * g.calc.roastFactor;
                      const predicted = g.calc.needed > 0
                        ? lo + roastedOutput - g.calc.totalLbs
                        : lo - g.calc.totalLbs;
                      return (
                        <div key={g.id} style={{ display:"grid", gridTemplateColumns:"1fr 64px 100px 100px 100px", gap:8, padding:"7px 0", borderBottom:`1px solid ${C.borderSub}`, alignItems:"center" }}>
                          <div>
                            <span style={{ fontSize:12, color:C.cream }}>{g.label}</span>
                            <span style={{ ...mono, fontSize:9, color:C.dim, marginLeft:8 }}>{g.tag}</span>
                          </div>
                          <div style={{ ...mono, fontSize:15, color: g.calc.batchesUp > 0 ? C.terra : C.dim, textAlign:"right" }}>
                            {g.calc.batchesUp > 0 ? g.calc.batchesUp : "—"}
                          </div>
                          <div style={{ ...mono, fontSize:11, color:C.amber, textAlign:"right" }}>
                            {g.calc.needed > 0 ? formatWt(g.calc.needed, units) : "—"}
                          </div>
                          <div style={{ ...mono, fontSize:11, color:C.muted, textAlign:"right" }}>
                            {formatWt(g.calc.totalLbs, units)}
                          </div>
                          <div style={{ ...mono, fontSize:11, color: predicted >= 0 ? C.green : C.terra, textAlign:"right" }}>
                            {predicted >= 0 ? formatWt(predicted, units) : "−"+formatWt(Math.abs(predicted), units)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div style={{ padding:"8px 20px 16px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 64px 100px 100px 100px", gap:8, padding:"8px 0", borderTop:`1px solid ${C.border}`, alignItems:"center" }}>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:700 }}>Total</div>
                    <div style={{ ...mono, fontSize:16, color:C.terra, textAlign:"right" }}>{totalBatches}</div>
                    <div style={{ ...mono, fontSize:11, color:C.amber, textAlign:"right" }}>{formatWt(totalGreen, units)}</div>
                    <div style={{ ...mono, fontSize:11, color:C.muted, textAlign:"right" }}>{formatWt(totalOrdered, units)}</div>
                    <div />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {visibleUnmatched.length > 0 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000 }}
          onClick={e => e.target === e.currentTarget && (setCsvUnmatched([]), setAddingSkus({}))}>
          <div style={{ background:C.surface, border:`1px solid ${C.terra}`, borderRadius:8, width:480, maxHeight:"70vh", display:"flex", flexDirection:"column", boxShadow:"0 16px 48px rgba(0,0,0,0.7)" }}>
            <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ ...serif, fontSize:13, color:C.terra }}>Unmatched SKUs</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{visibleUnmatched.length} SKU{visibleUnmatched.length !== 1 ? "s" : ""} not found in catalog — add them below</div>
              </div>
              <button onClick={() => { setCsvUnmatched([]); setAddingSkus({}); }} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
              {visibleUnmatched.map((sku, i) => {
                const adding = addingSkus[sku.name];
                return (
                  <div key={i} style={{ padding:"8px 18px", borderBottom:`1px solid ${C.borderSub}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:C.black, flexShrink:0 }} />
                      <span style={{ ...mono, fontSize:11, color:C.cream, flex:1 }}>{sku.name}</span>
                      {sku.qty > 0 && <span style={{ ...mono, fontSize:9, color:C.dim }}>qty {sku.qty}</span>}
                      {!adding && (
                        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                          <button onClick={() => startAddSku(sku.name)}
                            style={{ fontSize:9, padding:"2px 8px", background:"none", border:`1px solid ${C.amber}`, borderRadius:3, color:C.amber, cursor:"pointer" }}>
                            + Add to catalog
                          </button>
                          <button onClick={() => ignoreSku(sku.name)}
                            title="Never show this SKU again"
                            style={{ fontSize:9, padding:"2px 8px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer" }}>
                            ignore
                          </button>
                        </div>
                      )}
                    </div>
                    {adding && (
                      <div style={{ marginTop:8, marginLeft:16, display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                          <input
                            type="number" placeholder="lbs" value={adding.lbs} min="0" step="0.0001"
                            onChange={e => setAddingSkus(prev => ({ ...prev, [sku.name]: { ...prev[sku.name], lbs: e.target.value } }))}
                            style={{ width:72, padding:"4px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.cream, fontSize:11, fontFamily:"'Roboto Mono', monospace" }}
                          />
                          <span style={{ fontSize:9, color:C.dim }}>lbs</span>
                          {!adding.addingGroup
                            ? <>
                                <select value={adding.group}
                                  onChange={e => setAddingSkus(prev => ({ ...prev, [sku.name]: { ...prev[sku.name], group: e.target.value } }))}
                                  style={{ flex:1, minWidth:0, padding:"4px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.cream, fontSize:11, fontFamily:"'Roboto Mono', monospace" }}>
                                  {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.label}</option>
                                  ))}
                                </select>
                                <button onClick={() => setAddingSkus(prev => ({ ...prev, [sku.name]: { ...prev[sku.name], addingGroup: true, newGroup: { label:"", tag:"", batch:"standard" } } }))}
                                  style={{ fontSize:9, padding:"2px 7px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer", whiteSpace:"nowrap" }}>
                                  + group
                                </button>
                              </>
                            : <span style={{ fontSize:9, color:C.amber, flex:1 }}>New group ↓</span>
                          }
                          <button onClick={() => confirmAddSku(sku)}
                            disabled={adding.addingGroup}
                            title={adding.addingGroup ? "Create the group first" : "Add product to catalog"}
                            style={{ padding:"4px 10px", background: adding.addingGroup ? C.dim : C.black, border:"none", borderRadius:3, color:"#fff", fontSize:10, cursor: adding.addingGroup ? "not-allowed" : "pointer", opacity: adding.addingGroup ? 0.5 : 1 }}>✓</button>
                          <button onClick={() => cancelAddSku(sku.name)}
                            style={{ padding:"4px 8px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.muted, fontSize:10, cursor:"pointer" }}>×</button>
                        </div>
                        {adding.addingGroup && (() => {
                          const ng = adding.newGroup;
                          const upd = (patch) => setAddingSkus(prev => ({ ...prev, [sku.name]: { ...prev[sku.name], newGroup: { ...prev[sku.name].newGroup, ...patch } } }));
                          return (
                            <div style={{ display:"flex", flexDirection:"column", gap:5, paddingLeft:8, paddingTop:6, paddingBottom:4, borderLeft:`2px solid ${C.amber}` }}>
                              {/* Row 1: name + type toggle + batch + buttons */}
                              <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
                                <input autoFocus placeholder="Group name" value={ng.label}
                                  onKeyDown={e => e.key === "Enter" && commitNewGroup(sku.name)}
                                  onChange={e => upd({ label: e.target.value })}
                                  style={{ flex:2, minWidth:100, padding:"4px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.cream, fontSize:11, fontFamily:"'Roboto Mono', monospace" }}
                                />
                                <div style={{ display:"flex", borderRadius:3, overflow:"hidden", border:`1px solid ${C.border}`, flexShrink:0 }}>
                                  {["blend","single_origin"].map(t => (
                                    <button key={t} onClick={() => upd({ type: t, components: t==="blend" ? [{ id:Date.now()+"", name:"" }] : [] })}
                                      style={{ padding:"3px 8px", background: ng.type===t ? C.amber : C.surfaceHi, border:"none", color: ng.type===t ? "#fff" : C.dim, fontSize:9, cursor:"pointer", fontFamily:"'Roboto Mono', monospace" }}>
                                      {t === "blend" ? "Blend" : "Single Origin"}
                                    </button>
                                  ))}
                                </div>
                                <select value={ng.batch} onChange={e => upd({ batch: e.target.value })}
                                  style={{ padding:"4px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.cream, fontSize:11, fontFamily:"'Roboto Mono', monospace" }}>
                                  <option value="standard">Standard</option>
                                  <option value="dark">Dark</option>
                                  <option value="decaf">Decaf</option>
                                  <option value="small">Small</option>
                                </select>
                                <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                                  <input type="number" min="0" max="50" step="0.1" placeholder="0" value={ng.roastLoss ?? ""}
                                    onChange={e => upd({ roastLoss: e.target.value })}
                                    style={{ width:44, padding:"3px 5px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.amber, fontSize:10, fontFamily:"'Roboto Mono', monospace", textAlign:"center" }} />
                                  <span style={{ fontSize:9, color:C.dim, whiteSpace:"nowrap" }}>% loss</span>
                                </div>
                                <button onClick={() => commitNewGroup(sku.name)}
                                  style={{ padding:"3px 10px", background:C.black, border:"none", borderRadius:3, color:"#fff", fontSize:10, cursor:"pointer", whiteSpace:"nowrap" }}>
                                  Create group
                                </button>
                                <button onClick={() => setAddingSkus(prev => ({ ...prev, [sku.name]: { ...prev[sku.name], addingGroup: false } }))}
                                  style={{ fontSize:9, padding:"2px 6px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.muted, cursor:"pointer" }}>×</button>
                              </div>
                              {/* Row 2: blend components (only for blend type) */}
                              {ng.type === "blend" && (() => {
                                const batchWt = batchOverrides[ng.batch] ?? (BATCH_MAP[ng.batch]?.weight ?? 20.2);
                                const totalPct = (ng.components||[]).reduce((s,c) => s + (parseFloat(c.pct)||0), 0);
                                const pctOk = Math.abs(totalPct - 100) < 0.01;
                                return (
                                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                    {/* header row */}
                                    <div style={{ display:"grid", gridTemplateColumns:"1fr 56px 52px 18px", gap:4, alignItems:"center" }}>
                                      <span style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.07em" }}>Component</span>
                                      <span style={{ fontSize:9, color:C.dim, textAlign:"center" }}>%</span>
                                      <span style={{ fontSize:9, color:C.dim, textAlign:"right" }}>lbs</span>
                                      <span />
                                    </div>
                                    {(ng.components || []).map((comp, ci) => {
                                      const pct = parseFloat(comp.pct) || 0;
                                      const lbs = (pct / 100) * batchWt;
                                      return (
                                        <div key={comp.id} style={{ display:"grid", gridTemplateColumns:"1fr 56px 52px 18px", gap:4, alignItems:"center" }}>
                                          <input placeholder={`Component ${ci+1}`} value={comp.name}
                                            onChange={e => upd({ components: ng.components.map((c,i) => i===ci ? { ...c, name: e.target.value } : c) })}
                                            style={{ padding:"3px 6px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.cream, fontSize:10, fontFamily:"'Roboto Mono', monospace" }}
                                          />
                                          <input type="number" min="0" max="100" step="0.1" placeholder="%" value={comp.pct ?? ""}
                                            onChange={e => upd({ components: ng.components.map((c,i) => i===ci ? { ...c, pct: e.target.value } : c) })}
                                            style={{ padding:"3px 5px", background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:3, color:C.amber, fontSize:10, fontFamily:"'Roboto Mono', monospace", textAlign:"center" }}
                                          />
                                          <span style={{ ...mono, fontSize:10, color:C.dim, textAlign:"right" }}>
                                            {pct > 0 ? lbs.toFixed(2) : "—"}
                                          </span>
                                          {ng.components.length > 1
                                            ? <button onClick={() => upd({ components: ng.components.filter((_,i) => i!==ci) })}
                                                style={{ fontSize:9, padding:"1px 4px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer" }}>×</button>
                                            : <span />
                                          }
                                        </div>
                                      );
                                    })}
                                    {/* totals row */}
                                    <div style={{ display:"grid", gridTemplateColumns:"1fr 56px 52px 18px", gap:4, alignItems:"center", borderTop:`1px solid ${C.borderSub}`, paddingTop:3 }}>
                                      <button onClick={() => upd({ components: [...(ng.components||[]), { id:Date.now()+"", name:"", pct:"" }] })}
                                        style={{ justifySelf:"start", fontSize:9, padding:"2px 7px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer" }}>
                                        + add
                                      </button>
                                      <span style={{ ...mono, fontSize:10, color: pctOk ? C.green : totalPct > 0 ? C.terra : C.dim, textAlign:"center" }}>
                                        {totalPct > 0 ? `${totalPct}%` : ""}
                                      </span>
                                      <span style={{ ...mono, fontSize:10, color:C.muted, textAlign:"right" }}>
                                        {totalPct > 0 ? ((totalPct/100)*batchWt).toFixed(2) : "—"}
                                      </span>
                                      <span />
                                    </div>
                                  </div>
                                );
                              })()}
                              {adding.newGroupError && (
                                <div style={{ fontSize:9, color:C.terra }}>{adding.newGroupError}</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding:"10px 18px", borderTop:`1px solid ${C.border}` }}>
              {ignoredSkus.length > 0 && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:9, color:C.dim, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Ignored SKUs ({ignoredSkus.length})
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:80, overflowY:"auto" }}>
                    {ignoredSkus.map((name, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ ...mono, fontSize:10, color:C.dim, flex:1 }}>{name}</span>
                        <button onClick={() => setIgnoredSkus(prev => prev.filter(s => s !== name))}
                          title="Unignore" style={{ fontSize:9, padding:"1px 6px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:3, color:C.dim, cursor:"pointer" }}>
                          unignore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setCsvUnmatched([]); setAddingSkus({}); }}
                style={{ width:"100%", padding:"6px", background:"none", border:`1px solid ${C.borderSub}`, borderRadius:4, color:C.muted, fontSize:11, cursor:"pointer" }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

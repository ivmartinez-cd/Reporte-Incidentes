// Auditoría de contraste WCAG 2.1 para las paletas de tema (dark / light).
// AA: texto normal >= 4.5, texto grande / componentes UI >= 3.0.
// Uso: node scripts/contrast-audit.mjs

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}

function lin(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  DARK: {
    text: "#eef0f8",
    "text-soft": "#bcc1d8",
    "text-muted": "#939ab6",
    "chart-axis": "#939ab6",
    surface: "#363955",
    "surface-2": "#424565",
    "bg-base": "#2c2f47",
    primary: "#0275d8",
    accent: "#f0a400",
    onPrimary: "#ffffff",
    onAccent: "#1a1200",
  },
  LIGHT: {
    text: "#363955",
    "text-soft": "#4c5578",
    "text-muted": "#69739a",
    "chart-axis": "#69739a",
    surface: "#ffffff",
    "surface-2": "#fcfcf2",
    "bg-base": "#f5f6e6",
    primary: "#0163b8",
    accent: "#f0a400",
    onPrimary: "#ffffff",
    onAccent: "#1a1200",
  },
};

// [foreground, background, umbral, etiqueta]
const checks = (t) => [
  [t.text, t.surface, 4.5, "texto principal / card"],
  [t.text, t["bg-base"], 4.5, "texto principal / fondo"],
  [t["text-soft"], t.surface, 4.5, "texto soft / card"],
  [t["text-soft"], t["bg-base"], 4.5, "texto soft / fondo"],
  [t["text-muted"], t.surface, 3.0, "texto muted / card"],
  [t["text-muted"], t["surface-2"], 3.0, "texto muted / surface-2"],
  [t["text-muted"], t["bg-base"], 3.0, "texto muted / fondo"],
  [t["chart-axis"], t.surface, 3.0, "ejes de gráfico / card"],
  [t.onPrimary, t.primary, 3.0, "label botón primario"],
  [t.onAccent, t.accent, 3.0, "label botón acento"],
];

let failures = 0;
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n=== ${name} ===`);
  for (const [fg, bg, min, label] of checks(t)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)} (min ${min})  ${label}  [${fg} / ${bg}]`,
    );
  }
}

console.log(`\n${failures === 0 ? "✅ TODO OK" : `❌ ${failures} fallo(s)`}`);
process.exit(failures === 0 ? 0 : 1);

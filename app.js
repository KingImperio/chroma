(() => {
  "use strict";

  const HARMONIES = ["complementary", "analogous", "triadic", "split-complementary", "monochromatic"];

  const NAME_RULES = [
    { hueMin: 0,   hueMax: 15,  base: "Crimson" },
    { hueMin: 15,  hueMax: 30,  base: "Coral" },
    { hueMin: 30,  hueMax: 45,  base: "Tangerine" },
    { hueMin: 45,  hueMax: 55,  base: "Amber" },
    { hueMin: 55,  hueMax: 70,  base: "Mustard" },
    { hueMin: 70,  hueMax: 95,  base: "Olive" },
    { hueMin: 95,  hueMax: 135, base: "Forest" },
    { hueMin: 135, hueMax: 165, base: "Sage" },
    { hueMin: 165, hueMax: 185, base: "Teal" },
    { hueMin: 185, hueMax: 205, base: "Cyan" },
    { hueMin: 205, hueMax: 225, base: "Azure" },
    { hueMin: 225, hueMax: 250, base: "Cobalt" },
    { hueMin: 250, hueMax: 270, base: "Indigo" },
    { hueMin: 270, hueMax: 290, base: "Violet" },
    { hueMin: 290, hueMax: 315, base: "Magenta" },
    { hueMin: 315, hueMax: 335, base: "Fuchsia" },
    { hueMin: 335, hueMax: 360, base: "Rose" }
  ];

  const els = {
    hexInput: document.getElementById("hex-input"),
    hexRow: document.querySelector(".hex-row"),
    hexError: document.getElementById("hex-error"),
    hexSwatch: document.getElementById("hex-swatch"),
    harmony: document.getElementById("harmony-select"),
    generateBtn: document.getElementById("generate-btn"),
    randomBtn: document.getElementById("random-btn"),
    controls: document.getElementById("controls"),
    swatches: document.getElementById("swatches"),
    paletteSub: document.getElementById("palette-sub"),
    codeContent: document.getElementById("code-content"),
    codeBlock: document.getElementById("code-block"),
    copyAllBtn: document.getElementById("copy-all-btn"),
    picker: document.getElementById("picker"),
    pickerArea: document.getElementById("picker-area"),
    pickerCursor: document.getElementById("picker-cursor"),
    hueTrack: document.getElementById("hue-track"),
    hueThumb: document.getElementById("hue-thumb"),
    pickerReadout: document.getElementById("picker-readout"),
    pickerClose: document.getElementById("picker-close")
  };

  const state = {
    baseHex: "#3B82F6",
    harmony: "monochromatic",
    palette: [],
    pickerOpen: false,
    pickerHue: 217,
    pickerSat: 1,
    pickerLight: 0.5
  };

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function normalizeHex(input) {
    if (input == null) return null;
    let s = String(input).trim().replace(/^#/, "").toUpperCase();
    s = s.replace(/[^0-9A-F]/g, "");
    if (s.length === 3) {
      s = s.split("").map(c => c + c).join("");
    }
    if (s.length !== 6) return null;
    if (!/^[0-9A-F]{6}$/.test(s)) return null;
    return "#" + s;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  }

  function rgbToHex(r, g, b) {
    const toHex = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0").toUpperCase();
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  function rgbToHsl(r, g, b) {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
        case gf: h = (bf - rf) / d + 2; break;
        case bf: h = (rf - gf) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hp < 1)      { r1 = c; g1 = x; }
    else if (hp < 2) { r1 = x; g1 = c; }
    else if (hp < 3) { g1 = c; b1 = x; }
    else if (hp < 4) { g1 = x; b1 = c; }
    else if (hp < 5) { r1 = x; b1 = c; }
    else             { r1 = c; b1 = x; }
    const m = l - c / 2;
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }

  function relLuminance(r, g, b) {
    const f = c => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(rgb) {
    const L = relLuminance(rgb.r, rgb.g, rgb.b);
    const Lwhite = 1.0, Lblack = 0.0;
    const cWhite = (Lwhite + 0.05) / (L + 0.05);
    const cBlack = (L + 0.05) / (Lblack + 0.05);
    return { white: cWhite, black: cBlack };
  }

  function pickSwatchText(hex) {
    const rgb = hexToRgb(hex);
    const { white, black } = contrastRatio(rgb);
    return white >= black ? "#FFFFFF" : "#1C2128";
  }

  function nameColor(hex) {
    const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
    if (s < 0.10) {
      if (l < 0.18) return "Charcoal";
      if (l < 0.38) return "Slate";
      if (l < 0.62) return "Stone";
      if (l < 0.82) return "Mist";
      return "Snow";
    }
    if (s < 0.25 && l > 0.85) return "Bone";
    if (s < 0.30) {
      const base = pickMutedName(h);
      return l < 0.35 ? `Smoke ${base}` : l > 0.78 ? `Ash ${base}` : base;
    }
    const rule = NAME_RULES.find(r => h >= r.hueMin && h < r.hueMax) || NAME_RULES[0];
    let name = rule.base;
    if (l < 0.28) name = "Deep " + name;
    else if (l < 0.42) name = "Dark " + name;
    else if (l > 0.85) name = "Pale " + name;
    else if (l > 0.72) name = "Soft " + name;
    else if (s > 0.85 && l > 0.4 && l < 0.65) name = "Vivid " + name;
    return name;
  }

  function pickMutedName(h) {
    if (h < 30 || h >= 330) return "Rose";
    if (h < 70) return "Sand";
    if (h < 150) return "Sage";
    if (h < 200) return "Mist";
    if (h < 260) return "Slate";
    if (h < 320) return "Mauve";
    return "Rose";
  }

  function buildPalette(baseHex, mode) {
    const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(baseHex)));
    const safeS = Math.max(s, 0.25);
    const safeL = clamp(l, 0.3, 0.7);

    const out = [];
    const push = (hue, sat, light) => {
      out.push({ hex: hslToHex(hue, sat, light), h: hue, s: sat, l: light });
    };

    switch (mode) {
      case "complementary": {
        const comp = (h + 180) % 360;
        push(h,           safeS,     safeL);
        push(comp,        safeS,     safeL);
        push(h,           safeS,     clamp(safeL - 0.2, 0.15, 0.9));
        push(h,           safeS,     clamp(safeL + 0.18, 0.15, 0.92));
        push(comp,        safeS * 0.9, clamp(safeL + 0.15, 0.15, 0.92));
        break;
      }
      case "analogous": {
        push((h - 60 + 360) % 360, safeS, safeL);
        push((h - 30 + 360) % 360, safeS, safeL);
        push(h,                     safeS, safeL);
        push((h + 30) % 360,        safeS, safeL);
        push((h + 60) % 360,        safeS, safeL);
        break;
      }
      case "triadic": {
        const t1 = (h + 120) % 360;
        const t2 = (h + 240) % 360;
        push(h,  safeS, safeL);
        push(t1, safeS, safeL);
        push(t2, safeS, safeL);
        push(h,  safeS, clamp(safeL + 0.2, 0.15, 0.92));
        push(t1, safeS * 0.85, clamp(safeL - 0.18, 0.15, 0.92));
        break;
      }
      case "split-complementary": {
        const s1 = (h + 150) % 360;
        const s2 = (h + 210) % 360;
        push(h,  safeS, safeL);
        push(s1, safeS, safeL);
        push(s2, safeS, safeL);
        push(h,  safeS, clamp(safeL + 0.2, 0.15, 0.92));
        push(s1, safeS * 0.9, clamp(safeL - 0.2, 0.15, 0.92));
        break;
      }
      case "monochromatic":
      default: {
        const baseS = Math.max(safeS, 0.5);
        push(h, baseS, 0.20);
        push(h, baseS, 0.40);
        push(h, baseS, 0.60);
        push(h, baseS, 0.75);
        push(h, baseS, 0.90);
        break;
      }
    }

    return out.map(c => ({
      hex: c.hex,
      name: nameColor(c.hex)
    }));
  }

  function setAccent(hex) {
    const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
    const accentHex = hslToHex(h, Math.max(s, 0.55), clamp(l, 0.42, 0.58));
    document.documentElement.style.setProperty("--accent", accentHex);
    const lighter = hslToHex(h, Math.max(s * 0.85, 0.45), clamp(l + 0.08, 0.5, 0.65));
    const darker = hslToHex(h, Math.max(s, 0.5), clamp(l - 0.08, 0.32, 0.5));
    document.documentElement.style.setProperty("--accent-hover", lighter);
    document.documentElement.style.setProperty("--accent-active", darker);
    document.documentElement.style.setProperty("--accent-soft", hslToHex(h, Math.max(s * 0.5, 0.2), 0.92));
  }

  function renderSwatches(palette) {
    els.swatches.innerHTML = "";
    const frag = document.createDocumentFragment();
    palette.forEach((c, i) => {
      const text = pickSwatchText(c.hex);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "swatch";
      card.setAttribute("role", "listitem");
      card.dataset.hex = c.hex;
      card.setAttribute("aria-label", `Copy ${c.name}, ${c.hex}`);
      card.style.background = c.hex;
      card.style.setProperty("--swatch-text", text);
      card.style.setProperty("--swatch-bg", c.hex);

      card.innerHTML = `
        <span class="swatch-copy" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2"/>
            <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
          </svg>
        </span>
        <p class="swatch-hex">${c.hex}</p>
        <p class="swatch-name">${c.name}</p>
      `;
      frag.appendChild(card);
    });
    els.swatches.appendChild(frag);
  }

  function renderCodeBlock(palette) {
    const lines = [":root {"];
    palette.forEach((c, i) => {
      const n = String(i + 1).padStart(2, "0");
      lines.push(`  --color-${n}: ${c.hex};`);
    });
    lines.push("}");
    const body = lines.join("\n");
    els.codeContent.innerHTML =
      `<span class="tk-sel">:root</span> {\n` +
      palette.map((c, i) => {
        const n = String(i + 1).padStart(2, "0");
        return `  <span class="tk-prop">--color-${n}</span>: <span class="tk-val">${c.hex}</span>;`;
      }).join("\n") +
      `\n}`;
  }

  function updatePaletteSub(baseHex, mode) {
    const label = mode.replace(/-/g, " ");
    const cap = label.charAt(0).toUpperCase() + label.slice(1);
    els.paletteSub.textContent = `${cap} from ${baseHex}`;
  }

  function regenerate() {
    const palette = buildPalette(state.baseHex, state.harmony);
    state.palette = palette;
    renderSwatches(palette);
    renderCodeBlock(palette);
    updatePaletteSub(state.baseHex, state.harmony);
  }

  function setHexError(message) {
    if (!message) {
      els.hexError.textContent = "";
      els.hexError.classList.remove("is-visible");
      els.hexRow.classList.remove("is-error");
      els.hexInput.removeAttribute("aria-invalid");
    } else {
      els.hexError.textContent = message;
      els.hexError.classList.add("is-visible");
      els.hexRow.classList.add("is-error");
      els.hexInput.setAttribute("aria-invalid", "true");
    }
  }

  let debounceId = null;
  function onHexInput() {
    const raw = els.hexInput.value;
    const normalized = normalizeHex(raw);
    if (normalized) {
      setHexError("");
      els.hexSwatch.style.background = normalized;
      state.baseHex = normalized;
      setAccent(normalized);
      if (state.pickerOpen) {
        syncPickerFromHex(normalized);
      }
      clearTimeout(debounceId);
      debounceId = setTimeout(regenerate, 200);
    } else {
      setHexError("Invalid hex");
    }
  }

  function onHarmonyChange() {
    state.harmony = els.harmony.value;
    regenerate();
  }

  function onGenerateSubmit(e) {
    e.preventDefault();
    const normalized = normalizeHex(els.hexInput.value);
    if (!normalized) {
      setHexError("Invalid hex");
      els.hexInput.focus();
      return;
    }
    state.baseHex = normalized;
    els.hexInput.value = normalized.slice(1);
    els.hexSwatch.style.background = normalized;
    setAccent(normalized);
    if (state.pickerOpen) syncPickerFromHex(normalized);
    regenerate();
  }

  function randomHex() {
    const h = Math.floor(Math.random() * 360);
    const s = 0.55 + Math.random() * 0.35;
    const l = 0.40 + Math.random() * 0.25;
    return hslToHex(h, s, l);
  }

  function onRandom() {
    const hex = randomHex();
    state.baseHex = hex;
    els.hexInput.value = hex.slice(1);
    els.hexSwatch.style.background = hex;
    setAccent(hex);
    setHexError("");
    if (state.pickerOpen) syncPickerFromHex(hex);
    regenerate();
  }

  function onSwatchClick(e) {
    const card = e.target.closest(".swatch");
    if (!card) return;
    const hex = card.dataset.hex;
    if (!hex) return;
    copyText(hex).then(ok => {
      if (!ok) return;
      card.classList.add("is-copied");
      setTimeout(() => card.classList.remove("is-copied"), 1500);
    });
  }

  function onSwatchKey(e) {
    if (e.key === "Enter" || e.key === " ") {
      const card = e.target.closest(".swatch");
      if (!card) return;
      e.preventDefault();
      const hex = card.dataset.hex;
      copyText(hex).then(ok => {
        if (!ok) return;
        card.classList.add("is-copied");
        setTimeout(() => card.classList.remove("is-copied"), 1500);
      });
    }
  }

  function buildCssText() {
    return [":root {"]
      .concat(state.palette.map((c, i) => {
        const n = String(i + 1).padStart(2, "0");
        return `  --color-${n}: ${c.hex};`;
      }))
      .concat(["}"])
      .join("\n");
  }

  function onCopyAll() {
    const text = buildCssText();
    copyText(text).then(ok => {
      if (!ok) return;
      const original = els.copyAllBtn.textContent;
      els.copyAllBtn.textContent = "Copied";
      els.copyAllBtn.classList.add("is-copied");
      setTimeout(() => {
        els.copyAllBtn.textContent = original;
        els.copyAllBtn.classList.remove("is-copied");
      }, 1500);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function onKeydown(e) {
    if (e.key === "r" || e.key === "R") {
      const t = e.target;
      const isEditable = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (isEditable) return;
      e.preventDefault();
      onRandom();
    }
  }

  function setPickerHue(h) {
    state.pickerHue = ((h % 360) + 360) % 360;
    els.pickerArea.style.setProperty("--picker-hue", state.pickerHue.toFixed(0));
    els.hueThumb.style.left = (state.pickerHue / 360 * 100) + "%";
    els.hueTrack.setAttribute("aria-valuenow", state.pickerHue.toFixed(0));
  }

  function setPickerSL(s, l) {
    state.pickerSat = clamp(s, 0, 1);
    state.pickerLight = clamp(l, 0, 1);
    const rect = els.pickerArea.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const x = state.pickerSat * w;
    const y = (1 - state.pickerLight) * h;
    els.pickerCursor.style.left = x + "px";
    els.pickerCursor.style.top = y + "px";
  }

  function syncPickerFromHex(hex) {
    const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
    setPickerHue(h);
    setPickerSL(s, l);
    els.pickerReadout.textContent = hex;
  }

  function openPicker() {
    if (state.pickerOpen) return;
    state.pickerOpen = true;
    syncPickerFromHex(state.baseHex);
    els.picker.hidden = false;
    els.hexSwatch.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      setPickerHue(state.pickerHue);
      setPickerSL(state.pickerSat, state.pickerLight);
    });
  }

  function closePicker() {
    if (!state.pickerOpen) return;
    state.pickerOpen = false;
    els.picker.hidden = true;
    els.hexSwatch.setAttribute("aria-expanded", "false");
  }

  function togglePicker() {
    if (state.pickerOpen) closePicker();
    else openPicker();
  }

  function applyPicker() {
    const hex = hslToHex(state.pickerHue, state.pickerSat, state.pickerLight);
    state.baseHex = hex;
    els.hexInput.value = hex.slice(1);
    els.hexSwatch.style.background = hex;
    els.pickerReadout.textContent = hex;
    setAccent(hex);
    setHexError("");
    clearTimeout(debounceId);
    debounceId = setTimeout(regenerate, 200);
  }

  function pointerFromEvent(e, el) {
    const rect = el.getBoundingClientRect();
    const point = e.touches && e.touches[0] ? e.touches[0] :
                  e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
    return { x: clamp(point.clientX - rect.left, 0, rect.width), y: clamp(point.clientY - rect.top, 0, rect.height), rect };
  }

  let activeDrag = null;

  function onAreaDown(e) {
    e.preventDefault();
    const p = pointerFromEvent(e, els.pickerArea);
    const s = p.x / p.rect.width;
    const l = 1 - (p.y / p.rect.height);
    setPickerSL(s, l);
    applyPicker();
    activeDrag = "area";
    els.pickerArea.setPointerCapture && e.pointerId !== undefined && els.pickerArea.setPointerCapture(e.pointerId);
    window.addEventListener("mousemove", onAreaMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onAreaMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  function onAreaMove(e) {
    if (activeDrag !== "area") return;
    if (e.cancelable) e.preventDefault();
    const p = pointerFromEvent(e, els.pickerArea);
    const s = p.x / p.rect.width;
    const l = 1 - (p.y / p.rect.height);
    setPickerSL(s, l);
    applyPicker();
  }

  function onHueDown(e) {
    e.preventDefault();
    const p = pointerFromEvent(e, els.hueTrack);
    const hue = (p.x / p.rect.width) * 360;
    setPickerHue(hue);
    applyPicker();
    activeDrag = "hue";
    window.addEventListener("mousemove", onHueMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onHueMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  function onHueMove(e) {
    if (activeDrag !== "hue") return;
    if (e.cancelable) e.preventDefault();
    const p = pointerFromEvent(e, els.hueTrack);
    const hue = (p.x / p.rect.width) * 360;
    setPickerHue(hue);
    applyPicker();
  }

  function onUp() {
    activeDrag = null;
    window.removeEventListener("mousemove", onAreaMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onAreaMove);
    window.removeEventListener("touchend", onUp);
    window.removeEventListener("mousemove", onHueMove);
    window.removeEventListener("touchmove", onHueMove);
  }

  function onHueKey(e) {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setPickerHue(state.pickerHue - step);
      applyPicker();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setPickerHue(state.pickerHue + step);
      applyPicker();
    }
  }

  function onAreaKey(e) {
    const sStep = e.shiftKey ? 0.1 : 0.02;
    const lStep = e.shiftKey ? 0.1 : 0.02;
    let s = state.pickerSat, l = state.pickerLight;
    if (e.key === "ArrowLeft")  { e.preventDefault(); s = clamp(s - sStep, 0, 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); s = clamp(s + sStep, 0, 1); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); l = clamp(l + lStep, 0, 1); }
    else if (e.key === "ArrowDown")  { e.preventDefault(); l = clamp(l - lStep, 0, 1); }
    else return;
    setPickerSL(s, l);
    applyPicker();
  }

  function onPickerOutside(e) {
    if (!state.pickerOpen) return;
    if (els.picker.contains(e.target)) return;
    if (els.hexSwatch.contains(e.target)) return;
    closePicker();
  }

  function onPickerKey(e) {
    if (e.key === "Escape" && state.pickerOpen) {
      closePicker();
      els.hexSwatch.focus();
    }
  }

  function init() {
    const initial = normalizeHex(els.hexInput.value) || "#3B82F6";
    state.baseHex = initial;
    state.harmony = els.harmony.value;
    els.hexInput.value = initial.slice(1);
    els.hexSwatch.style.background = initial;
    setAccent(initial);
    setHexError("");
    regenerate();

    els.hexInput.addEventListener("input", onHexInput);
    els.harmony.addEventListener("change", onHarmonyChange);
    els.controls.addEventListener("submit", onGenerateSubmit);
    els.randomBtn.addEventListener("click", onRandom);
    els.swatches.addEventListener("click", onSwatchClick);
    els.swatches.addEventListener("keydown", onSwatchKey);
    els.copyAllBtn.addEventListener("click", onCopyAll);
    document.addEventListener("keydown", onKeydown);

    els.hexSwatch.addEventListener("click", togglePicker);
    els.pickerClose.addEventListener("click", closePicker);
    els.pickerArea.addEventListener("mousedown", onAreaDown);
    els.pickerArea.addEventListener("touchstart", onAreaDown, { passive: false });
    els.pickerArea.addEventListener("keydown", onAreaKey);
    els.hueTrack.addEventListener("mousedown", onHueDown);
    els.hueTrack.addEventListener("touchstart", onHueDown, { passive: false });
    els.hueTrack.addEventListener("keydown", onHueKey);
    document.addEventListener("mousedown", onPickerOutside);
    document.addEventListener("touchstart", onPickerOutside, { passive: true });
    document.addEventListener("keydown", onPickerKey);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

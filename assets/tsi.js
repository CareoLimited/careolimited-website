/* CAREO LIMITED: TSI page. Numbers band, and the evidence explorer.
   Text comes from assets/i18n.js; the page reads fine without this script (static numbers, static figure). */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = () => root.lang || "en";
  const t = (key) => {
    const all = window.CAREO_I18N || {};
    const v = (all[lang()] || {})[key];
    return v != null ? v : ((all.en || {})[key] != null ? all.en[key] : key);
  };
  const onLanguage = (fn) => new MutationObserver(fn).observe(root, { attributes: true, attributeFilter: ["lang"] });

  // ---- Numbers band: count up once when it comes into view ----
  const nums = [...document.querySelectorAll(".tsi-stat-num[data-count]")];
  const fmt = (n) => new Intl.NumberFormat(lang()).format(n);
  const show = (el, n) => { el.textContent = fmt(n) + (el.dataset.suffix || ""); };
  const showFinal = () => nums.forEach((el) => show(el, +el.dataset.count));
  showFinal();
  onLanguage(showFinal);
  if (nums.length && !reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now(), dur = 1400;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur), k = 1 - Math.pow(1 - p, 3);
        nums.forEach((el) => show(el, Math.round(+el.dataset.count * k)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(nums[0].closest(".tsi-stats"));
  }

  // ---- Evidence explorer: pick a damage type, set what's known, and the photo, the overlays and the report follow ----
  // Each damage type has a photo for every element and material it occurs in (images/projects/tsi-demo-<damage>-<element>-<material>.jpg).
  // "Unknown" keeps the last photo on screen: the damage is still there, TSI simply isn't told, so it says less.
  const demo = document.getElementById("tsiDemo");
  if (demo) {
    const section = demo.closest("section");
    // Overlay geometry is in the 1200 x 750 space of the photos. obs = observed area, int = area the reading is about,
    // rec = action marker, scale = ruler, tip = where the damage grows [x, y, direction in degrees], step = spacing of the dated marks.
    // m = measurement shown when a scale reference is present (mk = its sentence, if not the usual one), g = base grade (1 light, 2 medium, 3 serious),
    // min = lowest grade it can drop to (exposed corroded steel or a structural crack never becomes "light" just because it looks old).
    const V = {
      "crack-beam-rc":        { obs: [640, 112, 200, 278], int: "M626 118 L826 118 L826 380 L752 380 Z", rec: [742, 252], scale: [250, 300], tip: [672, 142, -115], m: { w: [1.2, 0.3], l: 35 }, g: 3, min: 2, i: "crack-beam-rc" },
      "crack-beam-masonry":   { obs: [860, 30, 260, 225], int: "M850 180 L1120 30 L1130 290 L850 290 Z", rec: [1085, 225], scale: [90, 560], tip: [1058, 76, -50], m: { w: [3, 1], l: 60 }, g: 2, min: 2, i: "crack-beam-masonry" },
      "crack-column-rc":      { obs: [420, 150, 440, 370], int: "M430 160 L600 160 L870 440 L870 530 L700 530 L430 250 Z", rec: [640, 340], scale: [360, 590], tip: [828, 502, 40], m: { w: [0.8, 0.3], l: 45 }, g: 3, min: 2, i: "crack-column-rc" },
      "crack-column-masonry": { obs: [630, 170, 180, 370], int: "M600 160 L840 160 L840 560 L600 560 Z", rec: [750, 250], scale: [310, 600], tip: [692, 522, 90], m: { w: [2, 0.5], l: 80 }, g: 3, min: 2, i: "crack-column-masonry" },
      "crack-wall-rc":        { obs: [720, 280, 240, 280], int: "M740 285 L1000 420 L960 600 L740 420 Z", rec: [790, 345], scale: [100, 560], tip: [938, 545, 50], m: { w: [0.6, 0.2], l: 100 }, g: 1, i: "crack-wall-rc" },
      "crack-wall-masonry":   { obs: [700, 300, 290, 230], int: "M700 305 L1000 470 L1000 570 L760 570 Z", rec: [740, 420], scale: [100, 560], tip: [962, 505, 40], m: { w: [4, 1], l: 70 }, g: 2, i: "crack-wall-masonry" },
      "fine-beam-rc":         { obs: [390, 130, 540, 230], int: "M380 122 L940 122 L940 368 L380 368 Z", rec: [660, 250], scale: [90, 290], tip: [920, 250, 0], m: { w: 0.3 }, g: 1, i: "fine-rc" },
      "fine-column-rc":       { obs: [370, 110, 520, 440], int: "M360 100 L900 100 L900 560 L360 560 Z", rec: [630, 330], scale: [320, 580], tip: [880, 330, 0], m: { w: 0.3 }, g: 1, i: "fine-rc" },
      "fine-column-masonry":  { obs: [370, 130, 470, 490], int: "M360 120 L850 120 L850 630 L360 630 Z", rec: [520, 330], scale: [320, 600], tip: [800, 320, 0], m: { w: 0.3 }, g: 1, i: "fine-masonry" },
      "fine-wall-rc":         { obs: [230, 130, 820, 440], int: "M220 120 L1060 120 L1060 580 L220 580 Z", rec: [640, 350], scale: [40, 600], tip: [1040, 350, 0], m: { w: 0.3 }, g: 1, i: "fine-rc" },
      "fine-wall-masonry":    { obs: [160, 110, 910, 510], int: "M150 100 L1080 100 L1080 630 L150 630 Z", rec: [600, 330], scale: [30, 560], tip: [1000, 330, 0], m: { w: 0.3 }, g: 1, i: "fine-masonry" },
      "spall-beam-rc":        { obs: [300, 245, 515, 150], int: "M280 330 L1000 330 L1000 400 L280 400 Z", rec: [480, 330], scale: [90, 200], tip: [805, 330, 0], m: { a: [40, 12] }, g: 2, min: 2, i: "spall-rc" },
      "spall-column-rc":      { obs: [436, 250, 324, 316], int: "M470 250 L740 250 L740 745 L470 745 Z", rec: [540, 340], scale: [330, 600], tip: [748, 470, 0], m: { a: [25, 30] }, g: 3, min: 2, i: "spall-rc" },
      "spall-column-masonry": { obs: [460, 535, 380, 120], int: "M300 480 L905 480 L905 660 L300 660 Z", rec: [540, 590], scale: [320, 420], tip: [830, 590, 0], m: { a: [50, 15] }, g: 2, i: "spall-masonry" },
      "spall-wall-rc":        { obs: [490, 260, 310, 300], int: "M470 250 L820 250 L820 650 L470 650 Z", rec: [600, 360], scale: [90, 580], tip: [785, 480, 0], m: { a: [30, 40] }, g: 2, min: 2, i: "spall-rc" },
      "spall-wall-masonry":   { obs: [430, 350, 450, 170], int: "M400 330 L900 330 L900 540 L400 540 Z", rec: [560, 420], scale: [80, 580], tip: [870, 430, 0], m: { a: [60, 25] }, g: 1, i: "spall-masonry" },
      "damp-column-rc":       { obs: [320, 500, 570, 170], int: "M320 470 L890 470 L890 680 L320 680 Z", rec: [600, 600], scale: [340, 300], tip: [420, 528, -90], step: 50, m: { h: 0.35 }, g: 2, i: "damp-rc" },
      "damp-column-masonry":  { obs: [295, 520, 605, 150], int: "M290 490 L905 490 L905 680 L290 680 Z", rec: [600, 620], scale: [320, 300], tip: [420, 548, -90], step: 50, m: { h: 0.3 }, g: 1, i: "damp-masonry" },
      "damp-wall-rc":         { obs: [260, 370, 850, 280], int: "M200 420 L1150 420 L1150 660 L200 660 Z", rec: [620, 560], scale: [70, 240], tip: [380, 450, -90], step: 70, m: { h: 0.5 }, g: 1, i: "damp-rc" },
      "damp-wall-masonry":    { obs: [10, 320, 1180, 190], int: "M10 400 L1190 400 L1190 745 L10 745 Z", rec: [600, 430], scale: [80, 220], tip: [380, 392, -90], m: { h: 0.4 }, mk: "demo.m.dampVisible", g: 1, i: "damp-masonry" }
    };
    // Which elements and materials each damage type is shown on, and what each tab starts with
    const AVAIL = {
      crack: { beam: ["rc", "masonry"], column: ["rc", "masonry"], wall: ["rc", "masonry"] },
      fine:  { beam: ["rc"], column: ["rc", "masonry"], wall: ["rc", "masonry"] },
      spall: { beam: ["rc"], column: ["rc", "masonry"], wall: ["rc", "masonry"] },
      damp:  { column: ["rc", "masonry"], wall: ["rc", "masonry"] }
    };
    const DEFAULTS = { crack: ["beam", "rc"], fine: ["wall", "masonry"], spall: ["column", "rc"], damp: ["wall", "masonry"] };
    // What to do / not do / check / what would change the grade: by damage type and material
    const DM = {
      "crack-rc":      { do: "demo.dm.crack.do", dont: "demo.dm.crack.dont", check: "demo.dm.crack-rc.check", change: "demo.dm.crack.change" },
      "crack-masonry": { do: "demo.dm.crack.do", dont: "demo.dm.crack.dont", check: "demo.dm.crack-masonry.check", change: "demo.dm.crack.change" },
      "fine-rc":       { do: "demo.dm.fine.do", dont: "demo.dm.fine.dont", check: "demo.dm.fine.check", change: "demo.dm.fine.change" },
      "fine-masonry":  { do: "demo.dm.fine.do", dont: "demo.dm.fine.dont", check: "demo.dm.fine.check", change: "demo.dm.fine.change" },
      "spall-rc":      { do: "demo.dm.spall-rc.do", dont: "demo.dm.spall-rc.dont", check: "demo.dm.spall-rc.check", change: "demo.dm.spall-rc.change" },
      "spall-masonry": { do: "demo.dm.spall-masonry.do", dont: "demo.dm.spall-masonry.dont", check: "demo.dm.spall-masonry.check", change: "demo.dm.spall-masonry.change" },
      "damp-rc":       { do: "demo.dm.damp.do", dont: "demo.dm.damp.dont", check: "demo.dm.damp-rc.check", change: "demo.dm.damp-rc.change" },
      "damp-masonry":  { do: "demo.dm.damp.do", dont: "demo.dm.damp.dont", check: "demo.dm.damp-masonry.check", change: "demo.dm.damp-masonry.change" },
      "damp-any":      { do: "demo.dm.damp.do", dont: "demo.dm.damp.dont", check: "demo.dm.damp-any.check", change: "demo.dm.damp-any.change" }
    };
    const GRADES = ["none", "light", "medium", "serious", "undetermined"];
    // element/material: what TSI is told ("unknown" allowed). photoEl/photoMat: what the photo shows (always a real combination).
    const state = { damage: "crack", obs: true, int: true, rec: true, element: "beam", material: "rc", scale: "yes", history: "unknown", photoEl: "beam", photoMat: "rc" };
    const $ = (sel, root = section) => root.querySelector(sel);
    const photo = $(".demo-photo"), fig = $(".demo-figure");
    const variant = () => `${state.damage}-${state.photoEl}-${state.photoMat}`;
    const num = (n) => new Intl.NumberFormat(lang(), { maximumFractionDigits: 2 }).format(n);
    const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

    const grade = (v) => {
      const { damage, element, material, history } = state;
      if (material === "unknown" && damage !== "damp") return "undetermined";
      if (element === "unknown" && (damage === "crack" || damage === "spall")) return "undetermined";
      const g = v.g + (history === "growing" ? 1 : history === "stable" ? -1 : 0);
      // damp and salts alone stay at most "medium"
      return GRADES[Math.max(v.min || 1, Math.min(damage === "damp" ? 2 : 3, g))];
    };
    const confidence = () => 1 + (state.element !== "unknown") + (state.material !== "unknown") + (state.scale === "yes") + (state.history !== "unknown");

    // Measurement in words (report) and on the photo (callout), with the visitor's number format
    const measure = (v) => {
      const m = v.m, d = state.damage;
      if (d === "crack") return { call: `≈ ${num(m.w[0])} mm ± ${num(m.w[1])}`, text: fill(t("demo.m.crack"), { w: `${num(m.w[0])} mm (± ${num(m.w[1])} mm)`, l: `${num(m.l)} cm` }) };
      if (d === "fine") return { call: `< ${num(m.w)} mm`, text: fill(t("demo.m.fine"), { w: `${num(m.w)} mm` }) };
      if (d === "spall") return { call: `≈ ${num(m.a[0])} × ${num(m.a[1])} cm`, text: fill(t("demo.m.spall"), { a: `${num(m.a[0])} × ${num(m.a[1])} cm` }) };
      return { call: `≈ ${num(m.h)} m`, text: fill(t(v.mk || "demo.m.damp"), { h: `${num(m.h)} m` }) };
    };

    // Dated marks on the photo, the way inspectors record damage: growing = it has passed older marks; stable = it still stops at an old one
    const NS = "http://www.w3.org/2000/svg";
    const svgEl = (name, attrs) => { const el = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, val]) => el.setAttribute(k, val)); return el; };
    const drawHistory = (v) => {
      const g = $(".ov-hist");
      g.replaceChildren();
      if (state.history === "unknown") return;
      const [x, y, deg] = v.tip, a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
      const step = v.step || 85;
      const marks = state.history === "growing" ? [[-2 * step, "03/25"], [-step, "09/25"]] : [[8, "2019 · 2025"]];
      marks.forEach(([back, label], n) => {
        const cx = x + dx * back, cy = y + dy * back, L = 30;
        const d = `M${cx - px * L} ${cy - py * L} L${cx + px * L} ${cy + py * L}`;
        g.appendChild(svgEl("path", { d, class: "hist-halo" }));
        g.appendChild(svgEl("path", { d, class: "hist-line" }));
        // upright marks take turns putting their date below and above, so neighbouring dates never touch
        let side = Math.abs(px) < 0.3 && n % 2 ? -1 : 1;
        // a date that would run off the photo goes on the other side of its mark
        const room = (sd) => { const x = cx + sd * px * (L + 12), w = label.length * 16; const anchor = sd * px; return anchor < -0.3 ? x - w > 10 : anchor > 0.3 ? x + w < 1190 : x - w / 2 > 10 && x + w / 2 < 1190; };
        if (!room(side) && room(-side)) side = -side;
        const tx = cx + side * px * (L + 12), ty = cy + side * py * (L + 12) + (side * py < 0 ? -22 : 0);
        const text = svgEl("text", { x: tx, y: ty + 6, class: "hist-text", "text-anchor": side * px < -0.3 ? "end" : side * px > 0.3 ? "start" : "middle" });
        text.textContent = label;
        g.appendChild(text);
      });
    };

    // Grey out combinations this damage type isn't shown on
    const syncOptions = () => {
      const avail = AVAIL[state.damage];
      section.querySelectorAll('select[data-field="element"] option').forEach((o) => { o.disabled = o.value !== "unknown" && !avail[o.value]; });
      section.querySelectorAll('select[data-field="material"] option').forEach((o) => { o.disabled = o.value !== "unknown" && !avail[state.photoEl].includes(o.value); });
      section.querySelectorAll("select[data-field]").forEach((s) => { s.value = state[s.dataset.field]; });
    };

    let shownSrc = "";
    const showPhoto = () => {
      const src = `../images/projects/tsi-demo-${variant()}.jpg`;
      if (src === shownSrc) return;
      shownSrc = src;
      fig.classList.add("is-swapping");
      const next = new Image();
      next.onload = () => { if (shownSrc !== src) return; photo.src = src; requestAnimationFrame(() => fig.classList.remove("is-swapping")); };
      next.onerror = () => fig.classList.remove("is-swapping");
      next.src = src;
    };

    // Callouts are placed from each photo's geometry: the measurement sits on the top edge of the observed area, the action
    // under its marker, the reading beside the hatched area. Then each one is moved off the dated marks, the action marker
    // and the callouts before it, and kept inside the photo above the caption, whatever the language or screen width.
    const placeCallouts = (v) => {
      const W = photo.clientWidth, H = photo.clientHeight, sx = W / 1200, sy = H / 750, note = $(".demo-note");
      // keep callouts above the caption where it lies over the photo; on phones it sits below the photo
      const floor = H - (getComputedStyle(note).position === "absolute" ? note.offsetHeight : 0) - 4;
      const put = (el, left, top) => {
        el.style.transform = "";
        el.style.left = Math.max(8, Math.min(left, W - el.offsetWidth - 8)) + "px";
        el.style.top = Math.max(4, Math.min(top, floor - el.offsetHeight)) + "px";
      };
      const obsEl = $('[data-callout="obs"]'), recEl = $('[data-callout="rec"]'), intEl = $('[data-callout="int"]');
      put(obsEl, v.obs[0] * sx - 6, v.obs[1] * sy - obsEl.offsetHeight * 0.6);
      const rx = v.rec[0] * sx, ry = v.rec[1] * sy, rr = 26 * sx;
      put(recEl, rx - recEl.offsetWidth / 2, ry + rr + 6);
      const bb = $(".ov-int").getBBox();
      let left = (bb.x + bb.width) * sx + 8, top = (bb.y + bb.height / 2) * sy - intEl.offsetHeight / 2;
      if (left + intEl.offsetWidth > W - 8) {
        left = bb.x * sx - intEl.offsetWidth - 8;
        if (left < 8) { left = (bb.x + bb.width) * sx - intEl.offsetWidth - 8; top = (bb.y + bb.height) * sy - intEl.offsetHeight - 8; }
      }
      put(intEl, left, top);
      // Obstacles in photo pixels: the dated marks and the action marker
      const fb = fig.getBoundingClientRect(), box = (r) => ({ l: r.left - fb.left, t: r.top - fb.top, r: r.right - fb.left, b: r.bottom - fb.top });
      const blocks = [];
      const hist = $(".ov-hist");
      if (state.obs && hist.childElementCount) blocks.push(box(hist.getBoundingClientRect()));
      if (state.rec) blocks.push({ l: rx - rr, t: ry - rr, r: rx + rr, b: ry + rr });
      const rectOf = (el) => ({ l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight });
      const hits = (a, b) => !(a.r + 3 < b.l || a.l - 3 > b.r || a.b + 3 < b.t || a.t - 3 > b.b);
      // Each callout keeps its spot if it's free; otherwise it takes the nearest free spot inside the photo
      [obsEl, recEl, intEl].forEach((el) => {
        if (el.classList.contains("is-off")) return;
        const w = el.offsetWidth, h = el.offsetHeight, want = rectOf(el);
        const free = (l, t) => !blocks.some((b) => hits({ l, t, r: l + w, b: t + h }, b));
        if (!free(want.l, want.t)) {
          let best = null, bestD = Infinity;
          for (let t = 4; t <= floor - h; t += 4) {
            for (let l = 8; l <= W - w - 8; l += 6) {
              const d = (l - want.l) ** 2 + 2 * (t - want.t) ** 2;
              if (d < bestD && free(l, t)) { best = [l, t]; bestD = d; }
            }
          }
          if (best) { el.style.left = best[0] + "px"; el.style.top = best[1] + "px"; }
        }
        blocks.push(rectOf(el));
      });
    };

    const render = () => {
      const v = V[variant()], dampAny = state.damage === "damp" && state.material === "unknown";
      // with the material unknown, damp is read without assuming concrete or brick
      const dmKey = dampAny ? "damp-any" : `${state.damage}-${state.photoMat}`, ik = (x) => t(`demo.i.${dampAny ? "damp-any" : v.i}.${x}`);
      const g = grade(v), undetermined = g === "undetermined", scale = state.scale === "yes";
      const hist = state.history === "growing" ? "growing" : state.history === "stable" ? "stable" : "";
      showPhoto();
      syncOptions();
      // Figure: overlays placed for this photo
      const [ox, oy, ow, oh] = v.obs;
      const r = $(".ov-obs"); r.setAttribute("x", ox); r.setAttribute("y", oy); r.setAttribute("width", ow); r.setAttribute("height", oh);
      $(".ov-int").setAttribute("d", v.int);
      $(".ov-rec").setAttribute("transform", `translate(${v.rec[0]} ${v.rec[1]})`);
      $(".ov-scale").setAttribute("transform", `translate(${v.scale[0]} ${v.scale[1]})`);
      drawHistory(v);
      ["obs", "int", "rec"].forEach((layer) => {
        section.querySelectorAll(`.demo-ov[data-layer="${layer}"]`).forEach((el) => el.classList.toggle("is-off", !state[layer]));
        $(`[data-toggle="${layer}"]`).setAttribute("aria-pressed", String(state[layer]));
      });
      $('.demo-ov[data-layer="int"]').classList.toggle("is-empty", undetermined);
      $(".demo-scale").classList.toggle("is-off", !scale);
      const ms = measure(v);
      const call = (layer, text, on, sub) => {
        const el = $(`[data-callout="${layer}"]`);
        el.textContent = text;
        if (sub) { const s = document.createElement("small"); s.textContent = sub; el.appendChild(s); }
        el.classList.toggle("is-off", !on);
      };
      call("obs", scale ? ms.call : t("demo.call.size"), state.obs);
      call("int", undetermined ? t("demo.call.intNone") : ik("short"), state.int,
        !undetermined && hist ? t(hist === "growing" ? "demo.call.active" : "demo.call.dormant") : "");
      call("rec", g === "serious" ? t("demo.call.recSoon") : g === "medium" || undetermined ? t("demo.call.rec") : t("demo.call.monitor"), state.rec);
      placeCallouts(v);

      // Confidence meter
      const conf = confidence();
      section.querySelectorAll(".conf-bar i").forEach((seg, i) => seg.classList.toggle("on", i < conf));
      $(".conf-bar").dataset.level = String(conf);
      $(".conf-text").textContent = t("demo.conf.l" + conf);

      // Report
      const label = (field) => { const s = $(`select[data-field="${field}"]`); return s.options[s.selectedIndex].textContent; };
      $(".rep-scene").textContent = `${t("demo.t." + state.damage)} · ${label("element")} · ${label("material")}`;
      const gv = $(".rep-grade-value");
      gv.textContent = t("demo.g." + g); gv.dataset.grade = g;
      $(".rep-grade-note").textContent = !scale && !undetermined ? t("demo.g.prov") : "";
      const set = (row, text) => { const dd = $(`[data-row="${row}"] dd`); if (dd && !dd.querySelector("ul")) dd.textContent = text; };
      const dm = DM[dmKey];
      set("seen", t(`demo.v.${variant()}.seen`) + " " + (scale ? ms.text : t("demo.noScale")));
      set("int", undetermined ? t("demo.int.none") : ik("int") + (hist ? " " + t("demo.h." + hist) : ""));
      set("causes", ik("causes"));
      set("do", t(dm.do) + (hist ? " " + t("demo.h." + hist + "Do") : ""));
      set("dont", t(dm.dont));
      set("check", t(dm.check));
      set("change", t(dm.change));
      $('[data-row="int"]').classList.toggle("is-off", !state.int);
      ["do", "dont", "check"].forEach((row) => $(`[data-row="${row}"]`).classList.toggle("is-off", !state.rec));
      $('[data-row="causes"]').classList.toggle("is-off", !state.int || undetermined);
      $('[data-row="seen"]').classList.toggle("is-off", !state.obs);
      // When the grade can't be decided, show the plain questions TSI would ask instead of guessing
      const ask = $('[data-row="ask"]'), askList = $('[data-row="ask"] ul');
      askList.innerHTML = "";
      if (undetermined) {
        const qs = [];
        if (state.element === "unknown") qs.push("demo.q.element");
        if (state.material === "unknown") qs.push("demo.q.material");
        if (state.history === "unknown") qs.push("demo.q.history");
        qs.forEach((q) => { const li = document.createElement("li"); li.textContent = t(q); askList.appendChild(li); });
      }
      ask.hidden = !undetermined;
      $('[data-row="change"]').hidden = undetermined;
      const chips = $(".rep-chips"); chips.innerHTML = "";
      const unknown = [];
      if (state.element === "unknown") unknown.push("demo.u.element");
      if (state.material === "unknown") unknown.push("demo.u.material");
      if (!scale) unknown.push("demo.u.scale");
      if (state.history === "unknown") unknown.push("demo.u.history");
      unknown.push("demo.u.loads");
      unknown.forEach((u) => { const li = document.createElement("li"); li.textContent = t(u); chips.appendChild(li); });
    };

    const pickDamage = (name) => {
      const [el, mat] = DEFAULTS[name];
      Object.assign(state, { damage: name, element: el, material: mat, photoEl: el, photoMat: mat, scale: "yes", history: "unknown" });
      section.querySelectorAll(".demo-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.scene === name)));
      render();
    };
    // A known element or material moves the photo to it; if the material doesn't occur on the new element, it switches to one that does
    const setField = (field, value) => {
      const avail = AVAIL[state.damage];
      // Greyed-out choices can't be picked, but guard anyway (e.g. a value set by script)
      if (value !== "unknown" && (field === "element" ? !avail[value] : field === "material" && !avail[state.photoEl].includes(value))) { render(); return; }
      state[field] = value;
      if (field === "element" && value !== "unknown") {
        state.photoEl = value;
        if (!avail[value].includes(state.photoMat)) {
          state.photoMat = avail[value][0];
          if (state.material !== "unknown") state.material = state.photoMat;
        }
      }
      if (field === "material" && value !== "unknown") state.photoMat = value;
      render();
    };
    section.querySelectorAll(".demo-tab").forEach((b) => b.addEventListener("click", () => pickDamage(b.dataset.scene)));
    section.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => { state[b.dataset.toggle] = !state[b.dataset.toggle]; render(); }));
    section.querySelectorAll("select[data-field]").forEach((s) => s.addEventListener("change", () => setField(s.dataset.field, s.value)));
    shownSrc = new URL(photo.getAttribute("src"), location.href).pathname.endsWith(`tsi-demo-${variant()}.jpg`) ? `../images/projects/tsi-demo-${variant()}.jpg` : "";
    render();
    onLanguage(render);
  }
})();

/* CAREO LIMITED: language switching, header behaviour and screenshot viewer.
   Pages ship with English text in the HTML; this script swaps in the selected language. */
(() => {
  const I18N = window.CAREO_I18N || {};
  const LANGS = window.CAREO_LANGS || [];
  const supported = Object.keys(I18N);
  const storage = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* not remembered */ } }
  };

  function detectLanguage() {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (supported.includes(fromUrl)) return fromUrl;
    // Regional codes (es-419, fr-CA, pt-BR) use the site's base language; privacy pages keep the region themselves
    const base = fromUrl && fromUrl.split("-")[0].toLowerCase();
    if (supported.includes(base)) return base;
    const saved = storage.get("careo-language");
    if (supported.includes(saved)) return saved;
    const nav = (navigator.languages || [navigator.language || "en"]).map((l) => String(l).slice(0, 2).toLowerCase());
    return nav.find((l) => supported.includes(l)) || "en";
  }

  function t(lang, key) {
    const table = I18N[lang] || {};
    return table[key] != null ? table[key] : (I18N.en || {})[key];
  }

  function fill(lang, template, vars) {
    return String(template)
      .replace("{year}", String(new Date().getFullYear()))
      .replace(/\{(\w+)\}/g, (m, name) => (vars && vars[name] != null ? vars[name] : m));
  }

  function varsFor(lang, el) {
    const raw = el.getAttribute("data-i18n-vars");
    if (!raw) return null;
    const out = {};
    raw.split(";").forEach((pair) => {
      const [name, value] = pair.split("=");
      if (!name) return;
      out[name] = value && value.startsWith("@") ? t(lang, value.slice(1)) : value;
    });
    return out;
  }

  function localizeLinks(lang) {
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return;
      const [pathAndQuery, hash] = href.split("#");
      const [path, query] = pathAndQuery.split("?");
      const params = new URLSearchParams(query || "");
      if (lang === "en") params.delete("lang"); else params.set("lang", lang);
      const q = params.toString();
      a.setAttribute("href", path + (q ? "?" + q : "") + (hash ? "#" + hash : ""));
    });
  }

  // Headlines marked data-split rise in word by word. The full sentence stays readable for screen readers
  // (aria-label); the word spans are decorative. Re-run after each language change, which resets the text.
  function splitHeadlines() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll("[data-split]").forEach((el) => {
      const text = el.textContent.trim();
      // No spaces (Japanese): there are no words to split, and one span holding the whole sentence wouldn't wrap on phones
      if (!text || !/\s/.test(text)) return;
      el.setAttribute("aria-label", text);
      el.textContent = "";
      text.split(/(\s+)/).forEach((part, i) => {
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
        const w = document.createElement("span");
        w.className = "w";
        w.setAttribute("aria-hidden", "true");
        w.style.setProperty("--i", String(i / 2));
        w.textContent = part;
        el.appendChild(w);
      });
      el.classList.add("split-words");
    });
  }

  // A page can limit its languages with <body data-langs="en tr ...">. Privacy pages limit themselves to the
  // languages their policy is written in (the options of their hidden #languageSelect; es-419 counts as es).
  // Other languages show English there, but the visitor's choice is kept for the rest of the site.
  const policySelect = document.getElementById("languageSelect");
  const pageLangs = document.body.hasAttribute("data-langs")
    ? document.body.getAttribute("data-langs").split(" ").filter(Boolean)
    : policySelect ? [...new Set([...policySelect.options].map((o) => o.value.split("-")[0]))] : [];
  const pageAllows = (lang) => !pageLangs.length || pageLangs.includes(lang);

  function setLanguage(requested) {
    const lang = pageAllows(requested) ? requested : "en";
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = t(lang, el.getAttribute("data-i18n"));
      if (value != null) el.textContent = fill(lang, value, varsFor(lang, el));
    });
    document.querySelectorAll("[data-i18n-rich]").forEach((el) => {
      const value = t(lang, el.getAttribute("data-i18n-rich"));
      if (value == null) return;
      const safe = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      el.innerHTML = safe.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const value = t(lang, el.getAttribute("data-i18n-alt"));
      if (value != null) el.setAttribute("alt", fill(lang, value, varsFor(lang, el)));
    });
    document.querySelectorAll("[data-i18n-label]").forEach((el) => {
      const value = t(lang, el.getAttribute("data-i18n-label"));
      if (value != null) el.setAttribute("aria-label", fill(lang, value, varsFor(lang, el)));
    });
    // data-l10n-langs (optional) lists the languages that have their own image; the rest fall back to English
    document.querySelectorAll("[data-l10n-src]").forEach((img) => {
      const only = img.getAttribute("data-l10n-langs");
      const use = !only || only.split(" ").includes(lang) ? lang : "en";
      const src = img.getAttribute("data-l10n-src").replace("{lang}", use);
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
    const titleKey = document.body.getAttribute("data-title-key");
    if (titleKey) document.title = fill(lang, t(lang, titleKey), varsFor(lang, document.body));

    const code = document.getElementById("langCode");
    if (code) code.textContent = lang.toUpperCase();
    document.querySelectorAll(".lang-menu [data-lang]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.lang === lang)));

    localizeLinks(requested);
    splitHeadlines();
    if (lang === requested) storage.set("careo-language", lang);
    const url = new URL(location.href);
    if (lang === "en") url.searchParams.delete("lang"); else url.searchParams.set("lang", lang);
    history.replaceState(null, "", url.toString());
    document.dispatchEvent(new Event("careo:language"));
  }

  // Language menu
  const langButton = document.getElementById("langButton");
  const langMenu = document.getElementById("langMenu");
  if (langButton && langMenu) {
    langMenu.innerHTML = LANGS.filter(([code]) => pageAllows(code)).map(([code, name]) =>
      `<li><button type="button" role="menuitemradio" data-lang="${code}" aria-checked="false"><span>${name}</span><span class="code">${code.toUpperCase()}</span></button></li>`
    ).join("");
    const close = () => { langMenu.hidden = true; langButton.setAttribute("aria-expanded", "false"); };
    langButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = langMenu.hidden;
      const tm = document.getElementById("themeMenu"); const tb = document.getElementById("themeButton");
      if (tm && !tm.hidden) { tm.hidden = true; if (tb) tb.setAttribute("aria-expanded", "false"); }
      langMenu.hidden = !open;
      langButton.setAttribute("aria-expanded", String(open));
      if (open) { const current = langMenu.querySelector('[aria-checked="true"]'); (current || langMenu.querySelector("button")).focus(); }
    });
    langMenu.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang]");
      if (!b) return;
      setLanguage(b.dataset.lang);
      close();
      langButton.focus();
    });
    langMenu.addEventListener("keydown", (e) => {
      const items = [...langMenu.querySelectorAll("button")];
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener("click", (e) => { if (!langMenu.hidden && !e.target.closest(".lang")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !langMenu.hidden) { close(); langButton.focus(); } });
  }

  // Header: border on scroll, mobile menu
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const menuButton = document.getElementById("menuButton");
    if (menuButton) {
      menuButton.addEventListener("click", () => {
        const open = !header.classList.contains("nav-open");
        header.classList.toggle("nav-open", open);
        menuButton.setAttribute("aria-expanded", String(open));
      });
      header.querySelectorAll(".site-nav a").forEach((a) => a.addEventListener("click", () => {
        header.classList.remove("nav-open");
        menuButton.setAttribute("aria-expanded", "false");
      }));
    }
  }

  // Screenshot galleries (one per device) + lightbox
  const galleries = [...document.querySelectorAll(".gallery")];
  const lightbox = document.getElementById("lightbox");
  const activeGallery = () => galleries.find((g) => !g.hidden) || galleries[0];
  document.querySelectorAll(".device-tabs [data-device]").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".device-tabs [data-device]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    galleries.forEach((g) => { g.hidden = g.id !== `gallery-${tab.dataset.device}`; });
    const g = activeGallery(); if (g) g.scrollLeft = 0;
  }));
  if (galleries.length) {
    const step = () => { const g = activeGallery(); return (g.querySelector("button") || g).getBoundingClientRect().width + 24; };
    document.querySelectorAll("[data-gallery-prev]").forEach((b) => b.addEventListener("click", () => activeGallery().scrollBy({ left: -step(), behavior: "smooth" })));
    document.querySelectorAll("[data-gallery-next]").forEach((b) => b.addEventListener("click", () => activeGallery().scrollBy({ left: step(), behavior: "smooth" })));
  }
  if (galleries.length && lightbox && typeof lightbox.showModal === "function") {
    const img = lightbox.querySelector("img");
    const count = lightbox.querySelector(".lb-count");
    let shots = [];
    let index = 0;
    // The enlarged view shows the same device frame (iPhone, iPad, Android, Mac window) as the gallery
    let framed = null;
    const show = (i) => {
      index = (i + shots.length) % shots.length;
      const shot = shots[index];
      const frame = shot.closest(".device, .window");
      if (framed) { framed.remove(); framed = null; }
      if (frame) {
        const box = frame.getBoundingClientRect();
        framed = frame.cloneNode(true);
        framed.classList.add("lb-frame");
        framed.style.setProperty("--ar", (box.width / box.height).toFixed(4));
        const big = framed.querySelector("img");
        big.loading = "eager";
        big.src = shot.currentSrc || shot.src;
        img.hidden = true;
        img.after(framed);
      } else {
        img.hidden = false;
        img.src = shot.currentSrc || shot.src;
        img.alt = shot.alt;
      }
      count.textContent = `${index + 1} / ${shots.length}`;
    };
    galleries.forEach((g) => g.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      shots = [...g.querySelectorAll("button img")];
      show(i);
      lightbox.showModal();
    })));
    lightbox.querySelector(".lb-prev").addEventListener("click", () => show(index - 1));
    lightbox.querySelector(".lb-next").addEventListener("click", () => show(index + 1));
    lightbox.querySelector(".lb-close").addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox || e.target.classList.contains("lightbox-inner")) lightbox.close(); });
    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  // More from Careo: Apps / Tools tabs
  const moreTabs = [...document.querySelectorAll(".more-tabs [data-more]")];
  moreTabs.forEach((tab) => tab.addEventListener("click", () => {
    moreTabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    moreTabs.forEach((t) => { const panel = document.getElementById(`more-${t.dataset.more}`); if (panel) panel.hidden = t !== tab; });
  }));

  // Portfolio filter: All / Apps / Tools
  const groups = document.getElementById("portfolio-groups");
  const filters = [...document.querySelectorAll(".portfolio-tabs [data-filter]")];
  filters.forEach((btn) => btn.addEventListener("click", () => {
    filters.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    if (groups) groups.dataset.show = btn.dataset.filter;
  }));
  // Header "Portfolio" submenu (desktop): Apps / Tools & projects also pick the matching filter,
  // on this page right away or on the home page after the jump (kept for one page load in sessionStorage)
  const pickFilter = (name) => { const b = filters.find((x) => x.dataset.filter === name); if (b) b.click(); };
  document.querySelectorAll("[data-portfolio]").forEach((a) => a.addEventListener("click", () => {
    if (filters.length) pickFilter(a.dataset.portfolio);
    else { try { sessionStorage.setItem("careo-portfolio", a.dataset.portfolio); } catch (e) { /* the jump still works */ } }
  }));
  if (filters.length) {
    let pending = null;
    try { pending = sessionStorage.getItem("careo-portfolio"); sessionStorage.removeItem("careo-portfolio"); } catch (e) { /* none */ }
    if (pending) pickFilter(pending);
  }

  // Theme: light / dark / system. The choice is remembered; "system" follows the device.
  const ICONS = {
    system: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
  const themeButton = document.getElementById("themeButton");
  const themeMenu = document.getElementById("themeMenu");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const lightThemeColor = themeMeta ? themeMeta.getAttribute("content") : "#061b36";
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const themePref = () => { const v = storage.get("careo-theme"); return v === "light" || v === "dark" ? v : "system"; };
  const effectiveTheme = (pref) => (pref === "system" ? (darkQuery.matches ? "dark" : "light") : pref);
  function applyTheme(pref) {
    if (pref === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", pref);
    storage.set("careo-theme", pref);
    if (themeMeta) themeMeta.setAttribute("content", effectiveTheme(pref) === "dark" ? "#0b1220" : lightThemeColor);
    if (themeButton) { const icon = themeButton.querySelector(".theme-icon"); if (icon) icon.innerHTML = ICONS[pref]; }
    if (themeMenu) themeMenu.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.themeChoice === pref)));
  }
  if (themeButton && themeMenu) {
    themeMenu.innerHTML = ["light", "dark", "system"].map((k) =>
      `<li><button type="button" role="menuitemradio" data-theme-choice="${k}" aria-checked="false"><span>${ICONS[k]}<span data-i18n="theme.${k}">${k[0].toUpperCase() + k.slice(1)}</span></span></button></li>`
    ).join("");
    const closeTheme = () => { themeMenu.hidden = true; themeButton.setAttribute("aria-expanded", "false"); };
    themeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = themeMenu.hidden;
      if (langMenu && !langMenu.hidden) { langMenu.hidden = true; langButton.setAttribute("aria-expanded", "false"); }
      themeMenu.hidden = !open;
      themeButton.setAttribute("aria-expanded", String(open));
      if (open) { const current = themeMenu.querySelector('[aria-checked="true"]'); (current || themeMenu.querySelector("button")).focus(); }
    });
    themeMenu.addEventListener("click", (e) => {
      const b = e.target.closest("[data-theme-choice]");
      if (!b) return;
      applyTheme(b.dataset.themeChoice);
      closeTheme();
      themeButton.focus();
    });
    themeMenu.addEventListener("keydown", (e) => {
      const items = [...themeMenu.querySelectorAll("button")];
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener("click", (e) => { if (!themeMenu.hidden && !e.target.closest(".theme")) closeTheme(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !themeMenu.hidden) { closeTheme(); themeButton.focus(); } });
  }
  applyTheme(themePref());
  darkQuery.addEventListener("change", () => applyTheme(themePref()));

  // Motion: cards rise in as they scroll into view (all devices); 3D tilt and icon-wall depth on mouse/trackpad only.
  // Everything is skipped when the visitor asks for reduced motion. Only transform and opacity are animated.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Rise-in: browsers with CSS scroll-driven animations (Chrome, Safari 26+, Firefox 159+) do it in CSS
  // (.sd-reveal, no script work while scrolling); older ones fall back to an IntersectionObserver.
  // CSS scroll-driven animations left cards invisible in Safari after returning to a page, so the rise-in always
  // uses the IntersectionObserver path, which every browser handles the same way.
  const cssReveal = false;
  if (!reduceMotion && (cssReveal || "IntersectionObserver" in window)) {
    const targets = document.querySelectorAll(".app-card, .more-card, .feature, .info-card, .support-card, .principle, .tsi-stat, .who-card, .cov-card");
    const io = cssReveal ? null : new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting).forEach((e, i) => {
        const el = e.target;
        io.unobserve(el);
        el.style.setProperty("--reveal-delay", Math.min(i, 5) * 80 + "ms");
        el.classList.add("is-in");
        const done = (ev) => {
          if (ev.target !== el || ev.propertyName !== "transform") return;
          el.classList.remove("reveal", "is-in");
          el.style.removeProperty("--reveal-delay");
          el.removeEventListener("transitionend", done);
        };
        el.addEventListener("transitionend", done);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    // A section reached through a #link shows at once: the rise-in offset would otherwise make the
    // browser scroll to the card's starting position and leave its top under the sticky header.
    const settleFor = (hash) => {
      let target = null;
      try { target = hash && hash.length > 1 ? document.querySelector(hash) : null; } catch (e) { target = null; }
      if (!target) return;
      const scope = target.closest("section") || target;
      targets.forEach((el) => {
        if (scope.contains(el) || el.contains(target)) {
          if (io) io.unobserve(el);
          el.classList.remove("reveal", "is-in", "sd-reveal");
          el.style.removeProperty("--reveal-delay");
        }
      });
    };
    targets.forEach((el) => {
      if (cssReveal) el.classList.add("sd-reveal");
      else { el.classList.add("reveal"); io.observe(el); }
    });
    settleFor(location.hash);
    // Safety net: nothing may stay hidden. Anything already on screen (or the whole page, after a restore from the
    // browser's memory) is shown at once.
    const revealVisible = () => targets.forEach((el) => {
      if (!el.classList.contains("reveal") || el.classList.contains("is-in")) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { io.unobserve(el); el.classList.add("is-in"); }
    });
    window.addEventListener("pageshow", (e) => { if (e.persisted) revealVisible(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) revealVisible(); });
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (a && a.pathname === location.pathname && a.host === location.host) settleFor(a.hash);
    }, true);
    window.addEventListener("hashchange", () => settleFor(location.hash));
  }

  // App pages, wide screens: the phone stays in place while the highlights scroll past, and its screen
  // switches to the screenshot each highlight describes (data-shot = position in the iPhone gallery).
  const story = document.querySelector(".features [data-shot]") && document.getElementById("gallery-iphone");
  if (story) {
    const section = document.querySelector(".features").closest("section");
    const list = section.querySelector(".features");
    const shots = [...document.querySelectorAll("#gallery-iphone img.shot")];
    const feats = [...list.querySelectorAll("[data-shot]")];
    const frameSrc = document.querySelector("#gallery-iphone .device");
    const stage = document.createElement("div");
    stage.className = "story-stage";
    stage.setAttribute("aria-hidden", "true");
    const device = frameSrc.cloneNode(false);
    feats.forEach((f, i) => {
      const src = shots[+f.dataset.shot - 1];
      const img = document.createElement("img");
      img.className = "shot" + (i === 0 ? " is-on" : "");
      img.alt = ""; img.decoding = "async";
      img.dataset.src = src ? src.getAttribute("src") : "";
      device.appendChild(img);
    });
    stage.appendChild(device);
    // Up / down arrows and a counter under the phone step through the highlights
    const nav = document.createElement("div");
    nav.className = "story-nav";
    const arrow = (dir, key, path) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.dir = String(dir);
      b.setAttribute("aria-label", t(document.documentElement.lang, key) || (dir < 0 ? "Previous" : "Next"));
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
      return b;
    };
    const count = document.createElement("span");
    count.className = "story-count";
    nav.append(arrow(-1, "lightbox.prev", "M12 19V5M6 11l6-6 6 6"), count, arrow(1, "lightbox.next", "M12 5v14M6 13l6 6 6-6"));
    stage.appendChild(nav);
    stage.removeAttribute("aria-hidden");
    device.setAttribute("aria-hidden", "true");
    list.before(stage);
    const imgs = [...device.querySelectorAll("img")];
    const wide = window.matchMedia("(min-width: 1020px)");
    let io = null;
    let current = 0;
    const activate = (i) => {
      current = i;
      if (wide.matches && imgs[i].dataset.src && !imgs[i].getAttribute("src")) imgs[i].src = imgs[i].dataset.src;
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
      feats.forEach((f, k) => f.classList.toggle("is-current", k === i));
      count.textContent = `${i + 1} / ${feats.length}`;
      nav.querySelector('[data-dir="-1"]').disabled = i === 0;
      nav.querySelector('[data-dir="1"]').disabled = i === feats.length - 1;
    };
    nav.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dir]");
      if (!b) return;
      const next = feats[Math.min(feats.length - 1, Math.max(0, current + +b.dataset.dir))];
      const r = next.getBoundingClientRect();
      window.scrollTo({ top: r.top + window.scrollY - (window.innerHeight - r.height) / 2, behavior: reduceMotion ? "auto" : "smooth" });
    });
    const apply = () => {
      const on = wide.matches;
      section.classList.toggle("story", on);
      if (on) {
        feats.forEach((f) => f.classList.remove("sd-reveal", "reveal", "is-in"));
        if (!io) {
          io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) activate(feats.indexOf(e.target)); });
          }, { rootMargin: "-45% 0px -45% 0px" });
          feats.forEach((f) => io.observe(f));
        }
        activate(Math.max(0, feats.findIndex((f) => f.classList.contains("is-current"))));
      } else if (io) {
        io.disconnect(); io = null;
        feats.forEach((f) => f.classList.remove("is-current"));
      }
    };
    apply();
    wide.addEventListener("change", apply);
  }

  if (!reduceMotion && finePointer) {
    // One update per pointer frame, with different offsets for art and foreground icons.
    const tiltResets = new Set();
    const tiltMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.querySelectorAll(".app-card, .more-card").forEach((card) => {
      const glare = document.createElement("span");
      glare.className = "tilt-glare";
      glare.setAttribute("aria-hidden", "true");
      card.appendChild(glare);
      let frame = 0, px = 0, py = 0, bounds;
      const update = () => {
        frame = 0;
        const r = bounds;
        const x = Math.max(0, Math.min(1, (px - r.left) / r.width));
        const y = Math.max(0, Math.min(1, (py - r.top) / r.height));
        const max = Math.max(1.5, Math.min(4, 1600 / r.width));
        card.style.setProperty("--ry", ((x - 0.5) * 2 * max).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - y) * 2 * max).toFixed(2) + "deg");
        card.style.setProperty("--layer-x", ((x - 0.5) * 12).toFixed(2) + "px");
        card.style.setProperty("--layer-y", ((y - 0.5) * 10).toFixed(2) + "px");
        card.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      };
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch" || tiltMotion.matches || card.classList.contains("reveal")) return;
        if (!bounds) bounds = card.getBoundingClientRect();
        px = e.clientX; py = e.clientY;
        card.classList.add("is-tilting");
        tiltResets.add(reset);
        if (!frame) frame = requestAnimationFrame(update);
      });
      const reset = () => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        bounds = null;
        card.classList.remove("is-tilting");
        card.style.removeProperty("--layer-x");
        card.style.removeProperty("--layer-y");
        tiltResets.delete(reset);
      };
      card.addEventListener("pointerleave", reset);
    });
    const resetTilts = () => tiltResets.forEach((reset) => reset());
    window.addEventListener("scroll", resetTilts, { passive: true });
    window.addEventListener("resize", resetTilts);
    window.addEventListener("pagehide", resetTilts);
    document.addEventListener("visibilitychange", () => { if (document.hidden) resetTilts(); });
    tiltMotion.addEventListener("change", resetTilts);

    // Hero icon wall follows the cursor: each icon slides by its own depth (2D parallax). No 3D rotation or translateZ:
    // those made the browser rasterise the icons and then warp/scale them, which left the logos blurry.
    const hero = document.querySelector(".hero");
    const wall = hero && hero.querySelector(".icon-wall");
    if (wall) {
      const depths = [40, 70, 25, 55, 90, 35, 65, 30, 80, 50];
      wall.querySelectorAll(".icon-tile").forEach((tile, i) => tile.style.setProperty("--z", depths[i % depths.length] + "px"));
      wall.classList.add("is-3d");
      let frame = 0, px = 0, py = 0;
      const update = () => {
        frame = 0;
        const r = hero.getBoundingClientRect();
        const x = (px - r.left) / r.width - 0.5, y = (py - r.top) / r.height - 0.5;
        wall.style.setProperty("--px", x.toFixed(3));
        wall.style.setProperty("--py", y.toFixed(3));
      };
      let frozenUntil = 0;
      hero.addEventListener("pointermove", (e) => {
        if (performance.now() < frozenUntil) return;
        px = e.clientX; py = e.clientY;
        if (!frame) frame = requestAnimationFrame(update);
      });
      hero.addEventListener("pointerleave", () => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        wall.style.setProperty("--px", "0");
        wall.style.setProperty("--py", "0");
      });
      // Coming back to this page (Back, or Safari restoring it from memory), the wall would still hold the tilt it
      // had when an icon was clicked and then swing toward the new cursor position. Flatten it at once, before the
      // return transition is captured, and keep it still until that transition has finished.
      const settle = (until) => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        wall.classList.add("no-ease");
        wall.style.setProperty("--px", "0");
        wall.style.setProperty("--py", "0");
        document.querySelectorAll(".is-tilting").forEach((c) => c.classList.remove("is-tilting"));
        frozenUntil = performance.now() + 1200;
        // An aborted transition rejects `finished`; the clean-up still runs, the rejection is expected
        Promise.resolve(until).finally(() => {
          frozenUntil = performance.now() + 250;
          requestAnimationFrame(() => wall.classList.remove("no-ease"));
        }).catch(() => {});
      };
      window.addEventListener("pageshow", (e) => { if (e.persisted) settle(); });
      window.addEventListener("pagereveal", (e) => { if (e.viewTransition || document.querySelector(".is-tilting")) settle(e.viewTransition ? e.viewTransition.finished : null); });
    }
  }

  setLanguage(detectLanguage());

  // Arriving with a #section in the URL (e.g. "About" from an app page): the language step above rewrites the
  // URL, which can cancel the browser's own jump, so jump once the page has loaded unless the visitor has scrolled.
  // "← All apps" style back links: when the visitor came from that page on this site, go back in history
  // instead, so they land exactly where they were (same scroll position) and the icon flies back to its spot.
  const samePage = (a, b) => a.origin === b.origin && a.pathname.replace(/\/index\.html$/, "/") === b.pathname.replace(/\/index\.html$/, "/");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.back-link, a[data-back]");
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !document.referrer) return;
    let from;
    try { from = new URL(document.referrer); } catch (err) { return; }
    if (window.history.length > 1 && samePage(from, new URL(a.href))) { e.preventDefault(); window.history.back(); }
  });

  // Page transitions: give the transition name only to the icon that was clicked, and remember where it was,
  // so the app page header icon grows out of it and, coming back, returns to exactly that spot.
  const VT_GROUPS = {
    wall: ".icon-wall .icon-tile",
    card: ".app-card .app-card-media img.app-icon, .app-card .title-row img",
    more: ".more-card .more-icon",
    hero: ".app-title-row img"
  };
  const vtKey = "careo-vt-origin";
  const vtStore = { get() { try { return JSON.parse(sessionStorage.getItem(vtKey) || "null"); } catch (e) { return null; } }, set(v) { try { sessionStorage.setItem(vtKey, JSON.stringify(v)); } catch (e) { /* no transition memory */ } } };
  const heroIcon = () => document.querySelector(VT_GROUPS.hero);
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.origin !== location.origin || a.pathname === location.pathname) return;
    let icon = null, group = null;
    for (const [g, sel] of Object.entries(VT_GROUPS)) {
      const scope = g === "card" ? a.closest(".app-card") : a;
      // Wall tiles are rounded by the link box itself (the image inside is square), so the box is what flies
      const found = scope && (g === "card" ? scope.querySelector(sel) : g === "wall" ? (a.matches(sel) ? a : null) : (a.matches(".more-card") ? a.querySelector(sel) : null));
      if (found) { icon = found; group = g; break; }
    }
    if (!icon) return;
    const hero = heroIcon();
    if (hero && hero !== icon) hero.style.viewTransitionName = "none";
    icon.style.viewTransitionName = "app-icon";
    vtStore.set({ page: location.pathname, group, index: [...document.querySelectorAll(VT_GROUPS[group])].indexOf(icon) });
  }, true);
  // Arriving back on the page an icon left from: that icon becomes the partner of the incoming header icon
  window.addEventListener("pagereveal", (e) => {
    const rec = vtStore.get();
    document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => { if (!el.matches(VT_GROUPS.hero)) el.style.viewTransitionName = ""; });
    if (!e.viewTransition || !rec || rec.page !== location.pathname) return;
    const el = document.querySelectorAll(VT_GROUPS[rec.group])[rec.index];
    if (!el) return;
    const hero = heroIcon();
    if (hero && hero !== el) hero.style.viewTransitionName = "none";
    el.style.viewTransitionName = "app-icon";
    e.viewTransition.finished.finally(() => { el.style.viewTransitionName = ""; if (hero) hero.style.viewTransitionName = ""; }).catch(() => {});
  });

  // "Back to top": the target is the sticky header, which the browser treats as already in view,
  // so the link would do nothing. Scroll the page to the top ourselves.
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#top"]');
    if (!a) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  });

  // In-page jumps (Highlights, Screenshots, Support, About, demos...): the section the link points to is centred
  // on screen below the sticky header. Support and About centre their shared row (or the single card when stacked);
  // a section too tall to fit starts at its own top edge, so its heading keeps the section's breathing room
  // instead of sticking to the header. #top and the skip link keep their own behaviour.
  const sectionOf = (target) => target.matches("section") ? target : target.closest("section");
  const jumpTo = (target, smooth) => {
    const header = document.querySelector(".site-header");
    const headerH = header ? header.offsetHeight : 0;
    const room = window.innerHeight - headerH - 32;
    const grid = target.closest("[data-center-jump]") || (target.matches(".support-grid") ? target : (target.closest(".support-grid") || target.querySelector(".support-grid")));
    const section = sectionOf(target);
    const content = section && (section.querySelector(":scope > .shell") || section);
    const fits = [grid, target.closest(".support-card"), content].find((el) => el && el.offsetHeight <= room);
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    if (!smooth) root.style.scrollBehavior = "auto";
    let top;
    if (fits) top = fits.getBoundingClientRect().top + window.scrollY - headerH - (room + 32 - fits.offsetHeight) / 2;
    else top = (section || target).getBoundingClientRect().top + window.scrollY - headerH;
    window.scrollTo({ top: Math.max(0, top) });
    if (!smooth) root.style.scrollBehavior = previous;
  };
  const jumpTarget = (hash) => {
    if (!hash || hash.length < 2 || hash === "#top" || hash === "#main") return null;
    try { return document.querySelector(hash); } catch (err) { return null; }
  };
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href*="#"]');
    if (!a || a.pathname !== location.pathname || a.host !== location.host) return;
    const target = jumpTarget(a.hash);
    if (!target) return;
    e.preventDefault();
    if (location.hash !== a.hash) history.pushState(null, "", a.hash);
    jumpTo(target, true);
  });

  // Arriving with a #section in the URL (e.g. "About" from an app page): the language step above rewrites the
  // URL, which can cancel the browser's own jump, so jump once the page has loaded unless the visitor has scrolled.
  window.addEventListener("load", () => {
    if (!location.hash || window.scrollY > 10) return;
    const target = jumpTarget(location.hash);
    if (target) jumpTo(target, false);
  });
})();

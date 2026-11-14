/* Privacy policy and account deletion pages.
   Each page keeps its own translations and render script; this file connects that script to the site header
   (language menu, theme menu), keeps the tab title short and builds the "On this page" contents list. */
(() => {
  const LABELS = { en: "On this page", fr: "Sur cette page", de: "Auf dieser Seite", it: "In questa pagina", ja: "このページの内容", ko: "이 페이지의 내용", pt: "Nesta página", ru: "На этой странице", es: "En esta página", tr: "Bu sayfada" };
  const PRIVACY = { en: "Privacy", fr: "Confidentialité", de: "Datenschutz", it: "Privacy", ja: "プライバシー", ko: "개인정보", pt: "Privacidade", ru: "Конфиденциальность", es: "Privacidad", tr: "Gizlilik" };
  const DELETE = { en: "Delete account", fr: "Supprimer le compte", de: "Konto löschen", it: "Elimina account", ja: "アカウント削除", ko: "계정 삭제", pt: "Eliminar conta", ru: "Удалить аккаунт", es: "Eliminar cuenta", tr: "Hesap silme" };
  const BOOKLIO = { en: "Booklio", fr: "Livreo", de: "Buchio", it: "Librio", ja: "ヨムノート", ko: "북로그", pt: "Livroo", ru: "Книгли", es: "Libroo", tr: "KitApp" };
  const NAMES = { moviequiz: "Movie Quiz", fquiz: "F Quiz", spingo: "Spin & Go", cvpilot: "CVPilot", dishtopia: "Dishtopia", archiver: "ArchiveR" };
  const root = document.documentElement;
  const themeClass = [...document.body.classList].find((c) => c.startsWith("theme-"));
  const appKey = themeClass ? themeClass.slice(6) : "";
  const isDeletion = document.body.classList.contains("account-page");
  // A policy may render a regional version (es-419, fr-CA, pt-BR); labels below follow its base language
  const fullLang = () => root.lang || "en";
  const lang = () => fullLang().split("-")[0];

  // Tab title: "App · Privacy" / "App · Delete account"
  const shortTitle = () => {
    const name = appKey === "booklio" ? (BOOKLIO[lang()] || BOOKLIO.en) : NAMES[appKey];
    if (!name) return;
    const label = (isDeletion ? DELETE : PRIVACY)[lang()] || (isDeletion ? DELETE.en : PRIVACY.en);
    const title = `${name} · ${label}`;
    if (document.title !== title) document.title = title;
  };
  shortTitle();
  new MutationObserver(shortTitle).observe(document.head, { childList: true, subtree: true, characterData: true });

  // The page's own script renders from the hidden <select>; the header's language menu (site.js) sets <html lang>.
  // Keep the two in step: whenever the document language changes, the page re-renders in that language.
  const select = document.getElementById("languageSelect");
  const sync = () => {
    if (!select) return;
    const l = fullLang();
    if (select.value === l || ![...select.options].some((o) => o.value === l)) return;
    select.value = l;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };
  sync();
  new MutationObserver(() => { shortTitle(); sync(); }).observe(root, { attributes: true, attributeFilter: ["lang"] });

  // Contents list
  const content = document.getElementById("policyContent") || document.getElementById("content");
  const toc = document.getElementById("docToc");
  if (!content || !toc) return;
  const wide = window.matchMedia("(min-width: 1021px)");
  let links = [];
  let spy;

  function observeHeadings(headings) {
    if (spy) spy.disconnect();
    if (!("IntersectionObserver" in window)) return;
    spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-80px 0px -65% 0px" });
    headings.forEach((h) => spy.observe(h));
  }

  function build() {
    const headings = [...content.querySelectorAll("h2")];
    headings.forEach((h, i) => { h.id = `section-${i + 1}`; });
    const label = LABELS[lang()] || LABELS.en;
    toc.setAttribute("aria-label", label);
    toc.hidden = headings.length < 3;
    if (toc.hidden) return;
    const details = document.createElement("details");
    details.open = wide.matches;
    const summary = document.createElement("summary");
    summary.textContent = label;
    const ol = document.createElement("ol");
    headings.forEach((h) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.textContent = h.textContent.replace(/^\s*\d+\s*[.)]\s*/, "");
      li.appendChild(a);
      ol.appendChild(li);
    });
    details.append(summary, ol);
    toc.replaceChildren(details);
    links = [...ol.querySelectorAll("a")];
    observeHeadings(headings);
  }

  let pending = 0;
  const rebuild = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(build); };
  build();
  new MutationObserver(rebuild).observe(content, { childList: true, subtree: true, characterData: true });
  wide.addEventListener("change", () => { const d = toc.querySelector("details"); if (d) d.open = wide.matches; });

  toc.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    if (!wide.matches) { const d = toc.querySelector("details"); if (d) d.open = false; }
    links.forEach((l) => l.classList.toggle("is-active", l === a));
  });
})();

/* Page-local wheel: a single compositor animation per click; no idle loop. */
(() => {
  const wheel = document.getElementById('mini-wheel');
  if (!wheel) return;
  const button = document.getElementById('spin-demo-button');
  const hub = document.getElementById('spin-demo-hub');
  const output = document.getElementById('spin-demo-result');
  const labels = [...wheel.querySelectorAll('.wheel-label')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const table = () => (window.CAREO_I18N || {})[document.documentElement.lang] || window.CAREO_I18N.en;
  let selected = null, rotation = 0, animation = null, spinning = false;
  const render = () => {
    const text = table();
    labels.forEach((label, i) => { label.textContent = text['spin.choices'][i]; });
    document.getElementById('spin-demo-options').textContent = text['spin.choices'].join(', ');
    button.textContent = text[spinning ? 'spin.spinning' : 'spin.action'];
    hub.setAttribute('aria-label', text[spinning ? 'spin.spinning' : 'spin.action']);
    output.textContent = spinning ? text['spin.spinning'] : selected === null ? text['spin.ready'] : text['spin.result'].replace('{choice}', text['spin.choices'][selected]);
  };
  button.disabled = false;
  hub.disabled = false;
  hub.addEventListener('click', () => button.click());
  button.addEventListener('click', async () => {
    if (spinning) return;
    spinning = true;
    button.disabled = true;
    hub.disabled = true;
    render();
    const index = Math.floor(Math.random() * labels.length);
    const end = (360 - index * 60) % 360;
    const target = rotation + 5 * 360 + (end - rotation + 360) % 360;
    if (!motion.matches && wheel.animate) {
      animation = wheel.animate([{ transform: `rotate(${rotation}deg)` }, { transform: `rotate(${target}deg)` }], { duration: 2600, easing: 'cubic-bezier(.15,.75,.12,1)', fill: 'forwards' });
      try { await animation.finished; } catch (error) { /* Page restore can cancel a running animation. */ }
    }
    rotation = end;
    wheel.style.transform = `rotate(${end}deg)`;
    if (animation) { animation.cancel(); animation = null; }
    selected = index;
    spinning = false;
    button.disabled = false;
    hub.disabled = false;
    render();
  });
  motion.addEventListener('change', () => { if (motion.matches && animation) animation.finish(); });
  window.addEventListener('pagehide', () => { if (animation) animation.finish(); });
  document.addEventListener('careo:language', render);
  render();
})();

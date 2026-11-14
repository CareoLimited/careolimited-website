/* Live sample screens inside the site's existing device mockup frames. */
(() => {
  const poster = document.getElementById('poly-poster');
  if (!poster) return;
  const language = document.getElementById('poly-language');
  const device = document.getElementById('poly-device');
  const layout = document.getElementById('poly-layout');
  const background = document.getElementById('poly-background');
  const output = document.getElementById('poly-meta');
  const mockups = [...poster.querySelectorAll('.sample-device')];
  const frameClasses = { iphone: 'iphone', ipad: 'ipad', android: 'android-phone', tablet: 'android-tablet' };
  const sizes = { iphone: '1320 × 2868', ipad: '2064 × 2752', android: '1080 × 1920', tablet: '1600 × 2560' };
  let chosenLanguage = false;
  language.value = document.documentElement.lang;
  const render = () => {
    const sampleLanguage = language.value;
    const all = window.CAREO_I18N;
    const text = all[sampleLanguage] || all.en;
    poster.lang = sampleLanguage;
    poster.dataset.device = device.value;
    mockups.forEach((mockup) => {
      mockup.classList.remove(...Object.values(frameClasses));
      mockup.classList.add(frameClasses[device.value]);
    });
    poster.dataset.layout = layout.value;
    poster.dataset.background = background.value;
    poster.querySelectorAll('[data-preview-text]').forEach((el) => { el.textContent = text[el.dataset.previewText]; });
    output.textContent = `${language.selectedOptions[0].textContent} · ${device.selectedOptions[0].textContent} · ${layout.selectedOptions[0].textContent} · ${background.selectedOptions[0].textContent} · ${sizes[device.value]} px`;
  };
  language.disabled = device.disabled = layout.disabled = background.disabled = false;
  language.addEventListener('change', () => { chosenLanguage = true; render(); });
  device.addEventListener('change', render);
  layout.addEventListener('change', render);
  background.addEventListener('change', render);
  document.addEventListener('careo:language', () => {
    if (!chosenLanguage) language.value = document.documentElement.lang;
    render();
  });
  render();
})();

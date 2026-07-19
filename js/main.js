import { FitTrackApp } from '../app.js?v=20260719-22';

function openSectionFallback(section) {
  const target = document.getElementById(`${section}Section`);
  if (!target) return;
  document.querySelectorAll('.section').forEach(item => item.classList.remove('active', 'section-enter-from-left', 'section-enter-from-right'));
  document.querySelectorAll('.nav-btn').forEach(item => item.classList.toggle('active', item.dataset.section === section));
  target.classList.add('active', 'section-enter-from-right');
  window.history.replaceState(null, '', `#${section}`);
}

document.addEventListener('DOMContentLoaded', () => {
  // Navegación independiente: no queda bloqueada si falla algún módulo secundario.
  document.addEventListener('click', event => {
    const button = event.target.closest('.nav-btn[data-section]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.app?.switchSection) window.app.switchSection(button.dataset.section);
    else openSectionFallback(button.dataset.section);
  }, true);

  try {
    window.app = new FitTrackApp();
  } catch (error) {
    console.error('FamilyGYM: error de inicio', error);
    openSectionFallback(window.location.hash.slice(1) || 'home');
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js?v=20260719-22').catch(() => {});
});

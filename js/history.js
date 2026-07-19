import { formatDate, escapeHtml } from '../utils.js';
import { MUSCLE_COLORS } from '../constants.js';

export function getDayMuscleColors(app, date) {
  const exercises = app.getExercisesForDate(date);
  const colors = new Set();
  exercises.forEach(exercise => (exercise.series || []).forEach((series, index) => {
    if ((series.sets || []).length) colors.add(MUSCLE_COLORS[app.muscleGroups[index]] || '#64748b');
  }));
  return [...colors];
}

export class HistoryManager {
  constructor(app) { this.app = app; this.type = 'all'; this.muscle = 'all'; this.query = ''; this.view = 'list'; this.calendarDate = new Date(); }
  init() {}
  setQuery(query) { this.query = String(query || '').toLowerCase(); this.render(); }
  setFilter(type, filter) {
    if (type === 'type') this.type = filter || 'all';
    if (type === 'muscle') this.muscle = filter || 'all';
    document.querySelectorAll(`.history-filter-btn[data-type="${type}"]`).forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
    this.render();
  }
  setView(view) {
    this.view = view === 'calendar' ? 'calendar' : 'list';
    document.querySelectorAll('.history-view-toggle .history-view-btn').forEach(button => button.classList.toggle('active', button.dataset.historyView === this.view));
    this.render();
  }
  render() {
    const container = document.getElementById('workoutHistoryList');
    if (!container) return;
    if (this.view === 'calendar') return this.renderCalendar(container);
    const exerciseData = this.app.exercisesData && typeof this.app.exercisesData === 'object' ? this.app.exercisesData : {};
    const cardioData = this.app.cardioData && typeof this.app.cardioData === 'object' ? this.app.cardioData : {};
    const dates = new Set([...Object.keys(exerciseData), ...Object.keys(cardioData)]);
    const rows = [...dates].sort().reverse().map(date => {
      const exercises = Array.isArray(exerciseData[date]) ? exerciseData[date] : [];
      const cardio = Array.isArray(cardioData[date]) ? cardioData[date] : [];
      const matchesText = !this.query || date.includes(this.query) || exercises.some(item => item.name.toLowerCase().includes(this.query));
      const matchesMuscle = this.muscle === 'all' || exercises.some(item => (item.series || [])[this.app.muscleGroups.indexOf(this.muscle)]?.sets?.length);
      const matchesType = this.type === 'all' || (this.type === 'cardio' ? cardio.length : exercises.length);
      if (!matchesText || !matchesMuscle || !matchesType) return '';
      const exerciseNames = exercises.map(item => escapeHtml(item.name)).join(', ');
      const cardioText = cardio.map(item => `${escapeHtml(item.type || 'Cardio')} · ${item.minutes || 0} min`).join(', ');
      const labels = [exercises.length ? `${exercises.length} ejercicio${exercises.length === 1 ? '' : 's'}` : '', cardio.length ? `${cardio.length} cardio` : ''].filter(Boolean).map(label => `<span>${label}</span>`).join('');
      return `<article class="history-item"><div class="history-date"><strong>${new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</strong><small>${new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long' })}</small></div><div class="history-summary"><p>${exerciseNames || cardioText}</p><div class="history-meta">${labels}</div></div><button type="button" class="history-open-btn" data-history-date="${date}" aria-label="Abrir entrenamiento del ${date}">›</button></article>`;
    }).filter(Boolean);
    container.innerHTML = rows.length ? rows.join('') : '<p class="text-muted">No hay entrenamientos que coincidan.</p>';
    container.querySelectorAll('[data-history-date]').forEach(button => button.addEventListener('click', () => this.app.openHistoryDay(button.dataset.historyDate)));
  }
  renderCalendar(container) {
    const exerciseData = this.app.exercisesData && typeof this.app.exercisesData === 'object' ? this.app.exercisesData : {};
    const cardioData = this.app.cardioData && typeof this.app.cardioData === 'object' ? this.app.cardioData : {};
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const cells = Array.from({ length: startOffset + totalDays }, (_, index) => {
      if (index < startOffset) return '<span class="history-calendar-empty"></span>';
      const day = index - startOffset + 1;
      const date = formatDate(new Date(year, month, day));
      const hasExercise = Array.isArray(exerciseData[date]) && exerciseData[date].length > 0;
      const hasCardio = Array.isArray(cardioData[date]) && cardioData[date].length > 0;
      const marker = hasExercise || hasCardio ? `<span class="history-calendar-marker${hasCardio && !hasExercise ? ' cardio' : ''}"></span>` : '';
      return `<button type="button" class="history-calendar-day${hasExercise || hasCardio ? ' has-entry' : ''}" data-history-date="${date}"><span>${day}</span>${marker}</button>`;
    }).join('');
    const label = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    container.innerHTML = `<div class="history-calendar-header"><button type="button" class="history-month-btn" data-history-month="-1" aria-label="Mes anterior">‹</button><strong>${label}</strong><button type="button" class="history-month-btn" data-history-month="1" aria-label="Mes siguiente">›</button></div><div class="history-calendar-weekdays">${weekDays.map(day => `<span>${day}</span>`).join('')}</div><div class="history-calendar-grid">${cells}</div>`;
    container.querySelectorAll('[data-history-date]').forEach(button => button.addEventListener('click', () => this.app.openHistoryDay(button.dataset.historyDate)));
    container.querySelectorAll('[data-history-month]').forEach(button => button.addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() + Number(button.dataset.historyMonth)); this.render(); }));
  }
}

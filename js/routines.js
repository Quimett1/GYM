import { escapeHtml } from '../utils.js';

export class RoutinesManager {
  constructor(app) { this.app = app; this.key = 'fittrack_routines'; this.routines = this.load(); }
  load() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } }
  save() { localStorage.setItem(this.key, JSON.stringify(this.routines)); }
  init() {
    document.getElementById('createRoutineBtn')?.addEventListener('click', () => this.open());
    document.getElementById('saveRoutineFromDayBtn')?.addEventListener('click', () => this.saveCurrentDay());
    document.getElementById('duplicateWorkoutBtn')?.addEventListener('click', () => this.duplicateDay());
    document.getElementById('addRoutineExerciseBtn')?.addEventListener('click', () => this.addExerciseRow());
    document.getElementById('cancelRoutineFormBtn')?.addEventListener('click', () => document.getElementById('routineModal')?.close());
    document.getElementById('routineForm')?.addEventListener('submit', event => { event.preventDefault(); this.saveForm(); });
    document.getElementById('cancelRoutineApplyBtn')?.addEventListener('click', () => document.getElementById('routineApplyModal')?.close());
    document.getElementById('routineApplyForm')?.addEventListener('submit', event => { event.preventDefault(); this.applyPreparedRoutine(); });
    this.render();
  }
  open(routine = null) {
    document.getElementById('routineEditId').value = routine?.id || '';
    document.getElementById('routineNameInput').value = routine?.name || '';
    document.getElementById('routineExercisesList').innerHTML = '';
    (routine?.exercises || ['']).forEach(name => this.addExerciseRow(name));
    document.getElementById('routineModal').showModal();
  }
  addExerciseRow(value = '') {
    const list = document.getElementById('routineExercisesList');
    const row = document.createElement('div'); row.className = 'routine-exercise-row';
    row.innerHTML = `<input class="input-field" value="${escapeHtml(value)}" placeholder="Ejercicio"><button type="button" class="icon-btn" title="Quitar">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove()); list.appendChild(row);
  }
  saveForm() {
    const name = document.getElementById('routineNameInput').value.trim();
    const exercises = [...document.querySelectorAll('#routineExercisesList input')].map(input => input.value.trim()).filter(Boolean);
    if (!name || !exercises.length) return alert('Añade un nombre y al menos un ejercicio.');
    const id = document.getElementById('routineEditId').value;
    const routine = { id: id || crypto.randomUUID(), name, exercises };
    const index = this.routines.findIndex(item => item.id === id);
    if (index >= 0) this.routines[index] = routine; else this.routines.push(routine);
    this.save(); this.render(); document.getElementById('routineModal').close(); this.app.showToast('Rutina guardada.', 'success');
  }
  saveCurrentDay() {
    const date = this.app.selectedDate || new Date(); const exercises = this.app.getExercisesForDate(date).map(item => item.name);
    if (!exercises.length) return alert('Primero registra ejercicios en el día seleccionado.');
    this.open({ name: `Rutina ${date.toLocaleDateString('es-ES')}`, exercises });
  }
  duplicateDay() {
    const source = this.app.selectedDate || new Date(); const targetText = prompt('Fecha de destino (AAAA-MM-DD):');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetText || '')) return;
    const sourceKey = `${source.getFullYear()}-${String(source.getMonth() + 1).padStart(2, '0')}-${String(source.getDate()).padStart(2, '0')}`;
    this.app.exercisesData[targetText] = structuredClone(this.app.exercisesData[sourceKey] || []);
    this.app.exercisesData[targetText].forEach(item => item.date = targetText); this.app.saveExercises(); this.app.showToast('Entrenamiento duplicado.', 'success');
  }
  openApply(id) {
    const routine = this.routines.find(item => item.id === id); if (!routine) return;
    document.getElementById('routineApplyId').value = id;
    document.getElementById('routineApplyTitle').textContent = routine.name;
    const groups = this.app.muscleGroups;
    const container = document.getElementById('routineApplyExercises');
    container.innerHTML = routine.exercises.map(name => `<section class="routine-apply-row" data-exercise="${escapeHtml(name)}"><h3>${escapeHtml(name)}</h3><select class="input-field routine-muscle-select" data-field="muscle" aria-label="Grupo muscular">${groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join('')}</select><div class="routine-series-list"></div><button type="button" class="add-routine-series" data-add-series>+ Añadir serie</button></section>`).join('');
    container.querySelectorAll('.routine-apply-row').forEach(row => this.addRoutineSeriesRow(row));
    container.querySelectorAll('[data-add-series]').forEach(button => button.addEventListener('click', () => this.addRoutineSeriesRow(button.closest('.routine-apply-row'))));
    document.getElementById('routineApplyModal').showModal();
  }
  addRoutineSeriesRow(exerciseRow) {
    const list = exerciseRow.querySelector('.routine-series-list'); const number = list.children.length + 1;
    const row = document.createElement('div'); row.className = 'routine-series-row';
    row.innerHTML = `<span>Serie ${number}</span><input type="number" class="input-field" data-field="weight" placeholder="Peso (kg)" min="0" step="0.5" aria-label="Peso de la serie ${number}"><input type="number" class="input-field" data-field="reps" placeholder="Reps" min="0" aria-label="Repeticiones de la serie ${number}"><button type="button" class="remove-routine-series" aria-label="Eliminar serie ${number}">×</button>`;
    row.querySelector('button').addEventListener('click', () => { row.remove(); this.renumberRoutineSeries(list); }); list.appendChild(row);
  }
  renumberRoutineSeries(list) { [...list.children].forEach((row, index) => row.querySelector('span').textContent = `Serie ${index + 1}`); }
  applyPreparedRoutine() {
    const id = document.getElementById('routineApplyId').value;
    const routine = this.routines.find(item => item.id === id); if (!routine) return;
    const date = this.app.selectedDate || new Date(); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.app.selectedDate = date;
    const rows = [...document.querySelectorAll('#routineApplyExercises .routine-apply-row')];
    this.app.exercisesData[key] = rows.map(row => {
      const muscleGroup = row.querySelector('[data-field="muscle"]').value; const muscleIndex = Math.max(this.app.muscleGroups.indexOf(muscleGroup), 0);
      const sets = [...row.querySelectorAll('.routine-series-row')].map(seriesRow => ({ weight: seriesRow.querySelector('[data-field="weight"]').value, reps: seriesRow.querySelector('[data-field="reps"]').value }));
      const series = this.app.muscleGroups.map(() => ({ sets: [] })); series[muscleIndex].sets = sets;
      return { name: row.dataset.exercise, muscleGroup, date: key, series };
    });
    this.app.saveExercises(); this.app.renderCalendar(); document.getElementById('routineApplyModal').close(); this.app.openModal(); this.app.showToast('Rutina aplicada al entrenamiento.', 'success');
  }
  remove(id) { this.routines = this.routines.filter(item => item.id !== id); this.save(); this.render(); this.app.showToast('Rutina eliminada.', 'success'); }
  render() {
    const list = document.getElementById('routinesList'); if (!list) return;
    list.innerHTML = this.routines.length ? this.routines.map(routine => `<article class="routine-card"><h3>${escapeHtml(routine.name)}</h3><p>${routine.exercises.map(escapeHtml).join(' · ')}</p><button class="btn-primary" data-apply="${routine.id}">Usar</button><button class="btn-secondary" data-edit="${routine.id}">Editar</button><button class="btn-cancel" data-delete="${routine.id}">Eliminar</button></article>`).join('') : '<div class="empty-state"><span>📋</span><p>Crea tu primera rutina para reutilizarla cuando quieras.</p></div>';
    list.querySelectorAll('[data-apply]').forEach(button => button.addEventListener('click', () => this.openApply(button.dataset.apply)));
    list.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => this.open(this.routines.find(item => item.id === button.dataset.edit))));
    list.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => this.remove(button.dataset.delete)));
  }
}

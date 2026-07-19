import { escapeHtml, formatDate } from '../utils.js';

export class NutritionManager {
  constructor(app) { this.app = app; this.key = 'familygym_nutrition'; this.data = this.load(); }
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key)) || {};
      return { meals: saved.meals && typeof saved.meals === 'object' ? saved.meals : {}, measurements: Array.isArray(saved.measurements) ? saved.measurements : [] };
    } catch { return { meals: {}, measurements: [] }; }
  }
  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); }
  today() { return formatDate(new Date()); }
  init() {
    document.getElementById('addMealBtn')?.addEventListener('click', () => this.addMeal());
    document.getElementById('addMeasurementBtn')?.addEventListener('click', () => this.addMeasurement());
    this.render();
  }
  addMeal() {
    const get = id => document.getElementById(id);
    const name = get('mealNameInput')?.value.trim();
    if (!name) return this.app.showToast('Escribe el nombre de la comida.', 'warning');
    const meal = { id: crypto.randomUUID(), name, calories: Number(get('mealCaloriesInput')?.value) || 0, protein: Number(get('mealProteinInput')?.value) || 0, carbs: Number(get('mealCarbsInput')?.value) || 0, fat: Number(get('mealFatInput')?.value) || 0 };
    (this.data.meals[this.today()] ||= []).push(meal);
    ['mealNameInput', 'mealCaloriesInput', 'mealProteinInput', 'mealCarbsInput', 'mealFatInput'].forEach(id => { if (get(id)) get(id).value = ''; });
    this.save(); this.renderMeals(); this.app.showToast('Comida guardada.', 'success');
  }
  removeMeal(id) { this.data.meals[this.today()] = (this.data.meals[this.today()] || []).filter(meal => meal.id !== id); this.save(); this.renderMeals(); this.app.showToast('Comida eliminada.', 'success'); }
  renderMeals() {
    const meals = Array.isArray(this.data.meals[this.today()]) ? this.data.meals[this.today()] : [];
    const totals = meals.reduce((sum, meal) => ({ calories: sum.calories + (Number(meal.calories) || 0), protein: sum.protein + (Number(meal.protein) || 0), carbs: sum.carbs + (Number(meal.carbs) || 0), fat: sum.fat + (Number(meal.fat) || 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const totalsElement = document.getElementById('mealTotals'); if (totalsElement) totalsElement.textContent = `Total: ${totals.calories} kcal · P ${totals.protein} g · C ${totals.carbs} g · G ${totals.fat} g`;
    const list = document.getElementById('mealsList'); if (!list) return;
    list.innerHTML = meals.length ? meals.map(meal => `<div class="meal-item"><strong>${escapeHtml(meal.name)}</strong><span>${Number(meal.calories) || 0} kcal</span><button class="icon-btn" data-meal="${meal.id}" aria-label="Eliminar comida">×</button></div>`).join('') : '<div class="empty-state"><span>🍽️</span><p>Aún no has registrado comidas hoy.</p></div>';
    list.querySelectorAll('[data-meal]').forEach(button => button.addEventListener('click', () => this.removeMeal(button.dataset.meal)));
  }
  addMeasurement() {
    const fields = { chest: 'measChest', waist: 'measWaist', hips: 'measHips', arm: 'measArm', thigh: 'measThigh' };
    const values = Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, Number(document.getElementById(id)?.value) || 0]));
    if (!Object.values(values).some(Boolean)) return this.app.showToast('Introduce al menos una medida.', 'warning');
    this.data.measurements.unshift({ date: this.today(), ...values }); this.save(); this.renderMeasurements(); this.app.showToast('Medidas guardadas.', 'success');
  }
  renderMeasurements() {
    const list = document.getElementById('measurementsHistory'); if (!list) return;
    const records = this.data.measurements.slice(0, 10);
    list.innerHTML = records.length ? records.map(item => `<p>${item.date}: pecho ${item.chest || '—'} · cintura ${item.waist || '—'} · brazo ${item.arm || '—'} cm</p>`).join('') : '<div class="empty-state compact"><span>📏</span><p>Aún no hay medidas registradas.</p></div>';
  }
  render() { this.renderMeals(); this.renderMeasurements(); }
}

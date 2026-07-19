// FitTrack - Tu Entrenamiento App
import {
    EXERCISE_TECHNIQUE_TIPS,
    EXERCISE_VIDEOS,
    CARDIO_TYPES,
    MUSCLE_COLORS
} from './js/constants.js';
import { formatDate, escapeHtml as htmlEscape, normalizeExerciseName as normExerciseName, capitalize as capText } from './js/utils.js';
import { RoutinesManager } from './js/features/routines.js';
import { NutritionManager } from './js/features/nutrition.js';
import { HistoryManager, getDayMuscleColors } from './js/features/history.js';
import { AdvancedStatsManager } from './js/features/stats-advanced.js';
import { AccountManager } from './js/features/account.js';
import { ExerciseSearchManager } from './js/features/exercise-search.js';

export class FitTrackApp {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.viewMode = 'week'; // week, month
        this.exercisesStorageKey = 'fittrack_exercises';
        this.settingsStorageKey = 'fittrack_settings';
        this.cardioStorageKey = 'fittrack_cardio';
        this.cardioData = this.loadCardioData();
        this.muscleGroups = ['Bíceps', 'Tríceps', 'Pecho', 'Espalda', 'Pierna'];
        this.charts = {};
        this.timerInterval = null;
        this.favoriteExercises = this.loadFavoriteExercises();
        this.personalRecords = this.loadPersonalRecords();
        this.bodyWeight = this.loadBodyWeight();
        this.bilboStorageKey = 'fittrack_bilbo';
        this.bilboData = this.loadBilboData();

        this.routines = new RoutinesManager(this);
        this.nutrition = new NutritionManager(this);
        this.history = new HistoryManager(this);
        this.advancedStats = new AdvancedStatsManager(this);
        this.account = new AccountManager(this);
        this.exerciseSearch = new ExerciseSearchManager(this);
        this.getDayMuscleColors = (date) => getDayMuscleColors(this, date);
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.loadSettings();
        this.setupEventListeners();
        this.loadExercises();
        this.renderCalendar();
        this.applyTheme();
        this.renderWeightHistory();
        this.renderHomeDay();
        this.renderWeeklySummary();
        this.renderBilbo();
        this.routines.init();
        this.nutrition.init();
        this.history.init();
        this.account.init();
        this.exerciseSearch.init();
    }

    cacheElements() {
        this.elements = {
            calendar: document.getElementById('calendar'),
            currentMonthYear: document.getElementById('currentMonthYear'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            modal: document.getElementById('exerciseModal'),
            dateInput: document.getElementById('dateInput'),
            selectedDateElement: document.getElementById('selectedDate'),
            exercisesList: document.getElementById('exercisesList'),
            addExerciseBtn: document.getElementById('addExerciseBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            resetBtn: document.getElementById('resetBtn'),
            themeToggle: document.getElementById('themeToggle'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            muscleGroupsList: document.getElementById('muscleGroupsList'),
            addMuscleGroup: document.getElementById('addMuscleGroup'),
            restTime: document.getElementById('restTime'),
            startTimer: document.getElementById('startTimer'),
            timerDisplay: document.getElementById('timerDisplay'),
            rmWeight: document.getElementById('rmWeight'),
            rmReps: document.getElementById('rmReps'),
            calculateRM: document.getElementById('calculateRM'),
            rmResult: document.getElementById('rmResult'),
            favoriteModal: document.getElementById('favoriteExerciseModal'),
            favoriteExercisesList: document.getElementById('favoriteExercisesList'),
            customExerciseName: document.getElementById('customExerciseName'),
            addCustomExercise: document.getElementById('addCustomExercise'),
            cancelFavoriteBtn: document.getElementById('cancelFavoriteBtn'),
            bodyWeightInput: document.getElementById('bodyWeightInput'),
            bodyWeightDate: document.getElementById('bodyWeightDate'),
            addBodyWeight: document.getElementById('addBodyWeight'),
            weightHistory: document.getElementById('weightHistory'),
            prList: document.getElementById('prList'),
            calSex: document.getElementById('calSex'),
            calAge: document.getElementById('calAge'),
            calHeight: document.getElementById('calHeight'),
            calWeight: document.getElementById('calWeight'),
            calActivity: document.getElementById('calActivity'),
            calGoal: document.getElementById('calGoal'),
            calculateCalories: document.getElementById('calculateCalories'),
            calorieResult: document.getElementById('calorieResult'),
            homeDayCard: document.getElementById('homeDayCard'),
            homeWeekday: document.getElementById('homeWeekday'),
            homeDate: document.getElementById('homeDate'),
            cardioList: document.getElementById('cardioList'),
            addCardioBtn: document.getElementById('addCardioBtn'),
            cardioModal: document.getElementById('cardioModal'),
            cardioTypeSelect: document.getElementById('cardioTypeSelect'),
            cardioMinutesInput: document.getElementById('cardioMinutesInput'),
            cardioDistanceInput: document.getElementById('cardioDistanceInput'),
            cardioCaloriesInput: document.getElementById('cardioCaloriesInput'),
            saveCardioBtn: document.getElementById('saveCardioBtn'),
            cancelCardioBtn: document.getElementById('cancelCardioBtn'),
        };
    }

    setupEventListeners() {
        // Navegación del calendario
        this.elements.prevMonth.addEventListener('click', () => this.changeMonth(-1));
        this.elements.nextMonth.addEventListener('click', () => this.changeMonth(1));
        
        // Selector de vista (toggle semana/mes)
        document.getElementById('viewToggleBtn').addEventListener('click', () => {
            this.viewMode = this.viewMode === 'week' ? 'month' : 'week';
            const btn = document.getElementById('viewToggleBtn');
            btn.textContent = this.viewMode === 'week' ? '📅 Semana' : '📅 Mes';
            btn.dataset.view = this.viewMode;
            // Transición suave
            const cal = this.elements.calendar;
            cal.style.opacity = '0';
            cal.style.transform = 'translateY(6px)';
            setTimeout(() => {
                this.renderCalendar();
                requestAnimationFrame(() => {
                    cal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    cal.style.opacity = '1';
                    cal.style.transform = 'translateY(0)';
                });
            }, 150);
        });

        // Navegación principal
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.switchSection(section);
            });
        });

        // Modal del ejercicio
        this.elements.addExerciseBtn.addEventListener('click', () => this.openFavoriteModal());
        this.elements.cancelBtn.addEventListener('click', () => this.closeModal());
        
        this.elements.modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveExercises();
        });

        // Guardar fecha al cambiar input
        this.elements.dateInput.addEventListener('input', () => {
            const date = new Date(this.elements.dateInput.value);
            if (!isNaN(date.getTime())) {
                this.selectedDate = date;
                this.loadExercisesForDate(this.selectedDate);
            }
        });

        // Borrar datos
        this.elements.resetBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de borrar todos los datos?')) {
                localStorage.removeItem(this.exercisesStorageKey);
                localStorage.removeItem(this.cardioStorageKey);
                this.loadExercises();
                this.cardioData = this.loadCardioData();
                this.renderCalendar();
            }
        });

        // Cambio de tema
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Exportar datos
        this.elements.exportBtn.addEventListener('click', () => this.exportData());

        // Importar datos
        this.elements.importBtn.addEventListener('click', () => this.importData());

        // Añadir grupo muscular
        this.elements.addMuscleGroup.addEventListener('click', () => this.addMuscleGroup());

        // Timer de descanso
        this.elements.startTimer.addEventListener('click', () => this.startRestTimer());

        // Calculadora 1RM
        this.elements.calculateRM.addEventListener('click', () => this.calculate1RM());

        // Modal de ejercicios favoritos
        this.elements.cancelFavoriteBtn.addEventListener('click', () => this.closeFavoriteModal());
        this.elements.addCustomExercise.addEventListener('click', () => this.addCustomExerciseToFavorites());

        // Modal de cardio
        this.elements.addCardioBtn.addEventListener('click', () => this.openCardioModal());
        this.elements.cancelCardioBtn.addEventListener('click', () => this.closeCardioModal());
        this.elements.saveCardioBtn.addEventListener('click', () => this.saveCardioEntry());
        this.elements.cardioModal.addEventListener('click', (e) => {
            if (e.target === this.elements.cardioModal) this.closeCardioModal();
        });

        // Registro de peso corporal
        this.elements.addBodyWeight.addEventListener('click', () => this.addBodyWeightFromUI());

        // Calculadora de calorías
        this.elements.calculateCalories.addEventListener('click', () => this.calculateCalories());

        // Establecer fecha actual por defecto para peso
        this.elements.bodyWeightDate.value = formatDate(new Date());

        // Cerrar modal con tecla ESC o fuera del modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.modal.open) {
                this.closeModal();
            }
        });

        // Click fuera del modal para cerrar
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });

        // Bilbo Method
        document.getElementById('bilboLogBtn').addEventListener('click', () => this.logBilboSession());
        document.getElementById('bilboResetBtn').addEventListener('click', () => this.resetBilbo());
        document.getElementById('bilboRepsInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.logBilboSession();
            }
        });
        // Bilbo Setup
        this.bilboWeightPick = 20;
        document.getElementById('bilboWeightMinus').addEventListener('click', () => {
            if (this.bilboWeightPick > 5) {
                this.bilboWeightPick = Math.round((this.bilboWeightPick - 2.5) * 10) / 10;
                document.getElementById('bilboWeightPick').textContent = this.bilboWeightPick;
                this.updateBilboSetupHint();
            }
        });
        document.getElementById('bilboWeightPlus').addEventListener('click', () => {
            if (this.bilboWeightPick < 200) {
                this.bilboWeightPick = Math.round((this.bilboWeightPick + 2.5) * 10) / 10;
                document.getElementById('bilboWeightPick').textContent = this.bilboWeightPick;
                this.updateBilboSetupHint();
            }
        });
        document.getElementById('bilboStartBtn').addEventListener('click', () => this.startBilbo());

        // 1RM input → calcula 50% automáticamente
        document.getElementById('bilboOrmInput').addEventListener('input', (e) => {
            const orm = parseFloat(e.target.value);
            if (orm > 0) {
                const half = Math.round((orm * 0.5) * 2) / 2; // redondear a 0.5
                this.bilboWeightPick = half;
                document.getElementById('bilboWeightPick').textContent = half;
                this.updateBilboSetupHint();
            }
        });

        // Reps +/−
        document.getElementById('bilboRepsMinus').addEventListener('click', () => {
            const input = document.getElementById('bilboRepsInput');
            const val = parseInt(input.value) || 0;
            if (val > 0) input.value = val - 1;
        });
        document.getElementById('bilboRepsPlus').addEventListener('click', () => {
            const input = document.getElementById('bilboRepsInput');
            const val = parseInt(input.value) || 0;
            input.value = val + 1;
        });
    }

    // Renderizado del calendario
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        this.elements.currentMonthYear.textContent = 
            new Date(year, month).toLocaleDateString('es-ES', { 
                month: 'long', year: 'numeric' 
            });

        // Limpiar calendario
        this.elements.calendar.innerHTML = '';
        this.elements.calendar.className = `calendar view-${this.viewMode}`;

        if (this.viewMode === 'month') {
            this.renderMonthView(year, month);
        } else if (this.viewMode === 'week') {
            this.renderWeekView();
        } else {
            this.renderDayView();
        }
    }

    renderDayView() {
        // Vista de día: una única fecha, la que se está consultando.
        const dayEl = this.createDayCell(this.currentDate, 'day', true);
        dayEl.classList.add('single-day-cell');
        dayEl.innerHTML = `
            <span class="day-name">${this.getDayName(this.currentDate)}</span>
            <span class="day-number">${this.currentDate.getDate()}</span>
        `;
        if (this.isSameDate(this.currentDate, new Date())) dayEl.classList.add('today');
        this.elements.calendar.appendChild(dayEl);

        // Ajustar fecha del modal por defecto
        if (!this.elements.dateInput.value) {
            this.elements.dateInput.value = formatDate(this.currentDate);
            this.selectedDate = new Date(this.currentDate);
        }
    }

    renderWeekView() {
        const weekStart = new Date(this.currentDate);
        const dayOfWeek = weekStart.getDay();
        
        // Ajustar para que lunes sea día 0
        if (dayOfWeek !== 1) {
            weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
        }

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            weekDays.push({ date, day: i });
        }

        this.renderWeekdayHeaders();

        // Renderizar día a día
        weekDays.forEach(({ date }) => {
            const isToday = this.isSameDate(date, this.currentDate);
            const isSelected = this.selectedDate && this.isSameDate(date, this.selectedDate);
            
            const dayEl = this.createDayCell(date, 'day', isToday || isSelected);
            if (isToday) dayEl.classList.add('today');

            dayEl.classList.add('week-day-cell');
            const colors = this.getDayMuscleColors(date);
            const dots = colors.map(c => `<span class="cal-dot" style="background:${c}"></span>`).join('');
            dayEl.innerHTML = `<span class="day-number">${date.getDate()}</span>${dots ? `<span class="cal-dots">${dots}</span>` : ''}`;
            
            this.elements.calendar.appendChild(dayEl);
        });

        if (!this.elements.dateInput.value) {
            this.elements.dateInput.value = formatDate(weekStart);
            if (!this.selectedDate) {
                this.selectedDate = new Date(weekStart);
            }
        }
    }

    renderMonthView(year, month) {
        // La semana comienza en lunes, igual que la vista semanal.
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        this.renderWeekdayHeaders();

        // Celdas vacías antes del primer día
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            this.elements.calendar.appendChild(emptyCell);
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = this.isSameDate(date, this.currentDate);
            const isSelected = this.selectedDate && this.isSameDate(date, this.selectedDate);

            const dayEl = this.createDayCell(date, 'day', isToday || isSelected);
            if (isToday) dayEl.classList.add('today');

            const hasWorkout = this.hasWorkoutOnDate(date);
            const exerciseCount = hasWorkout ? this.getExerciseCountOnDate(date) : 0;
            dayEl.classList.add('month-day-cell');
            const colors = this.getDayMuscleColors(date);
            const dots = colors.map(c => `<span class="cal-dot" style="background:${c}"></span>`).join('');
            dayEl.innerHTML = `
                <span class="day-number">${day}</span>
                ${exerciseCount ? `<span class="workout-count">${exerciseCount}</span>` : ''}
                ${dots ? `<span class="cal-dots">${dots}</span>` : ''}
            `;

            this.elements.calendar.appendChild(dayEl);
        }

        if (!this.elements.dateInput.value) {
            this.elements.dateInput.value = formatDate(this.currentDate);
            if (!this.selectedDate) {
                this.selectedDate = new Date(this.currentDate);
            }
        }
    }

    createDayCell(date, className, highlight = false) {
        const dayEl = document.createElement('div');
        dayEl.className = `day-cell ${className}`;
        
        const formattedDateStr = formatDate(date);
        const options = { weekday: 'short', day: 'numeric' };
        const dateString = date.toLocaleDateString('es-ES', options);
        
        dayEl.dataset.date = formattedDateStr;
        if (this.hasWorkoutOnDate(date)) {
            dayEl.classList.add('has-workout');
            const colors = this.getDayMuscleColors(date);
            if (colors.length) {
                dayEl.style.setProperty('--cal-color-1', colors[0]);
                dayEl.style.setProperty('--cal-color-2', colors[1] || colors[0]);
                dayEl.style.setProperty('--cal-color-3', colors[2] || colors[0]);
                dayEl.classList.add('has-workout-colored');
            }
        }
        if (highlight) dayEl.classList.add('selected');

        dayEl.innerHTML = `<span class="day-text">${dateString}</span>`;
        
        if (!className.includes('empty')) {
            dayEl.addEventListener('click', () => this.selectDate(date, formattedDateStr));
        }

        return dayEl;
    }

    openHistoryDay(dateStr) {
        this.selectedDate = new Date(`${dateStr}T12:00:00`);
        this.elements.dateInput.value = dateStr;
        this.openModal();
    }

    getDayName(date) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return date.getDay() === 0 ? 'Domingo' : days[date.getDay()];
    }

    selectDate(date, formattedDateStr) {
        this.selectedDate = new Date(formattedDateStr);
        
        // Guardar en input
        this.elements.dateInput.value = formatDate(this.selectedDate);
        
        // Limpiar selección visual previa
        document.querySelectorAll('.day-cell').forEach(el => el.classList.remove('selected'));
        
        // Añadir selección visual a la celda actual
        const targetCell = document.querySelector(`[data-date="${formattedDateStr}"]`);
        if (targetCell) targetCell.classList.add('selected');

        // Cargar ejercicios de la fecha seleccionada
        this.loadExercisesForDate(this.selectedDate);

        // Abrir modal si no está abierto
        if (!this.elements.modal.open) {
            this.openModal();
        }
    }

    toggleViewButtons() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.viewMode);
        });
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
        
        // Si el modal está abierto, actualizar la fecha del input
        if (this.elements.dateInput.value) {
            const selectedDate = new Date(this.elements.dateInput.value);
            selectedDate.setMonth(selectedDate.getMonth() + delta);
            this.elements.dateInput.value = formatDate(selectedDate);
            this.selectedDate = selectedDate;
            this.loadExercisesForDate(selectedDate);
        }
    }

    loadExercisesForDate(date) {
        const exercises = this.getExercisesForDate(date);
        
        // Actualizar título del modal
        this.elements.selectedDateElement.textContent = date.toLocaleDateString('es-ES', { 
            weekday: 'long', day: 'numeric', month: 'short' 
        });

        if (exercises.length === 0) {
            this.elements.exercisesList.innerHTML = `
                <div class="empty-placeholder" style="text-align:center;padding:2rem;color:var(--text-muted);">
                    No hay ejercicios registrados para este día<br>
                    <small>Toca "Añadir Ejercicio de Favoritos" para comenzar</small>
                </div>`;
            return;
        }

        this.elements.exercisesList.innerHTML = exercises.map((exercise, exerciseIndex) => {
            return `
            <div class="exercise-item" data-exercise-index="${exerciseIndex}">
                <div class="exercise-header" onclick="window.app.toggleExercisePanel(${exerciseIndex})">
                    <span class="exercise-name" title="${this.escapeHtml(this.getExerciseTip(exercise.name))}">${exercise.name}</span>
                    <div class="exercise-actions">
                        <button type="button" class="delete-btn" onclick="event.stopPropagation(); window.app.deleteExercise(${exerciseIndex})" title="Eliminar">🗑️</button>
                        <span class="toggle-icon">▼</span>
                    </div>
                </div>
                
                <div class="exercise-panel" id="exercisePanel${exerciseIndex}">
                    ${this.muscleGroups.map((muscle, muscleIndex) => {
                        const seriesData = exercise.series[muscleIndex]?.sets || [];
                        
                        return `
                        <div class="muscle-group-panel">
                            <div class="muscle-group-header" onclick="window.app.toggleMusclePanel(${exerciseIndex}, ${muscleIndex})">
                                <span class="muscle-group-name">${muscle}</span>
                                <span class="toggle-icon">▼</span>
                            </div>
                            <div class="muscle-group-content" id="musclePanel${exerciseIndex}_${muscleIndex}">
                                <div class="sets-container">
                                    ${seriesData.map((set, setIndex) => `
                                        <div class="set-row">
                                            <span class="set-number">Serie ${setIndex + 1}</span>
                                            <input type="number" class="weight-input" placeholder="Peso (kg)" 
                                                   data-exercise-index="${exerciseIndex}" 
                                                   data-muscle-index="${muscleIndex}" 
                                                   data-set-index="${setIndex}" 
                                                   value="${set.weight || ''}" min="0" step="0.5">
                                            <input type="number" class="reps-input" placeholder="Reps" 
                                                   data-exercise-index="${exerciseIndex}" 
                                                   data-muscle-index="${muscleIndex}" 
                                                   data-set-index="${setIndex}" 
                                                   value="${set.reps || ''}" min="0">
                                            <button type="button" class="remove-set-btn" 
                                                    onclick="event.stopPropagation(); window.app.removeSet(${exerciseIndex}, ${muscleIndex}, ${setIndex})" 
                                                    title="Eliminar serie">✖</button>
                                        </div>
                                    `).join('')}
                                </div>
                                <button type="button" class="add-set-btn" 
                                        onclick="event.stopPropagation(); window.app.addSet(${exerciseIndex}, ${muscleIndex})">
                                    ➕ Añadir Serie
                                </button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('');

        // Añadir eventos a los inputs de peso y repeticiones para guardar automáticamente
        document.querySelectorAll('.weight-input, .reps-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateSetFromInput(e.target);
            });
        });

        // Refrescar también la lista de cardio de este mismo día
        this.renderCardioForDate(date);
    }

    // ==================== CARDIO (Caminar / Correr / Bicicleta / Otro) ====================
    loadCardioData() {
        try {
            const data = localStorage.getItem(this.cardioStorageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error cargando cardio:', e);
            return {};
        }
    }

    getCardioForDate(date) {
        const dateStr = formatDate(date);
        return this.cardioData[dateStr] || [];
    }

    hasCardioOnDate(date) {
        const dateStr = formatDate(date);
        return Array.isArray(this.cardioData[dateStr]) && this.cardioData[dateStr].length > 0;
    }

    openCardioModal() {
        this.elements.cardioTypeSelect.value = 'caminar';
        this.elements.cardioMinutesInput.value = '';
        this.elements.cardioDistanceInput.value = '';
        this.elements.cardioCaloriesInput.value = '';
        this.elements.cardioModal.showModal();
    }

    closeCardioModal() {
        this.elements.cardioModal.close();
    }

    saveCardioEntry() {
        const minutes = parseInt(this.elements.cardioMinutesInput.value) || 0;
        const distance = parseFloat(this.elements.cardioDistanceInput.value) || 0;
        const calories = parseInt(this.elements.cardioCaloriesInput.value) || 0;

        if (!minutes && !distance && !calories) {
            alert('Introduce al menos el tiempo, la distancia o las calorías');
            return;
        }

        if (!this.selectedDate) {
            this.selectedDate = new Date(this.elements.dateInput.value || new Date());
        }

        const dateStr = formatDate(this.selectedDate);
        if (!this.cardioData[dateStr]) {
            this.cardioData[dateStr] = [];
        }

        this.cardioData[dateStr].push({
            type: this.elements.cardioTypeSelect.value,
            minutes,
            distance,
            calories
        });

        this.saveCardioData();
        this.renderCardioForDate(this.selectedDate);
        this.closeCardioModal();
    }

    deleteCardioEntry(index) {
        const dateStr = formatDate(this.selectedDate);
        const entries = this.cardioData[dateStr];
        if (!entries) return;

        entries.splice(index, 1);
        if (entries.length === 0) delete this.cardioData[dateStr];

        this.saveCardioData();
        this.renderCardioForDate(this.selectedDate);
    }

    saveCardioData() {
        try {
            localStorage.setItem(this.cardioStorageKey, JSON.stringify(this.cardioData));
            this.renderCalendar();
        } catch (e) {
            console.error('Error guardando cardio:', e);
            alert('Error al guardar el cardio. Intenta más tarde.');
        }
    }

    renderCardioForDate(date) {
        if (!this.elements.cardioList) return;
        const entries = this.getCardioForDate(date);

        if (entries.length === 0) {
            this.elements.cardioList.innerHTML = '<p class="text-muted cardio-empty">Sin actividad cardio este día</p>';
            return;
        }

        this.elements.cardioList.innerHTML = entries.map((entry, index) => {
            const info = CARDIO_TYPES[entry.type] || CARDIO_TYPES.otro;
            const parts = [];
            if (entry.minutes) parts.push(`⏱️ ${entry.minutes} min`);
            if (entry.distance) parts.push(`📏 ${entry.distance} km`);
            if (entry.calories) parts.push(`🔥 ${entry.calories} kcal`);

            return `
                <div class="cardio-item">
                    <span class="cardio-icon">${info.icon}</span>
                    <div class="cardio-item-info">
                        <span class="cardio-type-name">${info.label}</span>
                        <span class="cardio-item-details">${parts.join(' · ') || 'Sin datos'}</span>
                    </div>
                    <button type="button" class="delete-btn" onclick="window.app.deleteCardioEntry(${index})" title="Eliminar">🗑️</button>
                </div>`;
        }).join('');
    }

    loadExercises() {
        try {
            const data = localStorage.getItem(this.exercisesStorageKey);
            if (data) {
                this.exercisesData = JSON.parse(data);
            } else {
                this.exercisesData = {};
            }
        } catch (e) {
            console.error('Error cargando ejercicios:', e);
            this.exercisesData = {};
        }
    }

    getExercisesForDate(date) {
        const dateStr = formatDate(date);
        return this.exercisesData[dateStr] || [];
    }

    hasWorkoutOnDate(date) {
        const dateStr = formatDate(date);
        const hasExercise = Array.isArray(this.exercisesData[dateStr]) && this.exercisesData[dateStr].length > 0;
        return hasExercise || this.hasCardioOnDate(date);
    }

    getExerciseCountOnDate(date) {
        return this.getExercisesForDate(date).length + this.getCardioForDate(date).length;
    }

    getGymExerciseCountOnDate(date) {
        return this.getExercisesForDate(date).length;
    }

    // Abrir modal para editar
    openModal() {
        if (!this.selectedDate) {
            this.elements.dateInput.value = formatDate(this.currentDate);
            this.selectedDate = new Date(this.currentDate);
        }
        
        this.elements.modal.showModal();
        this.loadExercisesForDate(this.selectedDate);
    }

    // Acceso rápido desde Inicio: abre siempre los ejercicios del día de hoy
    openTodayExercises() {
        const today = new Date();
        this.selectedDate = today;
        this.elements.dateInput.value = formatDate(today);
        this.elements.modal.showModal();
        this.loadExercisesForDate(this.selectedDate);
    }

    closeModal() {
        this.elements.modal.close();
    }

    // ==================== MODAL DE EJERCICIOS FAVORITOS ====================
    openFavoriteModal() {
        this.renderFavoriteExercises();
        this.elements.favoriteModal.showModal();
    }

    closeFavoriteModal() {
        this.elements.favoriteModal.close();
        this.elements.customExerciseName.value = '';
    }

    // Normaliza el nombre de un ejercicio (minúsculas y sin tildes) para
    // poder buscarlo en el diccionario de técnica aunque esté escrito distinto.
    normalizeExerciseName(name) {
        return normExerciseName(name);
    }

    getExerciseTip(name) {
        const key = this.normalizeExerciseName(name);
        return EXERCISE_TECHNIQUE_TIPS[key] || 'Ejercicio personalizado: no hay información de técnica guardada todavía.';
    }

    escapeHtml(str) {
        return htmlEscape(str);
    }

    renderFavoriteExercises() {
        const sections = this.muscleGroups
            .filter(mg => this.exerciseSearch?.shouldShowMuscleGroup(mg) !== false)
            .map(muscleGroup => {
                let exercises = this.favoriteExercises[muscleGroup] || [];
                if (this.exerciseSearch) {
                    exercises = this.exerciseSearch.filterExercises(muscleGroup, exercises);
                }
                if (!exercises.length) return '';

                const color = MUSCLE_COLORS[muscleGroup] || '#64748b';
                return `
                <div class="muscle-group-section" style="--muscle-color:${color}">
                    <h3>${muscleGroup}</h3>
                    <div class="exercises-grid">
                        ${exercises.map(exercise => `
                            <button type="button" class="exercise-favorite-btn" 
                                    data-exercise="${exercise}" data-muscle="${muscleGroup}">
                                ${exercise}
                            </button>
                        `).join('')}
                    </div>
                </div>`;
            }).filter(Boolean).join('');

        this.elements.favoriteExercisesList.innerHTML = sections ||
            '<p class="text-muted empty-state">No se encontraron ejercicios</p>';

        // Añadir eventos: click = seleccionar, long-press = ver técnica
        document.querySelectorAll('.exercise-favorite-btn').forEach(btn => {
            let pressTimer = null;
            let didLongPress = false;

            const startPress = (e) => {
                didLongPress = false;
                pressTimer = setTimeout(() => {
                    didLongPress = true;
                    const name = btn.dataset.exercise;
                    this.showTechPopup(name);
                }, 500);
            };

            const endPress = (e) => {
                clearTimeout(pressTimer);
                if (!didLongPress) {
                    const { exercise: exerciseName, muscle: muscleGroup } = btn.dataset;
                    this.selectFavoriteExercise(exerciseName, muscleGroup);
                }
            };

            const cancelPress = () => {
                clearTimeout(pressTimer);
            };

            // Mouse
            btn.addEventListener('mousedown', startPress);
            btn.addEventListener('mouseup', endPress);
            btn.addEventListener('mouseleave', cancelPress);
            // Touch
            btn.addEventListener('touchstart', startPress, { passive: true });
            btn.addEventListener('touchend', endPress);
            btn.addEventListener('touchcancel', cancelPress);
        });
    }

    showTechPopup(exerciseName) {
        if (this.elements.favoriteModal && this.elements.favoriteModal.open) {
            this.elements.favoriteModal.close();
        }
        if (this.elements.modal && this.elements.modal.open) {
            this.elements.modal.close();
        }

        const dialog = document.getElementById('techDialog');
        const nameEl = document.getElementById('techPopupName');
        const videoContainer = document.getElementById('techVideoContainer');
        const tipEl = document.getElementById('techPopupTip');

        nameEl.textContent = exerciseName;

        const key = exerciseName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const videoId = EXERCISE_VIDEOS[key];

        if (videoId) {
            videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?rel=0" title="Cómo hacer ${exerciseName}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            videoContainer.style.display = 'block';
            tipEl.textContent = '';
        } else {
            videoContainer.innerHTML = '';
            videoContainer.style.display = 'none';
            tipEl.textContent = this.getExerciseTip(exerciseName);
        }

        dialog.showModal();

        dialog.addEventListener('close', () => {
            videoContainer.innerHTML = '';
        }, { once: true });
    }

    selectFavoriteExercise(exerciseName, muscleGroup) {
        this.addExercise(exerciseName, muscleGroup);
        this.closeFavoriteModal();
    }

    addCustomExerciseToFavorites() {
        const exerciseName = this.elements.customExerciseName.value.trim();
        if (!exerciseName) {
            alert('Por favor, escribe un nombre para el ejercicio');
            return;
        }

        // Preguntar a qué grupo muscular pertenece
        const muscleOptions = this.muscleGroups.map((group, index) => `${index + 1}. ${group}`).join('\n');
        const selection = prompt(`Selecciona el grupo muscular:\n${muscleOptions}\n\nEscribe el número:`);
        
        if (selection) {
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < this.muscleGroups.length) {
                const muscleGroup = this.muscleGroups[index];
                this.addFavoriteExercise(muscleGroup, exerciseName);
                this.selectFavoriteExercise(exerciseName, muscleGroup);
            } else {
                alert('Selección inválida');
            }
        }
    }

    // ==================== AÑADIR EJERCICIO ====================
    addExercise(exerciseName, muscleGroup = null) {
        // Nos aseguramos de que exista un array real en exercisesData para esta fecha,
        // así al hacer push() el ejercicio queda realmente enlazado y se guarda bien.
        const dateStr = formatDate(this.selectedDate);
        if (!this.exercisesData[dateStr]) {
            this.exercisesData[dateStr] = [];
        }
        const exercises = this.exercisesData[dateStr];
        const newSeries = this.muscleGroups.map(() => ({ sets: [] }));
        const exerciseIndex = exercises.length;
        const muscleIndex = Math.max(this.muscleGroups.indexOf(muscleGroup), 0);

        // La primera serie queda lista para editar nada más elegir el ejercicio.
        newSeries[muscleIndex].sets.push({ weight: '', reps: '' });

        exercises.push({
            name: exerciseName,
            series: newSeries,
            date: formatDate(this.selectedDate)
        });

        this.saveExercises();
        this.loadExercisesForDate(this.selectedDate);

        requestAnimationFrame(() => {
            const exercisePanel = document.getElementById(`exercisePanel${exerciseIndex}`);
            const musclePanel = document.getElementById(`musclePanel${exerciseIndex}_${muscleIndex}`);
            if (!exercisePanel || !musclePanel) return;

            exercisePanel.style.display = 'block';
            musclePanel.style.display = 'block';
            exercisePanel.previousElementSibling.querySelector('.toggle-icon').textContent = '▲';
            musclePanel.previousElementSibling.querySelector('.toggle-icon').textContent = '▲';
            exercisePanel.closest('.exercise-item')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            musclePanel.querySelector('.weight-input')?.focus();
        });
    }

    renderWeekdayHeaders() {
        ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(day => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            header.textContent = day;
            this.elements.calendar.appendChild(header);
        });
    }

    // ==================== PANELES DESPLEGABLES ====================
    toggleExercisePanel(exerciseIndex) {
        const panel = document.getElementById(`exercisePanel${exerciseIndex}`);
        const icon = panel.previousElementSibling.querySelector('.toggle-icon');
        
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            icon.textContent = '▲';
        } else {
            panel.style.display = 'none';
            icon.textContent = '▼';
        }
    }

    toggleMusclePanel(exerciseIndex, muscleIndex) {
        const panel = document.getElementById(`musclePanel${exerciseIndex}_${muscleIndex}`);
        const icon = panel.previousElementSibling.querySelector('.toggle-icon');
        
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            icon.textContent = '▲';
        } else {
            panel.style.display = 'none';
            icon.textContent = '▼';
        }
    }

    // ==================== GESTIÓN DE SERIES ====================
    addSet(exerciseIndex, muscleIndex) {
        const exercises = this.getExercisesForDate(this.selectedDate);
        exercises[exerciseIndex].series[muscleIndex].sets.push({ weight: '', reps: '' });
        this.saveExercises();
        this.loadExercisesForDate(this.selectedDate);
        
        // Mantener el panel abierto
        setTimeout(() => {
            const panel = document.getElementById(`exercisePanel${exerciseIndex}`);
            panel.style.display = 'block';
            panel.querySelector('.toggle-icon').textContent = '▲';
            
            const musclePanel = document.getElementById(`musclePanel${exerciseIndex}_${muscleIndex}`);
            musclePanel.style.display = 'block';
            musclePanel.previousElementSibling.querySelector('.toggle-icon').textContent = '▲';
        }, 10);
    }

    removeSet(exerciseIndex, muscleIndex, setIndex) {
        const exercises = this.getExercisesForDate(this.selectedDate);
        exercises[exerciseIndex].series[muscleIndex].sets.splice(setIndex, 1);
        this.saveExercises();
        this.loadExercisesForDate(this.selectedDate);
        
        // Mantener el panel abierto
        setTimeout(() => {
            const panel = document.getElementById(`exercisePanel${exerciseIndex}`);
            panel.style.display = 'block';
            panel.querySelector('.toggle-icon').textContent = '▲';
            
            const musclePanel = document.getElementById(`musclePanel${exerciseIndex}_${muscleIndex}`);
            musclePanel.style.display = 'block';
            musclePanel.previousElementSibling.querySelector('.toggle-icon').textContent = '▲';
        }, 10);
    }

    updateSetFromInput(input) {
        const exerciseIndex = parseInt(input.dataset.exerciseIndex);
        const muscleIndex = parseInt(input.dataset.muscleIndex);
        const setIndex = parseInt(input.dataset.setIndex);
        
        const exercises = this.getExercisesForDate(this.selectedDate);
        
        if (input.classList.contains('weight-input')) {
            exercises[exerciseIndex].series[muscleIndex].sets[setIndex].weight = input.value;
        } else if (input.classList.contains('reps-input')) {
            exercises[exerciseIndex].series[muscleIndex].sets[setIndex].reps = input.value;
        }
        
        this.saveExercises();
    }

    // Añadir serie a ejercicio
    addSeries(exerciseItem, muscleGroup) {
        const exerciseIndex = parseInt(exerciseItem.dataset.index);
        const exercises = this.getExercisesForDate(this.selectedDate);
        
        // Mapear nombres de músculos a índices
        const muscleMap = { 'Bíceps': 0, 'Tríceps': 1, 'Pecho': 2, 'Espalda': 3, 'Pierna': 4 };
        const seriesIndex = muscleMap[muscleGroup];
        
        const series = exercises[exerciseIndex].series[seriesIndex];
        
        if (!series.sets) {
            series.sets = [];
        }
        
        series.sets.push({ weight: '', reps: '' });
        
        this.saveExercises();
        this.loadExercisesForDate(this.selectedDate);
    }

    // Eliminar ejercicio
    deleteExercise(exerciseIndex) {
        const exercises = this.getExercisesForDate(this.selectedDate);
        exercises.splice(exerciseIndex, 1);
        
        this.saveExercises();
        this.loadExercisesForDate(this.selectedDate);
    }

    saveExercises() {
        try {
            const dateStr = formatDate(this.selectedDate);
            const exercises = this.getExercisesForDate(this.selectedDate);

            if (exercises.length === 0) {
                delete this.exercisesData[dateStr];
                localStorage.setItem(this.exercisesStorageKey, JSON.stringify(this.exercisesData));
                this.rebuildPersonalRecords();
                this.renderCalendar();
                return;
            }

            // Guardar o crear nuevo objeto para la fecha
            if (!this.exercisesData[dateStr]) {
                this.exercisesData[dateStr] = [];
            }

            // Actualizar ejercicios existentes o añadir nuevos
            this.exercisesData[dateStr].forEach((exercise, index) => {
                if (index < this.exercisesData[dateStr].length) {
                    // Ejercicio existente - actualizar
                    this.exercisesData[dateStr][index] = exercise;
                } else {
                    // Nuevo ejercicio
                    this.exercisesData[dateStr].push(exercise);
                }
            });

            localStorage.setItem(this.exercisesStorageKey, JSON.stringify(this.exercisesData));
            this.rebuildPersonalRecords();
            this.renderCalendar();
            this.gamification?.onWorkoutSaved(dateStr);
            this.gamification?.checkAchievements();
            this.renderWeeklySummary();
            
        } catch (e) {
            console.error('Error guardando ejercicios:', e);
            alert('Error al guardar. Intenta más tarde.');
        }
    }

    rebuildPersonalRecords() {
        this.personalRecords = {};
        Object.entries(this.exercisesData).forEach(([dateStr, exercises]) => {
            exercises.forEach(exercise => {
                exercise.series.forEach(muscleGroup => {
                    (muscleGroup.sets || []).forEach(set => {
                        const weight = Number.parseFloat(set.weight);
                        const reps = Number.parseInt(set.reps, 10);
                        if (weight > 0 && reps > 0) {
                            this.updatePersonalRecords(exercise.name, weight, reps, new Date(`${dateStr}T12:00:00`));
                        }
                    });
                });
            });
        });
        this.savePersonalRecords();
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // ==================== EJERCICIOS FAVORITOS ====================
    loadFavoriteExercises() {
        try {
            const data = localStorage.getItem('fittrack_favorites');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Error cargando favoritos:', e);
        }

        // Ejercicios predefinidos por defecto
        return {
            'Bíceps': ['Curl con barra', 'Curl con mancuernas', 'Curl martillo', 'Curl en banco inclinado'],
            'Tríceps': ['Press francés', 'Extensiones en polea', 'Fondos en paralelas', 'Press cerrado'],
            'Pecho': ['Press de banca', 'Press inclinado', 'Aperturas', 'Flexiones', 'Press en máquina'],
            'Espalda': ['Dominadas', 'Remo con barra', 'Jalón al pecho', 'Remo con mancuerna', 'Peso muerto'],
            'Pierna': ['Sentadilla', 'Prensa de piernas', 'Zancadas', 'Extensiones de cuádriceps', 'Curl femoral']
        };
    }

    saveFavoriteExercises() {
        localStorage.setItem('fittrack_favorites', JSON.stringify(this.favoriteExercises));
    }

    addFavoriteExercise(muscleGroup, exerciseName) {
        if (!this.favoriteExercises[muscleGroup]) {
            this.favoriteExercises[muscleGroup] = [];
        }
        if (!this.favoriteExercises[muscleGroup].includes(exerciseName)) {
            this.favoriteExercises[muscleGroup].push(exerciseName);
            this.saveFavoriteExercises();
        }
    }

    removeFavoriteExercise(muscleGroup, exerciseName) {
        if (this.favoriteExercises[muscleGroup]) {
            this.favoriteExercises[muscleGroup] = this.favoriteExercises[muscleGroup].filter(e => e !== exerciseName);
            this.saveFavoriteExercises();
        }
    }

    // ==================== PANTALLA DE INICIO ====================
    renderHomeDay() {
        const today = new Date();
        const weekday = today.toLocaleDateString('es-ES', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        this.elements.homeWeekday.textContent = this.capitalize(weekday);
        this.elements.homeDate.textContent = this.capitalize(dateStr);
    }

    capitalize(str) {
        return capText(str);
    }

    // ==================== RESUMEN SEMANAL ====================
    renderWeeklySummary() {
        const container = document.getElementById('weeklySummary');
        if (!container) return;

        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const fullDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        let html = '<div class="weekly-days">';

        let trainedCount = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = formatDate(d);
            const hasTraining = this.hasWorkoutOnDate(d);
            const isToday = formatDate(d) === formatDate(today);
            if (hasTraining) trainedCount++;

            html += `<div class="weekly-day ${hasTraining ? 'trained' : ''} ${isToday ? 'today' : ''}">
                <span class="weekly-day-name">${dayNames[i]}</span>
                <span class="weekly-day-dot">${hasTraining ? '●' : '○'}</span>
                <span class="weekly-day-num">${d.getDate()}</span>
            </div>`;
        }
        html += '</div>';
        html += `<p class="weekly-summary-text">${trainedCount} de 7 días entrenados esta semana</p>`;
        container.innerHTML = html;
    }

    // ==================== PESO CORPORAL ====================
    loadBodyWeight() {
        try {
            const data = localStorage.getItem('fittrack_bodyweight');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Error cargando peso corporal:', e);
        }
        return [];
    }

    saveBodyWeight() {
        localStorage.setItem('fittrack_bodyweight', JSON.stringify(this.bodyWeight));
    }

    addBodyWeight(weight, date = null) {
        const recordDate = date || new Date();
        this.bodyWeight.push({
            date: formatDate(recordDate),
            weight: parseFloat(weight),
            timestamp: recordDate.getTime()
        });
        // Ordenar por fecha
        this.bodyWeight.sort((a, b) => a.timestamp - b.timestamp);
        this.saveBodyWeight();
    }

    getBodyWeightChart() {
        return this.bodyWeight.map(record => ({
            x: record.date,
            y: record.weight
        }));
    }

    addBodyWeightFromUI() {
        const weight = this.elements.bodyWeightInput.value;
        const date = this.elements.bodyWeightDate.value;
        
        if (!weight || !date) {
            alert('Por favor, ingresa el peso y la fecha');
            return;
        }

        this.addBodyWeight(weight, new Date(date));
        this.elements.bodyWeightInput.value = '';
        this.renderWeightHistory();
        alert('Peso registrado correctamente');
    }

    renderWeightHistory() {
        if (this.bodyWeight.length === 0) {
            this.elements.weightHistory.innerHTML = '<p class="text-muted">No hay registros de peso</p>';
            return;
        }

        // Guardamos el índice real del array (no el de la lista recortada/invertida)
        // para poder editar y eliminar el registro correcto.
        const recent = this.bodyWeight
            .map((record, index) => ({ ...record, index }))
            .slice(-10)
            .reverse();

        this.elements.weightHistory.innerHTML = recent.map(record => `
            <div class="weight-record">
                <div class="weight-record-info">
                    <span class="weight-date">${record.date}</span>
                    <span class="weight-value">${record.weight} kg</span>
                </div>
                <div class="weight-record-actions">
                    <button type="button" class="icon-btn" onclick="window.app.editBodyWeight(${record.index})" title="Editar peso">✏️</button>
                    <button type="button" class="icon-btn" onclick="window.app.deleteBodyWeight(${record.index})" title="Eliminar peso">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    editBodyWeight(index) {
        const record = this.bodyWeight[index];
        if (!record) return;

        const newWeight = prompt('Nuevo peso (kg):', record.weight);
        if (newWeight === null) return;

        const parsed = parseFloat(newWeight);
        if (isNaN(parsed) || parsed <= 0) {
            alert('Por favor, introduce un peso válido');
            return;
        }

        record.weight = parsed;
        this.bodyWeight.sort((a, b) => a.timestamp - b.timestamp);
        this.saveBodyWeight();
        this.renderWeightHistory();
        if (typeof Chart !== 'undefined') this.renderBodyWeightChart();
    }

    deleteBodyWeight(index) {
        const record = this.bodyWeight[index];
        if (!record) return;

        if (!confirm(`¿Eliminar el registro de ${record.weight} kg del ${record.date}?`)) return;

        this.bodyWeight.splice(index, 1);
        this.saveBodyWeight();
        this.renderWeightHistory();
        if (typeof Chart !== 'undefined') this.renderBodyWeightChart();
    }

    // ==================== SECCIÓN NUTRICIÓN ====================
    loadNutrition() {
        this.renderWeightHistory();
        this.nutrition?.renderAll();

        if (typeof Chart === 'undefined') {
            const chartCard = document.querySelector('#nutritionSection .chart-card');
            if (chartCard && !chartCard.querySelector('.chart-unavailable')) {
                chartCard.insertAdjacentHTML('beforeend', '<p class="chart-unavailable">Los gráficos requieren conexión a internet para cargarse.</p>');
            }
        } else {
            this.renderBodyWeightChart();
        }

        this.loadCalorieCalculatorUI();
    }

    // ==================== CALCULADORA DE CALORÍAS ====================
    loadNutritionProfile() {
        try {
            const data = localStorage.getItem('fittrack_nutrition_profile');
            if (data) return JSON.parse(data);
        } catch (e) {
            console.error('Error cargando perfil de nutrición:', e);
        }
        return null;
    }

    saveNutritionProfile(profile) {
        localStorage.setItem('fittrack_nutrition_profile', JSON.stringify(profile));
    }

    loadCalorieCalculatorUI() {
        const profile = this.loadNutritionProfile();

        if (profile) {
            if (profile.sex) this.elements.calSex.value = profile.sex;
            if (profile.age) this.elements.calAge.value = profile.age;
            if (profile.height) this.elements.calHeight.value = profile.height;
            if (profile.activity) this.elements.calActivity.value = profile.activity;
            if (profile.goal) this.elements.calGoal.value = profile.goal;
        }

        // Precargar el peso con el último registro de peso corporal si el campo está vacío
        if (!this.elements.calWeight.value && this.bodyWeight.length > 0) {
            this.elements.calWeight.value = this.bodyWeight[this.bodyWeight.length - 1].weight;
        } else if (profile && profile.weight && !this.elements.calWeight.value) {
            this.elements.calWeight.value = profile.weight;
        }
    }

    calculateCalories() {
        const sex = this.elements.calSex.value;
        const age = parseInt(this.elements.calAge.value);
        const height = parseFloat(this.elements.calHeight.value);
        const weight = parseFloat(this.elements.calWeight.value);
        const activityFactor = parseFloat(this.elements.calActivity.value);
        const goal = this.elements.calGoal.value;

        if (!age || !height || !weight) {
            this.elements.calorieResult.classList.remove('visible');
            alert('Por favor, completa edad, altura y peso para calcular tus calorías');
            return;
        }

        // Guardar el perfil para futuras visitas
        this.saveNutritionProfile({ sex, age, height, weight, activity: activityFactor, goal });

        // Fórmula de Mifflin-St Jeor para el metabolismo basal (BMR)
        let bmr = 10 * weight + 6.25 * height - 5 * age;
        bmr += sex === 'male' ? 5 : -161;

        // Gasto energético total diario (TDEE) según el nivel de actividad
        const tdee = bmr * activityFactor;

        // Ajuste según el objetivo
        let target = tdee;
        let goalLabel = 'Mantenimiento';
        if (goal === 'lose') {
            target = tdee - 500;
            goalLabel = 'Para perder peso (≈0,5 kg/semana)';
        } else if (goal === 'gain') {
            target = tdee + 400;
            goalLabel = 'Para ganar peso (≈0,4 kg/semana)';
        }

        this.elements.calorieResult.innerHTML = `
            <div class="calorie-result-row">
                <span class="label">Metabolismo basal (BMR)</span>
                <span class="value">${Math.round(bmr)} kcal</span>
            </div>
            <div class="calorie-result-row">
                <span class="label">Mantenimiento (TDEE)</span>
                <span class="value">${Math.round(tdee)} kcal</span>
            </div>
            <div class="calorie-result-row highlight">
                <span class="label">${goalLabel}</span>
                <span class="value">${Math.round(target)} kcal/día</span>
            </div>
        `;
        this.elements.calorieResult.classList.add('visible');
    }

    // ==================== PERSONAL RECORDS (PRs) ====================
    loadPersonalRecords() {
        try {
            const data = localStorage.getItem('fittrack_prs');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Error cargando PRs:', e);
        }
        return {};
    }

    savePersonalRecords() {
        localStorage.setItem('fittrack_prs', JSON.stringify(this.personalRecords));
    }

    updatePersonalRecords(exerciseName, weight, reps, date) {
        const exerciseKey = exerciseName.toLowerCase();
        
        if (!this.personalRecords[exerciseKey]) {
            this.personalRecords[exerciseKey] = {
                name: exerciseName,
                records: []
            };
        }

        // Calcular 1RM estimado usando fórmula de Epley
        const estimated1RM = weight * (1 + reps / 30);

        // Verificar si es un nuevo PR
        const existingRecord = this.personalRecords[exerciseKey].records.find(r => r.reps === reps);
        
        if (!existingRecord || weight > existingRecord.weight) {
            // Eliminar el registro anterior si existe
            this.personalRecords[exerciseKey].records = this.personalRecords[exerciseKey].records.filter(r => r.reps !== reps);
            
            // Añadir nuevo registro
            this.personalRecords[exerciseKey].records.push({
                weight: weight,
                reps: reps,
                date: formatDate(date),
                estimated1RM: estimated1RM
            });

            // Ordenar por repeticiones
            this.personalRecords[exerciseKey].records.sort((a, b) => b.reps - a.reps);

            this.savePersonalRecords();
            this.gamification?.onPrAchieved();
            return true; // Nuevo PR
        }

        return false; // No es nuevo PR
    }

    getPersonalRecords(exerciseName) {
        const exerciseKey = exerciseName.toLowerCase();
        return this.personalRecords[exerciseKey]?.records || [];
    }

    getAllPersonalRecords() {
        return Object.values(this.personalRecords);
    }

    // ==================== COMPARACIÓN DE ENTRENAMIENTOS ====================
    compareWithPreviousWorkout(exerciseName, currentDate) {
        const currentExercises = this.getExercisesForDate(currentDate);
        const currentExercise = currentExercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
        
        if (!currentExercise) return null;

        // Buscar el entrenamiento anterior con el mismo ejercicio
        const allDates = Object.keys(this.exercisesData).sort();
        const currentIndex = allDates.indexOf(formatDate(currentDate));
        
        if (currentIndex <= 0) return null;

        for (let i = currentIndex - 1; i >= 0; i--) {
            const prevDate = allDates[i];
            const prevExercises = this.exercisesData[prevDate];
            const prevExercise = prevExercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
            
            if (prevExercise) {
                // Comparar pesos máximos
                const currentMax = this.getMaxWeight(currentExercise);
                const prevMax = this.getMaxWeight(prevExercise);
                
                const difference = currentMax - prevMax;
                const percentage = prevMax > 0 ? ((difference / prevMax) * 100).toFixed(1) : 0;

                return {
                    previousDate: prevDate,
                    previousMax: prevMax,
                    currentMax: currentMax,
                    difference: difference,
                    percentage: parseFloat(percentage),
                    improved: difference > 0
                };
            }
        }

        return null;
    }

    getMaxWeight(exercise) {
        let maxWeight = 0;
        exercise.series.forEach(muscleGroup => {
            muscleGroup.sets.forEach(set => {
                if (set.weight && parseFloat(set.weight) > maxWeight) {
                    maxWeight = parseFloat(set.weight);
                }
            });
        });
        return maxWeight;
    }

    // ==================== NAVEGACIÓN ====================
    switchSection(section) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`${section}Section`).classList.add('active');
        document.querySelector(`.nav-btn[data-section="${section}"]`).classList.add('active');

        if (section === 'stats') {
            this.loadStats();
        } else if (section === 'settings') {
            this.loadSettingsUI();
            this.account?.render();
        } else if (section === 'nutrition') {
            this.loadNutrition();
        } else if (section === 'home') {
            this.renderHomeDay();
            this.renderWeeklySummary();
            this.gamification?.renderHomeBar();
            this.routines?.render();
        } else if (section === 'bilbo') {
            this.renderBilbo();
        } else if (section === 'routines') {
            this.routines?.render();
        } else if (section === 'history') {
            this.history?.render();
        } else if (section === 'progress') {
            this.gamification?.renderProgressSection();
        }
    }

    // ==================== ESTADÍSTICAS ====================
    loadStats() {
        this.updateSummaryStats();
        this.updateCardioStats();
        this.renderCharts();
        this.renderPersonalRecords();
        this.advancedStats?.render();
        this.gamification?.checkAchievements();
        this.renderMonthCompare();
        this.checkInactivityNotification();
    }

    renderMonthCompare() {
        const container = document.getElementById('monthCompare');
        if (!container) return;

        const now = new Date();
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

        let thisWorkouts = 0, thisCardio = 0, prevWorkouts = 0, prevCardio = 0;
        let thisVolume = 0, prevVolume = 0;

        Object.entries(this.exercisesData).forEach(([dateStr, exercises]) => {
            if (dateStr.startsWith(thisMonthKey)) {
                thisWorkouts++;
                exercises.forEach(ex => {
                    ex.series.forEach(mg => {
                        (mg.sets || []).forEach(s => {
                            thisVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
                        });
                    });
                });
            } else if (dateStr.startsWith(prevMonthKey)) {
                prevWorkouts++;
                exercises.forEach(ex => {
                    ex.series.forEach(mg => {
                        (mg.sets || []).forEach(s => {
                            prevVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
                        });
                    });
                });
            }
        });

        Object.entries(this.cardioData).forEach(([dateStr, entries]) => {
            const count = entries.length;
            if (dateStr.startsWith(thisMonthKey)) thisCardio += count;
            else if (dateStr.startsWith(prevMonthKey)) prevCardio += count;
        });

        const pct = (a, b) => (b === 0 ? '—' : ((a - b) / Math.abs(b) * 100).toFixed(1) + '%');
        const volumeDiff = prevVolume ? ((thisVolume - prevVolume) / Math.abs(prevVolume) * 100).toFixed(1) + '%' : '—';

        container.innerHTML = `
            <div class="month-compare-grid">
                <div class="compare-col">
                    <div class="compare-title">Mes anterior</div>
                    <div class="compare-row"><span>Entrenamientos</span><strong>${prevWorkouts}</strong></div>
                    <div class="compare-row"><span>Cardio</span><strong>${prevCardio}</strong></div>
                    <div class="compare-row"><span>Volumen</span><strong>${prevVolume.toLocaleString()} kg</strong></div>
                </div>
                <div class="compare-col">
                    <div class="compare-title">Este mes</div>
                    <div class="compare-row"><span>Entrenamientos</span><strong>${thisWorkouts}</strong></div>
                    <div class="compare-row"><span>Cardio</span><strong>${thisCardio}</strong></div>
                    <div class="compare-row"><span>Volumen</span><strong>${thisVolume.toLocaleString()} kg</strong></div>
                </div>
            </div>
            <p class="compare-delta">Cambio en volumen: ${volumeDiff} frente al mes anterior</p>
        `;
    }

    checkInactivityNotification() {
        if (!this.settings?.soundNotifications) return;

        const dates = new Set([
            ...Object.keys(this.exercisesData || {}),
            ...Object.keys(this.cardioData || {})
        ]);

        try {
            const water = JSON.parse(localStorage.getItem(this.nutrition?.waterKey || 'fittrack_water') || '{}');
            Object.keys(water).forEach(d => {
                if ((water[d] || 0) > 0) dates.add(d);
            });
        } catch {
            // ignore water if unavailable
        }

        let count = 0;
        const d = new Date();
        for (let i = 0; i < 365; i++) {
            const key = formatDate(d);
            if (dates.has(key)) break;
            count++;
            d.setDate(d.getDate() - 1);
        }

        if (count >= 7) {
            const msg = count === 1 ? 'Llevas 1 día sin registrar actividad.' : `Llevas ${count} días sin registrar actividad.`;
            alert('Recordatorio: ' + msg);
        }
    }

    exportWeightCSV() {
        if (!this.bodyWeight?.length) {
            alert('No hay registros de peso para exportar');
            return;
        }
        const rows = ['Fecha,Peso (kg)'];
        this.bodyWeight.forEach(r => rows.push(`${r.date},${r.weight}`));
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fittrack_peso_${formatDate(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportMeasurementsCSV() {
        const measurements = this.nutrition?.measurements || [];
        if (!measurements?.length) {
            alert('No hay medidas para exportar');
            return;
        }
        const rows = ['Fecha,Pecho, Cintura, Cadera, Brazo, Muslo'];
        measurements.forEach(m => {
            rows.push(`${m.date},${m.chest || ''},${m.waist || ''},${m.hips || ''},${m.arm || ''},${m.thigh || ''}`);
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fittrack_medidas_${formatDate(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    updateCardioStats() {
        let totalSessions = 0;
        let totalMinutes = 0;
        let totalDistance = 0;
        let totalCalories = 0;

        Object.values(this.cardioData).forEach(entries => {
            entries.forEach(entry => {
                totalSessions++;
                totalMinutes += Number(entry.minutes) || 0;
                totalDistance += Number(entry.distance) || 0;
                totalCalories += Number(entry.calories) || 0;
            });
        });

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('cardioSessions', totalSessions);
        setText('cardioMinutes', totalMinutes);
        setText('cardioDistance', totalDistance.toFixed(1));
        setText('cardioCalories', Math.round(totalCalories).toLocaleString());
    }

    updateSummaryStats() {
        const totalWorkouts = Object.keys(this.exercisesData).length;
        let totalExercises = 0;
        let totalWeight = 0;

        Object.values(this.exercisesData).forEach(dayExercises => {
            totalExercises += dayExercises.length;
            dayExercises.forEach(exercise => {
                exercise.series.forEach(muscleGroup => {
                    if (muscleGroup.sets) {
                        muscleGroup.sets.forEach(set => {
                            const weight = parseFloat(set.weight) || 0;
                            const reps = parseInt(set.reps) || 0;
                            totalWeight += weight * reps;
                        });
                    }
                });
            });
        });

        const streak = this.calculateStreak();

        document.getElementById('totalWorkouts').textContent = totalWorkouts;
        document.getElementById('totalExercises').textContent = totalExercises;
        document.getElementById('currentStreak').textContent = streak;
        document.getElementById('totalWeight').textContent = totalWeight.toLocaleString();
    }

    calculateStreak() {
        const activityDates = new Set();

        // Entrenamientos con pesas
        Object.keys(this.exercisesData || {}).forEach(d => activityDates.add(d));

        // Cardio
        Object.keys(this.cardioData || {}).forEach(d => activityDates.add(d));

        // Nutrición/agua: día con al menos 1 vaso registrado
        try {
            const waterData = JSON.parse(localStorage.getItem(this.nutrition?.waterKey || 'fittrack_water') || '{}');
            Object.keys(waterData).forEach(d => {
                if ((waterData[d] || 0) > 0) activityDates.add(d);
            });
        } catch {
            // ignore water if unavailable
        }

        const dates = Array.from(activityDates).sort().reverse();
        if (dates.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < dates.length; i++) {
            const activityDate = new Date(dates[i]);
            activityDate.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));

            if (diffDays === i) {
                streak++;
            } else if (diffDays > i) {
                break;
            }
        }

        return streak;
    }

    renderCharts() {
        if (typeof Chart === 'undefined') {
            document.querySelectorAll('.chart-card').forEach(card => {
                if (!card.querySelector('.chart-unavailable')) {
                    card.insertAdjacentHTML('beforeend', '<p class="chart-unavailable">Los gráficos requieren conexión a internet para cargarse.</p>');
                }
            });
            return;
        }

        this.renderMonthlyChart();
        this.renderMuscleChart();
        this.renderWeeklyChart();
        this.renderWeightChart();
    }

    renderMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        if (this.charts.monthly) this.charts.monthly.destroy();

        const monthlyData = this.getMonthlyWorkoutData();

        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Entrenamientos',
                    data: monthlyData.values,
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    getMonthlyWorkoutData() {
        const months = [];
        const values = [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthNames[date.getMonth()]);
            
            let count = 0;
            Object.keys(this.exercisesData).forEach(dateStr => {
                if (dateStr.startsWith(monthKey)) count++;
            });
            values.push(count);
        }

        return { labels: months, values };
    }

    renderMuscleChart() {
        const ctx = document.getElementById('muscleChart').getContext('2d');
        if (this.charts.muscle) this.charts.muscle.destroy();

        const muscleData = this.getMuscleDistribution();

        this.charts.muscle = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: muscleData.labels,
                datasets: [{
                    data: muscleData.values,
                    backgroundColor: ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#a855f7']
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    getMuscleDistribution() {
        const distribution = {};
        this.muscleGroups.forEach(group => distribution[group] = 0);

        Object.values(this.exercisesData).forEach(dayExercises => {
            dayExercises.forEach(exercise => {
                exercise.series.forEach((muscleGroup, index) => {
                    if (muscleGroup.sets && muscleGroup.sets.length > 0) {
                        const muscleName = this.muscleGroups[index];
                        if (distribution[muscleName] !== undefined) {
                            distribution[muscleName] += muscleGroup.sets.length;
                        }
                    }
                });
            });
        });

        const labels = Object.keys(distribution).filter(k => distribution[k] > 0);
        const values = labels.map(k => distribution[k]);

        return { labels, values };
    }

    renderWeeklyChart() {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        if (this.charts.weekly) this.charts.weekly.destroy();

        const weeklyData = this.getWeeklyData();

        this.charts.weekly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeklyData.labels,
                datasets: [{
                    label: 'Ejercicios',
                    data: weeklyData.values,
                    borderColor: 'rgba(37, 99, 235, 1)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    getWeeklyData() {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const values = new Array(7).fill(0);
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);

            if (this.exercisesData[dateStr]) {
                values[i] = this.exercisesData[dateStr].length;
            }
        }

        return { labels: days, values };
    }

    renderWeightChart() {
        const ctx = document.getElementById('weightChart').getContext('2d');
        if (this.charts.weight) this.charts.weight.destroy();

        const weightData = this.getMonthlyWeightData();

        this.charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weightData.labels,
                datasets: [{
                    label: 'Peso total (kg)',
                    data: weightData.values,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    renderBodyWeightChart() {
        const ctx = document.getElementById('bodyWeightChart').getContext('2d');
        if (this.charts.bodyWeight) this.charts.bodyWeight.destroy();

        const data = this.bodyWeight.slice(-12);
        this.charts.bodyWeight = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(record => record.date),
                datasets: [{
                    label: 'Peso corporal (kg)',
                    data: data.map(record => record.weight),
                    borderColor: 'rgba(168, 85, 247, 1)',
                    backgroundColor: 'rgba(168, 85, 247, 0.12)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    renderPersonalRecords() {
        const records = this.getAllPersonalRecords().filter(record => record.records.length);
        if (!records.length) {
            this.elements.prList.innerHTML = '<p class="text-muted">Registra series con peso y repeticiones para ver tus rÃ©cords.</p>';
            return;
        }

        this.elements.prList.innerHTML = records.map(record => {
            const best = record.records.reduce((current, item) => item.estimated1RM > current.estimated1RM ? item : current);
            return `<div class="pr-card"><strong>${record.name}</strong><span>${best.weight} kg Ã— ${best.reps} reps</span><small>1RM estimado: ${best.estimated1RM.toFixed(1)} kg</small></div>`;
        }).join('');
    }

    getMonthlyWeightData() {
        const months = [];
        const values = [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthNames[date.getMonth()]);
            
            let totalWeight = 0;
            Object.keys(this.exercisesData).forEach(dateStr => {
                if (dateStr.startsWith(monthKey)) {
                    this.exercisesData[dateStr].forEach(exercise => {
                        exercise.series.forEach(muscleGroup => {
                            if (muscleGroup.sets) {
                                muscleGroup.sets.forEach(set => {
                                    const weight = parseFloat(set.weight) || 0;
                                    const reps = parseInt(set.reps) || 0;
                                    totalWeight += weight * reps;
                                });
                            }
                        });
                    });
                }
            });
            values.push(totalWeight);
        }

        return { labels: months, values };
    }

    // ==================== EXPORTAR/IMPORTAR ====================
    exportData() {
        const format = prompt('Formato de exportación:\n1. JSON (completo)\n2. CSV (hoja de cálculo)\n\nEscribe 1 o 2:', '1');

        if (format === '1') {
            this.exportJSON();
        } else if (format === '2') {
            this.exportCSV();
        }
    }

    exportJSON() {
        const data = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            exercises: this.exercisesData,
            cardio: this.cardioData,
            settings: this.settings,
            muscleGroups: this.muscleGroups,
            favorites: this.favoriteExercises,
            prs: this.personalRecords,
            bodyWeight: this.bodyWeight,
            bilbo: this.bilboData,
            routines: this.routines?.routines || [],
            gamification: this.gamification?.data || {},
            nutrition: this.nutrition?.daily || {},
            water: this.nutrition?.water || {},
            measurements: this.nutrition?.measurements || [],
            profile: this.account?.profile || {}
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fittrack_backup_${formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportCSV() {
        let csv = '';

        // Bloque 1: ejercicios de pesas
        csv += '===EJERCICIOS===\n';
        csv += 'Fecha,Ejercicio,Grupo Muscular,Serie,Peso (kg),Repeticiones\n';
        Object.keys(this.exercisesData).sort().forEach(dateStr => {
            this.exercisesData[dateStr].forEach(exercise => {
                exercise.series.forEach((muscleGroup, muscleIndex) => {
                    if (muscleGroup.sets) {
                        muscleGroup.sets.forEach((set, setIndex) => {
                            const muscleName = this.muscleGroups[muscleIndex] || 'Desconocido';
                            csv += `${dateStr},"${exercise.name}",${muscleName},${setIndex + 1},${set.weight || 0},${set.reps || 0}\n`;
                        });
                    }
                });
            });
        });

        // Bloque 2: cardio
        csv += '\n===CARDIO===\n';
        csv += 'Fecha,Tipo,Minutos,Distancias(km),Calorias(kcal)\n';
        Object.keys(this.cardioData).sort().forEach(dateStr => {
            (this.cardioData[dateStr] || []).forEach(entry => {
                const info = (typeof CARDIO_TYPES !== 'undefined' && CARDIO_TYPES[entry.type]) || { label: entry.type };
                csv += `${dateStr},"${info.label}",${entry.minutes || 0},${entry.distance || 0},${entry.calories || 0}\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fittrack_export_${formatDate(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;

                if (file.name.endsWith('.json')) {
                    this.importJSON(content);
                } else if (file.name.endsWith('.csv')) {
                    this.importCSV(content);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    importJSON(content) {
        try {
            const data = JSON.parse(content);
            
            if (data.exercises) {
                this.exercisesData = data.exercises;
                localStorage.setItem(this.exercisesStorageKey, JSON.stringify(this.exercisesData));
            }

            if (data.cardio) {
                this.cardioData = data.cardio;
                localStorage.setItem(this.cardioStorageKey, JSON.stringify(this.cardioData));
            }

            if (data.settings) {
                this.settings = data.settings;
                localStorage.setItem(this.settingsStorageKey, JSON.stringify(this.settings));
            }

            if (data.muscleGroups) {
                this.muscleGroups = data.muscleGroups;
            }

            if (data.version === '2.0' && this.account) {
                this.account.importBackup(data);
            }

            alert('Datos importados correctamente');
            location.reload();
        } catch (error) {
            alert('Error al importar datos: ' + error.message);
        }
    }

    importCSV(content) {
        try {
            const lines = content.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) throw new Error('El archivo no contiene registros');

            const imported = {};
            lines.slice(1).forEach(line => {
                const columns = line.match(/(?:,|^)(?:"((?:[^"]|"")*)"|([^",]*))/g)
                    .map(value => value.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, ''));
                if (columns.length < 6 || !/^\d{4}-\d{2}-\d{2}$/.test(columns[0])) return;

                const [date, exerciseName, muscleName, , weight, reps] = columns;
                const muscleIndex = this.muscleGroups.indexOf(muscleName);
                if (muscleIndex < 0 || !exerciseName.trim()) return;

                imported[date] ??= [];
                let exercise = imported[date].find(item => item.name === exerciseName);
                if (!exercise) {
                    exercise = { name: exerciseName, date, series: this.muscleGroups.map(() => ({ sets: [] })) };
                    imported[date].push(exercise);
                }
                exercise.series[muscleIndex].sets.push({ weight: weight || '', reps: reps || '' });
            });

            if (!Object.keys(imported).length) throw new Error('No se encontraron filas válidas');
            this.exercisesData = imported;
            localStorage.setItem(this.exercisesStorageKey, JSON.stringify(this.exercisesData));
            this.rebuildPersonalRecords();
            this.renderCalendar();
            alert('Datos CSV importados correctamente');
        } catch (error) {
            alert('Error al importar CSV: ' + error.message);
        }
    }

    // ==================== CONFIGURACIÓN ====================
    loadSettings() {
        try {
            const data = localStorage.getItem(this.settingsStorageKey);
            if (data) {
                this.settings = JSON.parse(data);
            } else {
                this.settings = {
                    theme: 'light',
                    muscleGroups: ['Bíceps', 'Tríceps', 'Pecho', 'Espalda', 'Pierna'],
                    autoSave: true,
                    showTips: true,
                    soundNotifications: false
                };
            }
        } catch (e) {
            this.settings = {
                theme: 'light',
                muscleGroups: ['Bíceps', 'Tríceps', 'Pecho', 'Espalda', 'Pierna'],
                autoSave: true,
                showTips: true,
                soundNotifications: false
            };
        }

        if (this.settings.muscleGroups) {
            this.muscleGroups = this.settings.muscleGroups;
        }
    }

    saveSettings() {
        this.settings.muscleGroups = this.muscleGroups;
        localStorage.setItem(this.settingsStorageKey, JSON.stringify(this.settings));
    }

    loadSettingsUI() {
        this.renderMuscleGroups();

        document.getElementById('autoSave').checked = this.settings.autoSave;
        document.getElementById('showTips').checked = this.settings.showTips;
        document.getElementById('soundNotifications').checked = this.settings.soundNotifications;

        document.getElementById('autoSave').onchange = (e) => {
            this.settings.autoSave = e.target.checked;
            this.saveSettings();
        };

        document.getElementById('showTips').onchange = (e) => {
            this.settings.showTips = e.target.checked;
            this.saveSettings();
        };

        document.getElementById('soundNotifications').onchange = (e) => {
            this.settings.soundNotifications = e.target.checked;
            this.saveSettings();
        };
    }

    renderMuscleGroups() {
        this.elements.muscleGroupsList.innerHTML = this.muscleGroups.map((group, index) => `
            <div class="muscle-tag">
                ${group}
                <button onclick="window.app.removeMuscleGroup(${index})">×</button>
            </div>
        `).join('');
    }

    addMuscleGroup() {
        const name = prompt('Nombre del nuevo grupo muscular:');
        if (name && name.trim()) {
            this.muscleGroups.push(name.trim());
            this.saveSettings();
            this.renderMuscleGroups();
        }
    }

    removeMuscleGroup(index) {
        if (confirm(`¿Eliminar "${this.muscleGroups[index]}"?`)) {
            this.muscleGroups.splice(index, 1);
            this.saveSettings();
            this.renderMuscleGroups();
        }
    }

    // ==================== TEMA ====================
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.saveSettings();
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        this.elements.themeToggle.textContent = this.settings.theme === 'light' ? '🌙' : '☀️';
    }

    // ==================== TIMER DE DESCANSO ====================
    startRestTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.elements.startTimer.textContent = 'Iniciar Timer';
            this.elements.timerDisplay.classList.add('hidden');
            return;
        }

        let seconds = parseInt(this.elements.restTime.value) || 90;
        this.elements.timerDisplay.classList.remove('hidden');
        this.elements.startTimer.textContent = 'Detener';

        this.updateTimerDisplay(seconds);

        this.timerInterval = setInterval(() => {
            seconds--;
            this.updateTimerDisplay(seconds);

            if (seconds <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.elements.startTimer.textContent = 'Iniciar Timer';
                
                if (this.settings.soundNotifications) {
                    alert('¡Tiempo de descanso terminado!');
                } else {
                    alert('¡Tiempo de descanso terminado!');
                }
            }
        }, 1000);
    }

    updateTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.elements.timerDisplay.textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // ==================== CALCULADORA 1RM ====================
    calculate1RM() {
        const weight = parseFloat(this.elements.rmWeight.value);
        const reps = parseInt(this.elements.rmReps.value);

        if (!weight || !reps) {
            this.elements.rmResult.textContent = 'Por favor, introduce peso y repeticiones';
            return;
        }

        // Fórmula de Epley
        const oneRM = weight * (1 + reps / 30);
        
        this.elements.rmResult.innerHTML = `
            <strong>Tu 1RM estimado:</strong><br>
            <span style="font-size: 1.5rem; color: var(--success);">${oneRM.toFixed(1)} kg</span><br>
            <small>Fórmula de Epley</small>
        `;
    }

    // ==================== MÉTODO BILBO ====================
    loadBilboData() {
        try {
            const data = localStorage.getItem(this.bilboStorageKey);
            if (data) return JSON.parse(data);
        } catch (e) {
            console.error('Error cargando Bilbo:', e);
        }
        return {
            configured: false,
            exercise: 'Press de Banca',
            startWeight: 20,
            currentWeight: 20,
            increment: 2.5,
            minReps: 8,
            maxReps: 12,
            tier: 1,
            sessions: []
        };
    }

    saveBilboData() {
        localStorage.setItem(this.bilboStorageKey, JSON.stringify(this.bilboData));
    }

    renderBilbo() {
        const d = this.bilboData;
        const setupEl = document.getElementById('bilboSetup');
        const contentEl = document.getElementById('bilboContent');

        if (!d.configured) {
            setupEl.style.display = '';
            contentEl.style.display = 'none';
            this.bilboWeightPick = d.startWeight || 20;
            document.getElementById('bilboWeightPick').textContent = this.bilboWeightPick;
            return;
        }

        setupEl.style.display = 'none';
        contentEl.style.display = '';

        // Hero card
        document.getElementById('bilboWeightDisplay').textContent = d.currentWeight;
        document.getElementById('bilboRepsTarget').textContent = `${d.minReps}-${d.maxReps}`;
        document.getElementById('bilboTierBadge').textContent = `Nivel ${d.tier}`;

        // Stats
        document.getElementById('bilboTotalSessions').textContent = d.sessions.length;
        document.getElementById('bilboCurrentWeight').textContent = d.currentWeight + ' kg';
        document.getElementById('bilboTotalReps').textContent = d.sessions.reduce((sum, s) => sum + s.reps, 0);

        const maxW = d.sessions.length ? Math.max(...d.sessions.map(s => s.weight)) : 0;
        document.getElementById('bilboMaxWeight').textContent = maxW ? maxW + ' kg' : '—';

        this.renderBilboHistory();
        this.renderBilboChart();
    }

    logBilboSession() {
        const repsInput = document.getElementById('bilboRepsInput');
        const reps = parseInt(repsInput.value);
        if (isNaN(reps) || reps < 1) {
            alert('Introduce un número válido de repeticiones');
            return;
        }
        if (reps !== parseFloat(repsInput.value) || repsInput.value.includes('.')) {
            alert('No se permiten medias repeticiones. Introduce un número entero.');
            return;
        }

        const d = this.bilboData;
        const today = formatDate(new Date());

        // Check if already logged today
        const existingToday = d.sessions.find(s => s.date === today);
        if (existingToday) {
            if (!confirm('Ya registraste hoy. ¿Quieres actualizar el registro?')) return;
            existingToday.reps = reps;
            existingToday.weight = d.currentWeight;
            existingToday.tier = d.tier;
        } else {
            d.sessions.push({
                date: today,
                weight: d.currentWeight,
                reps: reps,
                tier: d.tier
            });
        }

        // Progression logic
        if (reps >= d.maxReps) {
            d.currentWeight += d.increment;
            d.tier++;
            alert(`¡Excelente! Has completado ${reps} reps. Subes a ${d.currentWeight} kg 🎉`);
        } else if (reps < d.minReps) {
            alert(`Bien hecho. Sigue intentando alcanzar ${d.maxReps} reps para subir peso.`);
        } else {
            alert(`Perfecto, ${reps} reps registradas. Sigue así 💪`);
        }

        this.saveBilboData();
        repsInput.value = '';
        this.renderBilbo();
    }

    startBilbo() {
        const weight = this.bilboWeightPick;
        if (!weight || weight <= 0) {
            alert('Selecciona un peso válido');
            return;
        }
        this.bilboData.configured = true;
        this.bilboData.startWeight = weight;
        this.bilboData.currentWeight = weight;
        this.bilboData.tier = 1;
        this.bilboData.sessions = [];
        this.saveBilboData();
        this.renderBilbo();
    }

    updateBilboSetupHint() {
        const ormInput = document.getElementById('bilboOrmInput');
        const orm = parseFloat(ormInput.value);
        const calcEl = document.getElementById('bilboSetupCalc');
        const pctEl = document.getElementById('bilboSetupPercent');
        if (orm > 0) {
            const pct = Math.round((this.bilboWeightPick / orm) * 100);
            pctEl.textContent = pct + '%';
            calcEl.textContent = this.bilboWeightPick + ' kg';
        } else {
            pctEl.textContent = '50%';
            calcEl.textContent = '—';
        }
    }

    resetBilbo() {
        if (!confirm('¿Reiniciar el Método Bilbo? Se borrarán todos los registros.')) return;
        this.bilboData = {
            configured: false,
            exercise: 'Press de Banca',
            startWeight: 20,
            currentWeight: 20,
            increment: 2.5,
            minReps: 8,
            maxReps: 12,
            tier: 1,
            sessions: []
        };
        this.saveBilboData();
        this.renderBilbo();
    }

    renderBilboHistory() {
        const list = document.getElementById('bilboHistoryList');
        const sessions = [...this.bilboData.sessions].reverse().slice(0, 20);

        if (!sessions.length) {
            list.innerHTML = '<p class="text-muted">Aún no hay sesiones registradas</p>';
            return;
        }

        list.innerHTML = sessions.map(s => {
            let status = 'same';
            let label = 'Normal';
            if (s.reps >= this.bilboData.maxReps) {
                status = 'up';
                label = 'Subida ↑';
            } else if (s.reps < this.bilboData.minReps) {
                label = 'Debajo ↓';
            }
            return `
                <div class="bilbo-history-item">
                    <span class="bilbo-history-date">${s.date}</span>
                    <span class="bilbo-history-weight">${s.weight} kg</span>
                    <span class="bilbo-history-reps">${s.reps} reps</span>
                    <span class="bilbo-history-status ${status}">${label}</span>
                </div>
            `;
        }).join('');
    }

    renderBilboChart() {
        if (typeof Chart === 'undefined') return;
        const canvas = document.getElementById('bilboChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.charts.bilbo) this.charts.bilbo.destroy();

        const sessions = this.bilboData.sessions;
        if (!sessions.length) return;

        this.charts.bilbo = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sessions.map(s => s.date.slice(5)),
                datasets: [{
                    label: 'Peso (kg)',
                    data: sessions.map(s => s.weight),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#f97316'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}


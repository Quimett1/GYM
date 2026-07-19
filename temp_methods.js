
    renderWeeklySummary() {
        const container = document.getElementById('weeklySummary');
        if (!container) return;
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        let html = '<div class="weekly-dots">';
        let trainedCount = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = formatDate(d);
            const isToday = dateStr === formatDate(today);
            const hasTraining = this.exercisesData && this.exercisesData[dateStr] && this.exercisesData[dateStr].length > 0;
            if (hasTraining) trainedCount++;
            const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
            html += '<div class="weekly-dot ' + (hasTraining ? 'trained' : '') + ' ' + (isToday ? 'today' : '') + '" title="' + dayNames[i] + '">' + (hasTraining ? '●' : '○') + '</div>';
        }
        html += '</div>';
        html += '<p class="weekly-summary-text">' + trainedCount + ' de 7 días entrenados esta semana</p>';
        container.innerHTML = html;
    }

    renderPRHistoryTable() {
        const container = document.getElementById('prHistoryTable');
        if (!container) return;
        const allPRs = this.getAllPersonalRecords();
        if (!allPRs || allPRs.length === 0) {
            container.innerHTML = '<p class="text-muted">Aún no hay PRs registrados.</p>';
            return;
        }
        let html = '<table class="pr-history-table"><thead><tr><th>Ejercicio</th><th>Mejor 1RM</th><th>Peso x Reps</th><th>Fecha</th><th>Total PRs</th></tr></thead><tbody>';
        allPRs.forEach(pr => {
            const best1RM = Math.max(...pr.records.map(r => r.estimated1RM || 0));
            const latest = pr.records[pr.records.length - 1];
            html += '<tr><td>' + pr.name + '</td><td>' + best1RM.toFixed(1) + ' kg</td><td>' + latest.weight + ' kg x ' + latest.reps + ' reps</td><td>' + (latest.date || '-') + '</td><td>' + pr.records.length + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    showTechPopup(exerciseName) {
        const dialog = document.getElementById('techDialog');
        const nameEl = document.getElementById('techPopupName');
        const tipEl = document.getElementById('techPopupTip');
        const videoContainer = document.getElementById('techVideoContainer');
        if (!dialog || !nameEl || !tipEl) return;
        const normalized = exerciseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const tip = EXERCISE_TECHNIQUE_TIPS[normalized] || EXERCISE_TECHNIQUE_TIPS[normalized.replace(/s$/, '')];
        nameEl.textContent = exerciseName;
        tipEl.textContent = tip || 'No hay consejo disponible para este ejercicio. Concéntrate en la técnica!';
        videoContainer.innerHTML = '';
        const videoId = EXERCISE_VIDEOS[normalized];
        if (videoId) {
            const iframe = document.createElement('iframe');
            iframe.width = '100%';
            iframe.height = '200';
            iframe.src = 'https://www.youtube.com/embed/' + videoId;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            videoContainer.appendChild(iframe);
        }
        dialog.showModal();
    }

    renderPersonalRecords() {
        if (!this.elements.prList) return;
        const allPRs = this.getAllPersonalRecords();
        
        if (allPRs.length === 0) {
            this.elements.prList.innerHTML = '<p class="text-muted">No hay PRs registrados aún</p>';
            return;
        }

        this.elements.prList.innerHTML = allPRs.map(pr => {
            const bestRecord = pr.records.reduce((best, current) => {
                return (current.estimated1RM || 0) > (best.estimated1RM || 0) ? current : best;
            }, pr.records[0]);

            return `
                <div class="pr-item">
                    <div class="pr-exercise-name">🏆 ${pr.name}</div>
                    <div class="pr-details">
                        <span class="pr-weight">${bestRecord.weight} kg</span>
                        <span class="pr-reps">x ${bestRecord.reps}</span>
                        <span class="pr-date">${bestRecord.date}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

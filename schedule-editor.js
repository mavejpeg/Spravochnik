// schedule-editor.js - Полноценный редактор графиков

let currentPointId = null;
let currentYear = null;
let currentMonth = null;
let currentUsers = [];
let currentSchedules = {};
let daysInMonth = 0;
let pointsList = [];
let allUsersList = [];

async function initScheduleEditor() {
    console.log('Schedule editor initializing...');
    await loadPointsListForSchedule();
    
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    updateMonthDisplaySchedule();
    
    setupMonthNavigationSchedule();
    
    // Ждем появления select и загружаем первую точку
    setTimeout(() => {
        const pointSelect = document.getElementById('schedulePointSelect');
        if (pointSelect && pointsList.length > 0) {
            if (!currentPointId && pointsList[0]) {
                currentPointId = pointsList[0].id;
                pointSelect.value = currentPointId;
                loadPointSchedule();
            }
        }
    }, 100);
}

async function loadPointsListForSchedule() {
    try {
        const response = await fetch('/api/points', { credentials: 'include' });
        pointsList = await response.json();
        console.log('Points loaded:', pointsList);
        
        const pointSelect = document.getElementById('schedulePointSelect');
        if (pointSelect) {
            if (pointsList.length === 0) {
                pointSelect.innerHTML = '<option value="">— Нет точек —</option>';
                return;
            }
            
            pointSelect.innerHTML = '<option value="">— Выберите точку —</option>' +
                pointsList.map(p => `<option value="${p.id}">📍 ${escapeHtml(p.name)}${p.address ? ' — ' + escapeHtml(p.address) : ''}</option>`).join('');
            
            // Убираем старый listener и добавляем новый
            const newSelect = pointSelect.cloneNode(true);
            pointSelect.parentNode.replaceChild(newSelect, pointSelect);
            
            newSelect.addEventListener('change', async (e) => {
                const value = e.target.value;
                console.log('Point selected:', value);
                if (value && value !== '') {
                    currentPointId = parseInt(value);
                    await loadPointSchedule();
                } else {
                    document.getElementById('scheduleEditorContainer').innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);">Выберите точку</div>';
                }
            });
            
            // Сохраняем reference
            window.schedulePointSelect = newSelect;
        }
    } catch (error) {
        console.error('Failed to load points:', error);
        const pointSelect = document.getElementById('schedulePointSelect');
        if (pointSelect) {
            pointSelect.innerHTML = '<option value="">— Ошибка загрузки точек —</option>';
        }
    }
}

async function loadPointSchedule() {
    if (!currentPointId || !currentYear || !currentMonth) return;
    
    const container = document.getElementById('scheduleEditorContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Загрузка графика...</div>';
    
    try {
        const response = await fetch(`/api/schedule/point/${currentPointId}/${currentYear}/${currentMonth}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        currentUsers = data.users || [];
        currentSchedules = data.schedules || {};
        daysInMonth = data.daysInMonth || new Date(currentYear, currentMonth, 0).getDate();
        allUsersList = data.allUsers || [];
        
        renderScheduleEditor();
    } catch (error) {
        console.error('Failed to load schedule:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--accent2);">❌ Ошибка загрузки графика</div>';
    }
}

function renderScheduleEditor() {
    const container = document.getElementById('scheduleEditorContainer');
    if (!container) return;
    
    const point = pointsList.find(p => p.id === currentPointId);
    
    if (!currentUsers.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--muted);">
                👥 Нет сотрудников на этой точке<br>
                <small>Сначала назначьте сотрудников на точку в разделе "Пользователи"</small>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="schedule-point-header">
            <div class="schedule-point-name">📍 ${escapeHtml(point?.name || 'Точка')}</div>
            ${point?.address ? `<div class="schedule-point-address">${escapeHtml(point.address)}</div>` : ''}
        </div>
        
        <div class="schedule-toolbar">
            <div class="toolbar-group">
                <button type="button" class="toolbar-btn" onclick="window.copyFromPreviousMonthSchedule()">📋 Копировать с прошлого</button>
                <button type="button" class="toolbar-btn" onclick="window.clearAllSchedules()">🗑 Очистить все</button>
            </div>
            <div class="toolbar-group">
                <span class="toolbar-label">Быстрые действия:</span>
                <button type="button" class="toolbar-btn small" onclick="window.bulkSetDaysSchedule('work')">✓ Все рабочие</button>
                <button type="button" class="toolbar-btn small" onclick="window.bulkSetDaysSchedule('off')">✗ Все выходные</button>
                <button type="button" class="toolbar-btn small" onclick="window.bulkAlternateSchedule()">🔄 Чередование 3/3</button>
                <button type="button" class="toolbar-btn small" onclick="window.bulkWeekendsOnlySchedule()">📅 Только выходные (Сб+Вс)</button>
            </div>
        </div>
        
        <div class="schedule-table-wrapper">
            <table class="schedule-editor-table" id="scheduleTable">
                <thead>
                    <tr>
                        <th class="col-employee">Сотрудник</th>
                        <th class="col-partner">Сменщик</th>
                        ${Array(daysInMonth).fill().map((_, i) => {
                            const date = new Date(currentYear, currentMonth - 1, i + 1);
                            const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' });
                            const isSunday = date.getDay() === 0;
                            return `<th class="col-day ${isSunday ? 'sunday' : ''}">${i + 1}<br><span class="weekday">${weekday}</span></th>`;
                        }).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const user of currentUsers) {
        const schedule = currentSchedules[user.id] || { days: Array(daysInMonth).fill('off') };
        const days = schedule.days;
        const partner = allUsersList.find(u => u.id === schedule.partner_id);
        
        html += `
            <tr class="schedule-row" data-user-id="${user.id}">
                <td class="col-employee">
                    <div class="employee-info">
                        <strong>${escapeHtml(user.full_name)}</strong>
                        ${user.position ? `<span class="employee-position">${escapeHtml(user.position)}</span>` : ''}
                    </div>
                </td>
                <td class="col-partner">
                    <select class="partner-select" data-user="${user.id}" onchange="window.updatePartnerSchedule(${user.id}, this.value)">
                        <option value="">— Нет сменщика —</option>
                        ${allUsersList.filter(u => u.id !== user.id).map(u => 
                            `<option value="${u.id}" ${schedule.partner_id === u.id ? 'selected' : ''}>${escapeHtml(u.full_name)}</option>`
                        ).join('')}
                    </select>
                </td>
        `;
        
        for (let d = 0; d < daysInMonth; d++) {
            const dayType = days[d] || 'off';
            const date = new Date(currentYear, currentMonth - 1, d + 1);
            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;
            
            html += `
                <td class="col-day">
                    <button type="button" class="day-toggle ${dayType} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}" 
                            data-user="${user.id}" 
                            data-day="${d}"
                            onclick="window.toggleDaySchedule(${user.id}, ${d})">
                        ${dayType === 'work' ? (isSunday ? '🧹' : '✓') : '✗'}
                    </button>
                </td>
            `;
        }
        
        html += `</tr>`;
    }
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div class="schedule-legend">
            <div class="legend-item"><span class="legend-dot work"></span> Рабочий день</div>
            <div class="legend-item"><span class="legend-dot off"></span> Выходной</div>
            <div class="legend-item"><span class="legend-dot work-sunday"></span> Рабочий + уборка (воскресенье)</div>
            <div class="legend-item"><span class="legend-dot saturday"></span> Суббота</div>
        </div>
        
        <div class="schedule-actions">
            <button type="button" class="save-all-btn" onclick="window.saveAllSchedulesSchedule()">💾 Сохранить все графики</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Все функции с префиксом Schedule для избежания конфликтов
window.toggleDaySchedule = function(userId, dayIndex) {
    if (!currentSchedules[userId]) {
        currentSchedules[userId] = { days: Array(daysInMonth).fill('off') };
    }
    
    const currentValue = currentSchedules[userId].days[dayIndex];
    currentSchedules[userId].days[dayIndex] = currentValue === 'work' ? 'off' : 'work';
    
    const btn = document.querySelector(`.day-toggle[data-user="${userId}"][data-day="${dayIndex}"]`);
    if (btn) {
        const newValue = currentSchedules[userId].days[dayIndex];
        const date = new Date(currentYear, currentMonth - 1, dayIndex + 1);
        const isSunday = date.getDay() === 0;
        const isSaturday = date.getDay() === 6;
        btn.className = `day-toggle ${newValue} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}`;
        btn.innerHTML = newValue === 'work' ? (isSunday ? '🧹' : '✓') : '✗';
    }
};

window.updatePartnerSchedule = function(userId, partnerId) {
    if (!currentSchedules[userId]) {
        currentSchedules[userId] = { days: Array(daysInMonth).fill('off') };
    }
    currentSchedules[userId].partner_id = partnerId ? parseInt(partnerId) : null;
    showToastSchedule('Сменщик назначен', 'success');
};

window.bulkSetDaysSchedule = function(value) {
    if (!confirm(`Установить ${value === 'work' ? 'рабочие' : 'выходные'} дни для всех сотрудников?`)) return;
    
    for (const user of currentUsers) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        currentSchedules[user.id].days = Array(daysInMonth).fill(value);
    }
    
    renderScheduleEditor();
    showToastSchedule(`Все дни установлены как ${value === 'work' ? 'рабочие' : 'выходные'}`, 'success');
};

window.bulkWeekendsOnlySchedule = function() {
    if (!confirm('Установить рабочими только субботу и воскресенье?')) return;
    
    for (const user of currentUsers) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        
        for (let d = 0; d < daysInMonth; d++) {
            const date = new Date(currentYear, currentMonth - 1, d + 1);
            const isWeekend = date.getDay() === 6 || date.getDay() === 0;
            currentSchedules[user.id].days[d] = isWeekend ? 'work' : 'off';
        }
    }
    
    renderScheduleEditor();
    showToastSchedule('Рабочие дни установлены: Суббота и Воскресенье', 'success');
};

window.bulkAlternateSchedule = function() {
    const userId = prompt('Введите ID сотрудника (оставьте пустым для всех):');
    const startDay = parseInt(prompt('С какого дня начать чередование? (1-31)', '1'));
    if (isNaN(startDay) || startDay < 1 || startDay > daysInMonth) {
        showToastSchedule('Некорректный день', 'error');
        return;
    }
    
    const pattern = prompt('Введите паттерн чередования (например: 3/3 или 2/2):', '3/3');
    if (!pattern) return;
    
    const [workDays, offDays] = pattern.split('/').map(Number);
    if (isNaN(workDays) || isNaN(offDays)) {
        showToastSchedule('Неверный формат. Используйте например: 3/3', 'error');
        return;
    }
    
    const usersToUpdate = userId ? currentUsers.filter(u => u.id == userId) : currentUsers;
    
    for (const user of usersToUpdate) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        
        const days = currentSchedules[user.id].days;
        let isWork = true;
        let counter = 0;
        
        for (let i = startDay - 1; i < daysInMonth; i++) {
            days[i] = isWork ? 'work' : 'off';
            counter++;
            if ((isWork && counter === workDays) || (!isWork && counter === offDays)) {
                isWork = !isWork;
                counter = 0;
            }
        }
    }
    
    renderScheduleEditor();
    showToastSchedule(`Чередование ${pattern} применено`, 'success');
};

window.copyFromPreviousMonthSchedule = async function() {
    if (!currentPointId) return;
    if (!confirm('Скопировать график с прошлого месяца?')) return;
    
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
    }
    
    try {
        const response = await fetch(`/api/schedule/point/${currentPointId}/${prevYear}/${prevMonth}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        
        if (data.schedules && Object.keys(data.schedules).length > 0) {
            for (const [userId, schedule] of Object.entries(data.schedules)) {
                if (currentSchedules[userId]) {
                    let days = schedule.days;
                    if (days.length > daysInMonth) {
                        days = days.slice(0, daysInMonth);
                    } else if (days.length < daysInMonth) {
                        while (days.length < daysInMonth) days.push('off');
                    }
                    currentSchedules[userId].days = days;
                    if (schedule.partner_id) {
                        currentSchedules[userId].partner_id = schedule.partner_id;
                    }
                }
            }
            renderScheduleEditor();
            showToastSchedule('График скопирован с прошлого месяца', 'success');
        } else {
            showToastSchedule('Нет данных за прошлый месяц', 'error');
        }
    } catch (error) {
        console.error('Copy error:', error);
        showToastSchedule('Ошибка при копировании', 'error');
    }
};

window.clearAllSchedules = function() {
    if (!confirm('Очистить все графики для всех сотрудников на этой точке?')) return;
    
    for (const user of currentUsers) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        currentSchedules[user.id].days = Array(daysInMonth).fill('off');
    }
    
    renderScheduleEditor();
    showToastSchedule('Все графики очищены', 'success');
};

window.saveAllSchedulesSchedule = async function() {
    if (!currentPointId) return;
    
    const saveBtn = document.querySelector('.save-all-btn');
    if (!saveBtn) return;
    
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '⏳ Сохранение...';
    saveBtn.disabled = true;
    
    const schedulesToSave = {};
    for (const user of currentUsers) {
        if (currentSchedules[user.id]) {
            schedulesToSave[user.id] = {
                days: currentSchedules[user.id].days,
                partner_id: currentSchedules[user.id].partner_id || null
            };
        }
    }
    
    try {
        const response = await fetch(`/api/schedule/point/${currentPointId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                year: currentYear,
                month: currentMonth,
                schedules: schedulesToSave
            })
        });
        
        if (response.ok) {
            showToastSchedule('✅ Все графики сохранены!', 'success');
            saveBtn.innerHTML = '✅ Сохранено!';
            setTimeout(() => { saveBtn.innerHTML = originalText; }, 2000);
        } else {
            const error = await response.json();
            showToastSchedule('❌ Ошибка: ' + (error.error || 'Неизвестная ошибка'), 'error');
            saveBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Save error:', error);
        showToastSchedule('❌ Ошибка соединения', 'error');
        saveBtn.innerHTML = originalText;
    } finally {
        saveBtn.disabled = false;
    }
};

function setupMonthNavigationSchedule() {
    const prevBtn = document.getElementById('schedulePrevMonth');
    const nextBtn = document.getElementById('scheduleNextMonth');
    
    if (prevBtn) {
        const newPrev = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        newPrev.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
            updateMonthDisplaySchedule();
            loadPointSchedule();
        });
    }
    
    if (nextBtn) {
        const newNext = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        newNext.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            updateMonthDisplaySchedule();
            loadPointSchedule();
        });
    }
}

function updateMonthDisplaySchedule() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const label = document.getElementById('scheduleCurrentMonth');
    if (label) {
        label.textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;
    }
}

function showToastSchedule(message, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--surface2);
        border-left: 3px solid ${type === 'success' ? 'var(--accent3)' : 'var(--accent2)'};
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-size: 13px;
        color: var(--text);
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// Экспорт
window.initScheduleEditor = initScheduleEditor;
window.loadPointsListForSchedule = loadPointsListForSchedule;

console.log('Schedule editor loaded');

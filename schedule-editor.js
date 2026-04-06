// schedule-editor.js - Полноценный редактор графиков

let currentPointId = null;
let currentYear = null;
let currentMonth = null;
let currentUsers = [];
let currentSchedules = {};
let daysInMonth = 0;
let pointsList = [];
let allUsersList = [];
let selectedCell = null;

// Инициализация
async function initScheduleEditor() {
    console.log('Schedule editor initializing...');
    await loadPoints();
    
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    updateMonthDisplay();
    
    setupMonthNavigation();
    
    if (pointsList.length > 0 && !currentPointId) {
        currentPointId = pointsList[0].id;
        const pointSelect = document.getElementById('schedulePointSelect');
        if (pointSelect) pointSelect.value = currentPointId;
        await loadPointSchedule();
    }
}

// Загрузка списка точек
async function loadPoints() {
    try {
        const response = await fetch('/api/points', { credentials: 'include' });
        pointsList = await response.json();
        
        const pointSelect = document.getElementById('schedulePointSelect');
        if (pointSelect) {
            pointSelect.innerHTML = '<option value="">— Выберите точку —</option>' +
                pointsList.map(p => `<option value="${p.id}">📍 ${escapeHtml(p.name)}${p.address ? ' — ' + escapeHtml(p.address) : ''}</option>`).join('');
            
            pointSelect.addEventListener('change', async (e) => {
                currentPointId = parseInt(e.target.value);
                if (currentPointId) {
                    await loadPointSchedule();
                } else {
                    document.getElementById('scheduleEditorContainer').innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);">Выберите точку</div>';
                }
            });
        }
    } catch (error) {
        console.error('Failed to load points:', error);
        showToast('Ошибка загрузки точек', 'error');
    }
}

// Загрузка графика для выбранной точки
async function loadPointSchedule() {
    if (!currentPointId || !currentYear || !currentMonth) return;
    
    const container = document.getElementById('scheduleEditorContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Загрузка графика...</div>';
    
    try {
        const response = await fetch(`/api/schedule/point/${currentPointId}/${currentYear}/${currentMonth}`, {
            credentials: 'include'
        });
        
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

// Рендер редактора
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
                <button class="toolbar-btn" onclick="window.copyFromPreviousMonth()" title="Скопировать график с прошлого месяца">📋 Копировать с прошлого</button>
                <button class="toolbar-btn" onclick="window.clearAllSchedules()" title="Очистить все графики">🗑 Очистить все</button>
            </div>
            <div class="toolbar-group">
                <span class="toolbar-label">Быстрые действия:</span>
                <button class="toolbar-btn small" onclick="window.bulkSetDays('work')">✓ Все рабочие</button>
                <button class="toolbar-btn small" onclick="window.bulkSetDays('off')">✗ Все выходные</button>
                <button class="toolbar-btn small" onclick="window.bulkAlternate()">🔄 Чередование 3/3</button>
                <button class="toolbar-btn small" onclick="window.bulkWeekendsOnly()">📅 Только выходные (Сб+Вс)</button>
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
        
        // Находим имя сменщика
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
                    <select class="partner-select" data-user="${user.id}" onchange="window.updatePartner(${user.id}, this.value)">
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
                    <button class="day-toggle ${dayType} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}" 
                            data-user="${user.id}" 
                            data-day="${d}"
                            onclick="window.toggleDay(${user.id}, ${d})">
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
            <button class="save-all-btn" onclick="window.saveAllSchedules()">💾 Сохранить все графики</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Переключение дня
window.toggleDay = function(userId, dayIndex) {
    if (!currentSchedules[userId]) {
        currentSchedules[userId] = { days: Array(daysInMonth).fill('off') };
    }
    
    const currentValue = currentSchedules[userId].days[dayIndex];
    currentSchedules[userId].days[dayIndex] = currentValue === 'work' ? 'off' : 'work';
    
    // Обновляем кнопку
    const btn = document.querySelector(`.day-toggle[data-user="${userId}"][data-day="${dayIndex}"]`);
    if (btn) {
        const newValue = currentSchedules[userId].days[dayIndex];
        const date = new Date(currentYear, currentMonth - 1, dayIndex + 1);
        const isSunday = date.getDay() === 0;
        const isSaturday = date.getDay() === 6;
        btn.className = `day-toggle ${newValue} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}`;
        btn.innerHTML = newValue === 'work' ? (isSunday ? '🧹' : '✓') : '✗';
        
        // Анимация
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => { btn.style.transform = ''; }, 150);
    }
};

// Обновление сменщика
window.updatePartner = function(userId, partnerId) {
    if (!currentSchedules[userId]) {
        currentSchedules[userId] = { days: Array(daysInMonth).fill('off') };
    }
    currentSchedules[userId].partner_id = partnerId ? parseInt(partnerId) : null;
    showToast('Сменщик назначен', 'success');
};

// Массовая установка дней для ВСЕХ сотрудников
window.bulkSetDays = function(value) {
    if (!confirm(`Установить ${value === 'work' ? 'рабочие' : 'выходные'} дни для всех сотрудников?`)) return;
    
    for (const user of currentUsers) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        currentSchedules[user.id].days = Array(daysInMonth).fill(value);
    }
    
    renderScheduleEditor();
    showToast(`Все дни установлены как ${value === 'work' ? 'рабочие' : 'выходные'}`, 'success');
};

// Только выходные (суббота и воскресенье рабочие, остальные выходные)
window.bulkWeekendsOnly = function() {
    if (!confirm('Установить рабочими только субботу и воскресенье?')) return;
    
    for (const user of currentUsers) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        
        for (let d = 0; d < daysInMonth; d++) {
            const date = new Date(currentYear, currentMonth - 1, d + 1);
            const isWeekend = date.getDay() === 6 || date.getDay() === 0; // Сб или Вс
            currentSchedules[user.id].days[d] = isWeekend ? 'work' : 'off';
        }
    }
    
    renderScheduleEditor();
    showToast('Рабочие дни установлены: Суббота и Воскресенье', 'success');
};

// Чередование 3/3 для выбранного сотрудника
window.bulkAlternate = function() {
    const userId = prompt('Введите ID сотрудника (оставьте пустым для всех):\n\nID можно увидеть в консоли или в списке пользователей');
    
    const startDay = parseInt(prompt('С какого дня начать чередование? (1-31)', '1'));
    if (isNaN(startDay) || startDay < 1 || startDay > daysInMonth) {
        showToast('Некорректный день', 'error');
        return;
    }
    
    const pattern = prompt('Введите паттерн чередования (например: 3/3 или 2/2 или 5/2):', '3/3');
    if (!pattern) return;
    
    const [workDays, offDays] = pattern.split('/').map(Number);
    if (isNaN(workDays) || isNaN(offDays)) {
        showToast('Неверный формат. Используйте например: 3/3', 'error');
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
    showToast(`Чередование ${pattern} применено`, 'success');
};

// Копирование с прошлого месяца
window.copyFromPreviousMonth = async function() {
    if (!currentPointId) return;
    
    if (!confirm('Скопировать график с прошлого месяца?')) return;
    
    try {
        const response = await fetch(`/api/schedule/copy/${currentPointId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ year: currentYear, month: currentMonth })
        });
        
        const data = await response.json();
        
        if (data.schedules) {
            for (const [userId, schedule] of Object.entries(data.schedules)) {
                if (currentSchedules[userId]) {
                    currentSchedules[userId].days = schedule.days;
                    if (schedule.partner_id) {
                        currentSchedules[userId].partner_id = schedule.partner_id;
                    }
                }
            }
            renderScheduleEditor();
            showToast('График скопирован с прошлого месяца', 'success');
        } else {
            showToast('Нет данных за прошлый месяц', 'error');
        }
    } catch (error) {
        console.error('Failed to copy schedule:', error);
        showToast('Ошибка при копировании', 'error');
    }
};

// Очистка всех графиков
window.clearAllSchedules = function() {
    if (!confirm('Очистить все графики для всех сотрудников на этой точке?')) return;
    
    for (const user of currentUsers) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        currentSchedules[user.id].days = Array(daysInMonth).fill('off');
    }
    
    renderScheduleEditor();
    showToast('Все графики очищены', 'success');
};

// Сохранение всех графиков
window.saveAllSchedules = async function() {
    if (!currentPointId) return;
    
    const saveBtn = document.querySelector('.save-all-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '⏳ Сохранение...';
    saveBtn.disabled = true;
    
    // Собираем данные для сохранения
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
            showToast('✅ Все графики сохранены!', 'success');
            saveBtn.innerHTML = '✅ Сохранено!';
            setTimeout(() => { saveBtn.innerHTML = originalText; }, 2000);
        } else {
            const error = await response.json();
            showToast('❌ Ошибка: ' + (error.error || 'Неизвестная ошибка'), 'error');
            saveBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('❌ Ошибка соединения', 'error');
        saveBtn.innerHTML = originalText;
    } finally {
        saveBtn.disabled = false;
    }
};

// Навигация по месяцам
function setupMonthNavigation() {
    const prevBtn = document.getElementById('schedulePrevMonth');
    const nextBtn = document.getElementById('scheduleNextMonth');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
            updateMonthDisplay();
            loadPointSchedule();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            updateMonthDisplay();
            loadPointSchedule();
        });
    }
}

function updateMonthDisplay() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const label = document.getElementById('scheduleCurrentMonth');
    if (label) {
        label.textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `schedule-toast ${type}`;
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
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// Экспорт в глобальный объект
window.initScheduleEditor = initScheduleEditor;
window.toggleDay = toggleDay;
window.updatePartner = updatePartner;
window.bulkSetDays = bulkSetDays;
window.bulkAlternate = bulkAlternate;
window.bulkWeekendsOnly = bulkWeekendsOnly;
window.copyFromPreviousMonth = copyFromPreviousMonth;
window.clearAllSchedules = clearAllSchedules;
window.saveAllSchedules = saveAllSchedules;

console.log('Schedule editor loaded');

// schedule-editor.js - Редактор графиков для всех точек

let currentPointId = null;
let currentYear = null;
let currentMonth = null;
let currentUsers = [];
let currentSchedules = {};
let daysInMonth = 0;
let pointsList = [];

// Инициализация редактора
async function initScheduleEditor() {
    // Загружаем список точек
    await loadPoints();
    
    // Устанавливаем текущий месяц
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    
    // Обновляем отображение месяца
    updateMonthDisplay();
    
    // Если есть точки, загружаем первую
    if (pointsList.length > 0) {
        currentPointId = pointsList[0].id;
        await loadPointSchedule();
    }
}

// Загрузка списка точек
async function loadPoints() {
    try {
        const response = await fetch('/api/points', { credentials: 'include' });
        pointsList = await response.json();
        
        const pointSelect = document.getElementById('pointSelect');
        if (pointSelect) {
            pointSelect.innerHTML = pointsList.map(p => 
                `<option value="${p.id}">📍 ${escapeHtml(p.name)}${p.address ? ' — ' + escapeHtml(p.address) : ''}</option>`
            ).join('');
            
            pointSelect.addEventListener('change', async (e) => {
                currentPointId = parseInt(e.target.value);
                await loadPointSchedule();
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
    container.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Загрузка графика...</div>';
    
    try {
        const response = await fetch(`/api/schedule/point/${currentPointId}/${currentYear}/${currentMonth}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        currentUsers = data.users;
        currentSchedules = data.schedules;
        daysInMonth = data.daysInMonth;
        
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
    
    // Получаем информацию о точке
    const point = pointsList.find(p => p.id === currentPointId);
    const pointName = point?.name || 'Точка';
    const pointAddress = point?.address || '';
    
    let html = `
        <div class="schedule-point-header">
            <div class="schedule-point-name">📍 ${escapeHtml(pointName)}</div>
            ${pointAddress ? `<div class="schedule-point-address">${escapeHtml(pointAddress)}</div>` : ''}
        </div>
        
        <div class="schedule-table-wrapper">
            <table class="schedule-editor-table">
                <thead>
                    <tr>
                        <th class="col-employee">Сотрудник</th>
                        ${Array(daysInMonth).fill().map((_, i) => `<th class="col-day">${i + 1}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const user of currentUsers) {
        const schedule = currentSchedules[user.id] || { days: Array(daysInMonth).fill('off') };
        const days = schedule.days;
        
        html += `
            <tr class="schedule-row" data-user-id="${user.id}" data-user-name="${escapeHtml(user.full_name)}">
                <td class="col-employee">
                    <div class="employee-info">
                        <strong>${escapeHtml(user.full_name)}</strong>
                        ${user.position ? `<span class="employee-position">${escapeHtml(user.position)}</span>` : ''}
                    </div>
                </td>
        `;
        
        for (let d = 0; d < daysInMonth; d++) {
            const dayType = days[d] || 'off';
            const isSunday = new Date(currentYear, currentMonth - 1, d + 1).getDay() === 0;
            
            html += `
                <td class="col-day">
                    <button class="day-toggle ${dayType} ${isSunday ? 'sunday' : ''}" 
                            data-user="${user.id}" 
                            data-day="${d}"
                            onclick="toggleDay(${user.id}, ${d})">
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
        </div>
        
        <div class="schedule-bulk-actions">
            <button onclick="bulkSetDays('work')" class="bulk-btn work">✓ Все рабочие</button>
            <button onclick="bulkSetDays('off')" class="bulk-btn off">✗ Все выходные</button>
            <button onclick="bulkAlternate()" class="bulk-btn alternate">🔄 Чередование 3/3</button>
            <button onclick="copyPreviousMonth()" class="bulk-btn copy">📋 Скопировать с прошлого месяца</button>
        </div>
        
        <div class="schedule-actions">
            <button onclick="saveAllSchedules()" class="save-all-btn">💾 Сохранить все графики</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Переключение дня
window.toggleDay = function(userId, dayIndex) {
    const schedule = currentSchedules[userId];
    if (!schedule) {
        currentSchedules[userId] = { days: Array(daysInMonth).fill('off') };
    }
    
    const currentSched = currentSchedules[userId];
    const currentValue = currentSched.days[dayIndex];
    currentSched.days[dayIndex] = currentValue === 'work' ? 'off' : 'work';
    
    // Обновляем кнопку
    const btn = document.querySelector(`.day-toggle[data-user="${userId}"][data-day="${dayIndex}"]`);
    if (btn) {
        const newValue = currentSched.days[dayIndex];
        const isSunday = new Date(currentYear, currentMonth - 1, dayIndex + 1).getDay() === 0;
        btn.className = `day-toggle ${newValue} ${isSunday ? 'sunday' : ''}`;
        btn.innerHTML = newValue === 'work' ? (isSunday ? '🧹' : '✓') : '✗';
    }
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

// Чередование 3/3 для выбранного сотрудника (или для всех)
window.bulkAlternate = function() {
    const userId = prompt('Введите ID сотрудника (оставьте пустым для всех):');
    
    const startDay = parseInt(prompt('С какого дня начать чередование? (1-31)', '1'));
    if (isNaN(startDay) || startDay < 1 || startDay > daysInMonth) {
        alert('Некорректный день');
        return;
    }
    
    const usersToUpdate = userId ? currentUsers.filter(u => u.id == userId) : currentUsers;
    
    for (const user of usersToUpdate) {
        if (!currentSchedules[user.id]) {
            currentSchedules[user.id] = { days: Array(daysInMonth).fill('off') };
        }
        
        const days = currentSchedules[user.id].days;
        let toggle = true; // true = work, false = off
        let workCount = 0;
        
        for (let i = startDay - 1; i < daysInMonth; i++) {
            if (toggle) {
                days[i] = 'work';
                workCount++;
                if (workCount === 3) {
                    toggle = false;
                    workCount = 0;
                }
            } else {
                days[i] = 'off';
                workCount++;
                if (workCount === 3) {
                    toggle = true;
                    workCount = 0;
                }
            }
        }
    }
    
    renderScheduleEditor();
    showToast(`Чередование 3/3 применено`, 'success');
};

// Копирование с прошлого месяца
window.copyPreviousMonth = async function() {
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
        
        const data = await response.json();
        
        if (data.schedules && Object.keys(data.schedules).length > 0) {
            for (const [userId, schedule] of Object.entries(data.schedules)) {
                if (currentSchedules[userId]) {
                    // Копируем дни, но обрезаем/дополняем до нужного количества
                    const oldDays = schedule.days;
                    const newDays = [...oldDays];
                    if (newDays.length > daysInMonth) {
                        newDays.length = daysInMonth;
                    } else if (newDays.length < daysInMonth) {
                        while (newDays.length < daysInMonth) {
                            newDays.push('off');
                        }
                    }
                    currentSchedules[userId].days = newDays;
                }
            }
            renderScheduleEditor();
            showToast('График скопирован с прошлого месяца', 'success');
        } else {
            alert('Нет данных за прошлый месяц');
        }
    } catch (error) {
        console.error('Failed to copy schedule:', error);
        alert('Ошибка при копировании');
    }
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
        } else {
            const error = await response.json();
            showToast('❌ Ошибка: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('❌ Ошибка соединения', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
};

// Навигация по месяцам
function previousMonth() {
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    updateMonthDisplay();
    loadPointSchedule();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    updateMonthDisplay();
    loadPointSchedule();
}

function updateMonthDisplay() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const monthLabel = document.getElementById('currentMonthLabel');
    if (monthLabel) {
        monthLabel.textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--surface2);
        border-left: 3px solid ${type === 'success' ? 'var(--accent3)' : 'var(--accent2)'};
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initScheduleEditor();
});

// Добавляем стили в head
const style = document.createElement('style');
style.textContent = `
    .schedule-point-header {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 20px;
    }
    
    .schedule-point-name {
        font-family: 'Unbounded', sans-serif;
        font-size: 16px;
        font-weight: 700;
        color: var(--accent);
    }
    
    .schedule-point-address {
        font-size: 12px;
        color: var(--muted);
        margin-top: 4px;
    }
    
    .schedule-table-wrapper {
        overflow-x: auto;
        margin-bottom: 20px;
        border-radius: 12px;
        border: 1px solid var(--border);
    }
    
    .schedule-editor-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        min-width: 600px;
    }
    
    .schedule-editor-table th {
        background: var(--surface2);
        padding: 10px 6px;
        text-align: center;
        font-weight: 600;
        color: var(--muted);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
    }
    
    .schedule-editor-table td {
        padding: 8px 4px;
        text-align: center;
        border-bottom: 1px solid var(--border);
    }
    
    .col-employee {
        text-align: left !important;
        background: var(--surface2);
        position: sticky;
        left: 0;
        min-width: 180px;
    }
    
    .col-day {
        min-width: 44px;
    }
    
    .employee-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .employee-info strong {
        font-size: 13px;
        color: var(--strong);
    }
    
    .employee-position {
        font-size: 10px;
        color: var(--muted);
    }
    
    .day-toggle {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.15s;
        background: var(--surface);
    }
    
    .day-toggle.work {
        background: rgba(60, 255, 160, 0.2);
        color: var(--accent3);
        border: 1px solid rgba(60, 255, 160, 0.4);
    }
    
    .day-toggle.off {
        background: var(--surface2);
        color: var(--muted);
        border: 1px solid var(--border);
    }
    
    .day-toggle.work.sunday {
        background: rgba(124, 92, 252, 0.2);
        border-color: rgba(124, 92, 252, 0.4);
    }
    
    .day-toggle:hover {
        transform: scale(1.05);
    }
    
    .schedule-legend {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        padding: 12px 16px;
        background: var(--surface2);
        border-radius: 12px;
        margin-bottom: 20px;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--text2);
    }
    
    .legend-dot {
        width: 20px;
        height: 20px;
        border-radius: 6px;
    }
    
    .legend-dot.work {
        background: rgba(60, 255, 160, 0.2);
        border: 1px solid rgba(60, 255, 160, 0.4);
    }
    
    .legend-dot.off {
        background: var(--surface2);
        border: 1px solid var(--border);
    }
    
    .legend-dot.work-sunday {
        background: rgba(124, 92, 252, 0.2);
        border: 1px solid rgba(124, 92, 252, 0.4);
    }
    
    .schedule-bulk-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 20px;
    }
    
    .bulk-btn {
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text);
    }
    
    .bulk-btn.work {
        background: rgba(60, 255, 160, 0.1);
        border-color: rgba(60, 255, 160, 0.3);
        color: var(--accent3);
    }
    
    .bulk-btn.off {
        background: rgba(252, 92, 124, 0.1);
        border-color: rgba(252, 92, 124, 0.3);
        color: var(--accent2);
    }
    
    .bulk-btn.alternate {
        background: rgba(124, 92, 252, 0.1);
        border-color: rgba(124, 92, 252, 0.3);
        color: var(--accent);
    }
    
    .bulk-btn.copy {
        background: rgba(60, 186, 252, 0.1);
        border-color: rgba(60, 186, 252, 0.3);
        color: var(--accent5);
    }
    
    .bulk-btn:hover {
        transform: translateY(-1px);
    }
    
    .schedule-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
    }
    
    .save-all-btn {
        background: var(--accent);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .save-all-btn:hover {
        background: #8e6ffe;
        transform: translateY(-2px);
    }
    
    .month-navigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
    }
    
    .month-nav-btn {
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .current-month {
        font-family: 'Unbounded', sans-serif;
        font-size: 14px;
        font-weight: 600;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

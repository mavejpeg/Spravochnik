// schedule-editor.js - Исправленная версия
(function() {
    'use strict';
    
    let _currentPointId = null;
    let _currentYear = null;
    let _currentMonth = null;
    let _currentUsers = [];
    let _currentSchedules = {};
    let _daysInMonth = 0;
    let _pointsList = [];
    let _allUsersList = [];

    window.initScheduleEditor = async function() {
        console.log('Schedule editor initializing...');
        await loadPointsList();
        
        const now = new Date();
        _currentYear = now.getFullYear();
        _currentMonth = now.getMonth() + 1;
        updateMonthDisplay();
        
        setupMonthNavigation();
        
        setTimeout(() => {
            const pointSelect = document.getElementById('schedulePointSelect');
            if (pointSelect && _pointsList.length > 0) {
                // Не выбираем автоматически, ждем выбора пользователя
                console.log('Points loaded, waiting for user selection');
            }
        }, 100);
    };

    async function loadPointsList() {
        try {
            const response = await fetch('/api/points', { credentials: 'include' });
            _pointsList = await response.json();
            console.log('Points loaded:', _pointsList.length);
            console.log('First point:', _pointsList[0]);
            
            const pointSelect = document.getElementById('schedulePointSelect');
            if (pointSelect) {
                if (_pointsList.length === 0) {
                    pointSelect.innerHTML = '<option value="">— Нет точек —</option>';
                    return;
                }
                
                pointSelect.innerHTML = '<option value="">— Выберите точку —</option>' +
                    _pointsList.map(p => `<option value="${p.id}">📍 ${escapeHtml(p.name)}${p.address ? ' — ' + escapeHtml(p.address) : ''} (ID: ${p.id})</option>`).join('');
                
                const newSelect = pointSelect.cloneNode(true);
                pointSelect.parentNode.replaceChild(newSelect, pointSelect);
                
                newSelect.addEventListener('change', async (e) => {
                    const value = e.target.value;
                    console.log('Point selected:', value);
                    if (value && value !== '') {
                        _currentPointId = parseInt(value);
                        await loadPointSchedule();
                    } else {
                        document.getElementById('scheduleEditorContainer').innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);">Выберите точку</div>';
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load points:', error);
        }
    }

    async function loadPointSchedule() {
        if (!_currentPointId || !_currentYear || !_currentMonth) return;
        
        const container = document.getElementById('scheduleEditorContainer');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Загрузка графика...</div>';
        
        console.log('Loading schedule for point ID:', _currentPointId);
        
        // Сначала посмотрим всех пользователей и их точки
        try {
            const usersRes = await fetch('/api/debug/all-users-with-points', { credentials: 'include' });
            const allUsers = await usersRes.json();
            console.log('ALL USERS WITH POINTS:');
            allUsers.forEach(u => {
                console.log(`  - ${u.full_name}: point_id=${u.point_id}, point_name=${u.point_name || 'NULL'}`);
            });
            
            // Пользователи выбранной точки
            const usersOnPoint = allUsers.filter(u => u.point_id === _currentPointId && u.role === 'user');
            console.log(`Users on point ${_currentPointId}:`, usersOnPoint.length);
            
            if (usersOnPoint.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: var(--accent4);">
                        ⚠️ На этой точке (ID: ${_currentPointId}) нет сотрудников!<br><br>
                        <div style="text-align: left; background: var(--surface); padding: 16px; border-radius: 12px; margin-top: 16px;">
                            <strong>📋 Список всех сотрудников и их точки:</strong><br><br>
                            ${allUsers.filter(u => u.role === 'user').map(u => 
                                `• ${u.full_name} → точка: ${u.point_name || 'НЕ НАЗНАЧЕН'} (ID: ${u.point_id || 'NULL'})<br>`
                            ).join('')}
                        </div>
                        <br>
                        <button onclick="window.location.reload()" class="btn-add" style="margin-top: 10px;">🔄 Обновить</button>
                    </div>
                `;
                return;
            }
        } catch (err) {
            console.error('Debug error:', err);
        }
        
        try {
            const response = await fetch(`/api/schedule/point/${_currentPointId}/${_currentYear}/${_currentMonth}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Schedule API response:', data);
            
            _currentUsers = data.users || [];
            _currentSchedules = data.schedules || {};
            _daysInMonth = data.daysInMonth || new Date(_currentYear, _currentMonth, 0).getDate();
            _allUsersList = data.allUsers || [];
            
            console.log('Users from API:', _currentUsers.length);
            console.log('Users:', _currentUsers);
            
            if (_currentUsers.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: var(--accent4);">
                        ⚠️ API вернул 0 сотрудников для точки ID ${_currentPointId}<br><br>
                        <button onclick="window.initScheduleEditor()" class="btn-add" style="margin-top: 10px;">🔄 Попробовать снова</button>
                    </div>
                `;
                return;
            }
            
            renderScheduleEditor();
        } catch (error) {
            console.error('Failed to load schedule:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--accent2);">
                    ❌ Ошибка загрузки графика: ${error.message}<br>
                    <button onclick="window.initScheduleEditor()" class="btn-add" style="margin-top: 10px;">🔄 Повторить</button>
                </div>
            `;
        }
    }

    function renderScheduleEditor() {
        const container = document.getElementById('scheduleEditorContainer');
        if (!container) return;
        
        const point = _pointsList.find(p => p.id === _currentPointId);
        
        let html = `
            <div class="schedule-point-header">
                <div class="schedule-point-name">📍 ${escapeHtml(point?.name || 'Точка')} (ID: ${_currentPointId})</div>
                ${point?.address ? `<div class="schedule-point-address">${escapeHtml(point.address)}</div>` : ''}
                <div style="font-size: 11px; color: var(--muted); margin-top: 8px;">👥 Сотрудников на точке: ${_currentUsers.length}</div>
            </div>
            
            <div class="schedule-toolbar">
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" onclick="window.copyFromPreviousMonth()">📋 Копировать с прошлого</button>
                    <button type="button" class="toolbar-btn" onclick="window.clearAllSchedules()">🗑 Очистить все</button>
                </div>
                <div class="toolbar-group">
                    <span class="toolbar-label">Быстрые действия:</span>
                    <button type="button" class="toolbar-btn small" onclick="window.bulkSetDays('work')">✓ Все рабочие</button>
                    <button type="button" class="toolbar-btn small" onclick="window.bulkSetDays('off')">✗ Все выходные</button>
                    <button type="button" class="toolbar-btn small" onclick="window.bulkAlternate()">🔄 Чередование 3/3</button>
                    <button type="button" class="toolbar-btn small" onclick="window.bulkWeekendsOnly()">📅 Только выходные (Сб+Вс)</button>
                </div>
            </div>
            
            <div class="schedule-table-wrapper">
                <table class="schedule-editor-table">
                    <thead>
                        <tr>
                            <th class="col-employee">Сотрудник</th>
                            <th class="col-partner">Сменщик</th>
                            ${Array(_daysInMonth).fill().map((_, i) => {
                                const date = new Date(_currentYear, _currentMonth - 1, i + 1);
                                const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' });
                                const isSunday = date.getDay() === 0;
                                return `<th class="col-day ${isSunday ? 'sunday' : ''}">${i + 1}<br><span class="weekday">${weekday}</span></th>`;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const user of _currentUsers) {
            const schedule = _currentSchedules[user.id] || { days: Array(_daysInMonth).fill('off') };
            const days = schedule.days;
            
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
                            ${_allUsersList.filter(u => u.id !== user.id).map(u => 
                                `<option value="${u.id}" ${schedule.partner_id === u.id ? 'selected' : ''}>${escapeHtml(u.full_name)}</option>`
                            ).join('')}
                        </select>
                    </td>
            `;
            
            for (let d = 0; d < _daysInMonth; d++) {
                const dayType = days[d] || 'off';
                const date = new Date(_currentYear, _currentMonth - 1, d + 1);
                const isSunday = date.getDay() === 0;
                const isSaturday = date.getDay() === 6;
                
                html += `
                    <td class="col-day">
                        <button type="button" class="day-toggle ${dayType} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}" 
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
                <button type="button" class="save-all-btn" onclick="window.saveAllSchedules()">💾 Сохранить все графики</button>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // Функции для работы с днями
    window.toggleDay = function(userId, dayIndex) {
        if (!_currentSchedules[userId]) {
            _currentSchedules[userId] = { days: Array(_daysInMonth).fill('off') };
        }
        
        const currentValue = _currentSchedules[userId].days[dayIndex];
        _currentSchedules[userId].days[dayIndex] = currentValue === 'work' ? 'off' : 'work';
        
        const btn = document.querySelector(`.day-toggle[data-user="${userId}"][data-day="${dayIndex}"]`);
        if (btn) {
            const newValue = _currentSchedules[userId].days[dayIndex];
            const date = new Date(_currentYear, _currentMonth - 1, dayIndex + 1);
            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;
            btn.className = `day-toggle ${newValue} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}`;
            btn.innerHTML = newValue === 'work' ? (isSunday ? '🧹' : '✓') : '✗';
        }
    };

    window.updatePartner = function(userId, partnerId) {
        if (!_currentSchedules[userId]) {
            _currentSchedules[userId] = { days: Array(_daysInMonth).fill('off') };
        }
        _currentSchedules[userId].partner_id = partnerId ? parseInt(partnerId) : null;
        showToast('Сменщик назначен', 'success');
    };

    window.bulkSetDays = function(value) {
        if (!confirm(`Установить ${value === 'work' ? 'рабочие' : 'выходные'} дни для всех сотрудников?`)) return;
        
        for (const user of _currentUsers) {
            if (!_currentSchedules[user.id]) {
                _currentSchedules[user.id] = { days: Array(_daysInMonth).fill('off') };
            }
            _currentSchedules[user.id].days = Array(_daysInMonth).fill(value);
        }
        
        renderScheduleEditor();
        showToast(`Все дни установлены как ${value === 'work' ? 'рабочие' : 'выходные'}`, 'success');
    };

    window.bulkWeekendsOnly = function() {
        if (!confirm('Установить рабочими только субботу и воскресенье?')) return;
        
        for (const user of _currentUsers) {
            if (!_currentSchedules[user.id]) {
                _currentSchedules[user.id] = { days: Array(_daysInMonth).fill('off') };
            }
            
            for (let d = 0; d < _daysInMonth; d++) {
                const date = new Date(_currentYear, _currentMonth - 1, d + 1);
                const isWeekend = date.getDay() === 6 || date.getDay() === 0;
                _currentSchedules[user.id].days[d] = isWeekend ? 'work' : 'off';
            }
        }
        
        renderScheduleEditor();
        showToast('Рабочие дни установлены: Суббота и Воскресенье', 'success');
    };

    window.bulkAlternate = function() {
        const userId = prompt('Введите ID сотрудника (оставьте пустым для всех):');
        const startDay = parseInt(prompt('С какого дня начать чередование? (1-31)', '1'));
        if (isNaN(startDay) || startDay < 1 || startDay > _daysInMonth) {
            showToast('Некорректный день', 'error');
            return;
        }
        
        const pattern = prompt('Введите паттерн чередования (например: 3/3 или 2/2):', '3/3');
        if (!pattern) return;
        
        const [workDays, offDays] = pattern.split('/').map(Number);
        if (isNaN(workDays) || isNaN(offDays)) {
            showToast('Неверный формат. Используйте например: 3/3', 'error');
            return;
        }
        
        const usersToUpdate = userId ? _currentUsers.filter(u => u.id == userId) : _currentUsers;
        
        for (const user of usersToUpdate) {
            if (!_currentSchedules[user.id]) {
                _currentSchedules[user.id] = { days: Array(_daysInMonth).fill('off') };
            }
            
            const days = _currentSchedules[user.id].days;
            let isWork = true;
            let counter = 0;
            
            for (let i = startDay - 1; i < _daysInMonth; i++) {
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

    window.copyFromPreviousMonth = async function() {
        if (!_currentPointId) return;
        if (!confirm('Скопировать график с прошлого месяца?')) return;
        
        let prevYear = _currentYear;
        let prevMonth = _currentMonth - 1;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear--;
        }
        
        try {
            const response = await fetch(`/api/schedule/point/${_currentPointId}/${prevYear}/${prevMonth}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch');
            
            const data = await response.json();
            
            if (data.schedules && Object.keys(data.schedules).length > 0) {
                for (const [userId, schedule] of Object.entries(data.schedules)) {
                    if (_currentSchedules[userId]) {
                        let days = schedule.days;
                        if (days.length > _daysInMonth) {
                            days = days.slice(0, _daysInMonth);
                        } else if (days.length < _daysInMonth) {
                            while (days.length < _daysInMonth) days.push('off');
                        }
                        _currentSchedules[userId].days = days;
                        if (schedule.partner_id) {
                            _currentSchedules[userId].partner_id = schedule.partner_id;
                        }
                    }
                }
                renderScheduleEditor();
                showToast('График скопирован с прошлого месяца', 'success');
            } else {
                showToast('Нет данных за прошлый месяц', 'error');
            }
        } catch (error) {
            console.error('Copy error:', error);
            showToast('Ошибка при копировании', 'error');
        }
    };

    window.clearAllSchedules = function() {
        if (!confirm('Очистить все графики для всех сотрудников на этой точке?')) return;
        
        for (const user of _currentUsers) {
            if (!_currentSchedules[user.id]) {
                _currentSchedules[user.id] = { days: Array(_daysInMonth).fill('off') };
            }
            _currentSchedules[user.id].days = Array(_daysInMonth).fill('off');
        }
        
        renderScheduleEditor();
        showToast('Все графики очищены', 'success');
    };

    window.saveAllSchedules = async function() {
        if (!_currentPointId) return;
        
        const saveBtn = document.querySelector('.save-all-btn');
        if (!saveBtn) return;
        
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '⏳ Сохранение...';
        saveBtn.disabled = true;
        
        const schedulesToSave = {};
        for (const user of _currentUsers) {
            if (_currentSchedules[user.id]) {
                schedulesToSave[user.id] = {
                    days: _currentSchedules[user.id].days,
                    partner_id: _currentSchedules[user.id].partner_id || null
                };
            }
        }
        
        try {
            const response = await fetch(`/api/schedule/point/${_currentPointId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    year: _currentYear,
                    month: _currentMonth,
                    schedules: schedulesToSave
                })
            });
            
            if (response.ok) {
                showToast('✅ Все графики сохранены!', 'success');
                saveBtn.innerHTML = '✅ Сохранено!';
                setTimeout(() => { saveBtn.innerHTML = originalText; }, 2000);
            } else {
                showToast('❌ Ошибка сохранения', 'error');
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

    function setupMonthNavigation() {
        const prevBtn = document.getElementById('schedulePrevMonth');
        const nextBtn = document.getElementById('scheduleNextMonth');
        
        if (prevBtn) {
            const newPrev = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            newPrev.addEventListener('click', () => {
                _currentMonth--;
                if (_currentMonth < 1) {
                    _currentMonth = 12;
                    _currentYear--;
                }
                updateMonthDisplay();
                loadPointSchedule();
            });
        }
        
        if (nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', () => {
                _currentMonth++;
                if (_currentMonth > 12) {
                    _currentMonth = 1;
                    _currentYear++;
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
            label.textContent = `${monthNames[_currentMonth - 1]} ${_currentYear}`;
        }
    }

    function showToast(message, type) {
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

    console.log('Schedule editor loaded');
})();

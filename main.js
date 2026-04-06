// main.js v3.7 - исправлена авторизация при прямых переходах
window.isRop = false;
window.isRopGlobal = false;
window._authLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js v3.7 loaded');
    initTabs();
    initAccordions();
    initSearch();
    loadUserInfo();
    setupLogout();
    setupRopPanel();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.removeEventListener('click', handleTabClick);
        btn.addEventListener('click', handleTabClick);
    });
}

function handleTabClick(e) {
    const btn = e.currentTarget;
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const sec = document.getElementById(target);
    if (sec) sec.classList.add('active');
}

function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.acc-header');
        if (header && !accordion.hasAttribute('data-initialized')) {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                accordion.classList.toggle('open');
            });
            accordion.setAttribute('data-initialized', 'true');
        }
    });
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearch);
        searchInput.addEventListener('input', handleSearch);
    }
}

function handleSearch(e) {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('[data-searchable]').forEach(el => {
        el.classList.toggle('search-hidden', !el.textContent.toLowerCase().includes(val));
    });
}

async function loadContent(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    if (!contentDiv) return;
    
    try {
        const response = await fetch(`/api/content/${page}/${section}`, { credentials: 'include' });
        const data = await response.json();
        
        if (data.content && data.content.trim()) {
            contentDiv.innerHTML = data.content;
        }
        
        setTimeout(() => {
            initAccordions();
            initDetailsHandlers();
        }, 100);
        
    } catch (error) {
        console.error(`Failed to load content for ${page}/${section}:`, error);
    }
}

async function loadAllContent() {
    const path = window.location.pathname;
    let page = '';
    
    if (path.includes('snus.html') || path.includes('/snus')) page = 'snus';
    else if (path.includes('cash.html') || path.includes('/cash')) page = 'cash';
    else if (path.includes('checks.html') || path.includes('/checks')) page = 'checks';
    else if (path.includes('hookah.html') || path.includes('/hookah')) page = 'hookah';
    else if (path.includes('sales.html') || path.includes('/sales')) page = 'sales';
    else if (path.includes('training.html') || path.includes('/training')) page = 'training';
    else if (path.includes('disposables.html') || path.includes('/disposables')) page = 'disposables';
    else if (path.includes('tobacco.html') || path.includes('/tobacco')) page = 'tobacco';
    else if (path.includes('liquids.html') || path.includes('/liquids')) page = 'liquids';
    else return;
    
    const contentDivs = document.querySelectorAll('[id$="-content"]');
    const sections = [];
    
    contentDivs.forEach(div => {
        const section = div.id.replace('-content', '');
        sections.push(section);
    });
    
    for (const section of sections) {
        await loadContent(page, section);
    }
    
    console.log(`Loaded content for ${sections.length} sections on ${page}`);
}

function initDetailsHandlers() {
    const details = document.querySelectorAll('details');
    details.forEach(detail => {
        const summary = detail.querySelector('summary');
        if (summary && !detail.hasAttribute('data-handler-initialized')) {
            summary.addEventListener('click', function(e) {
                e.preventDefault();
                detail.open = !detail.open;
            });
            detail.setAttribute('data-handler-initialized', 'true');
            summary.style.cursor = 'pointer';
        }
    });
}

async function loadUserInfo() {
    try {
        console.log('Checking auth...');
        const response = await fetch('/api/check-auth', { 
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();

        if (data.authenticated) {
            const isRop = (data.user.role === 'rop' || data.user.role === 'root');

            window.isRop = isRop;
            window.isRopGlobal = isRop;
            window._authLoaded = true;
            window._currentUser = data.user;
            
            console.log('✅ User authenticated:', data.user.full_name, 'ROP:', isRop);

            const userNameSpan = document.getElementById('userName');
            const ropBtn = document.getElementById('ropBtn');
            if (userNameSpan) userNameSpan.textContent = data.user.full_name;
            if (ropBtn) ropBtn.style.display = isRop ? 'block' : 'none';
            if (ropBtn) ropBtn.textContent = '⚙️ Администрирование';

            const addManufBtn = document.getElementById('btnAddManufacturer');
            if (addManufBtn) {
                addManufBtn.style.display = isRop ? 'flex' : 'none';
            }

            document.querySelectorAll('.btn-add:not(#btnAddManufacturer)').forEach(btn => {
                btn.style.display = isRop ? 'flex' : 'none';
            });

            document.querySelectorAll('.btn-edit-content').forEach(btn => {
                btn.style.display = isRop ? 'inline-flex' : 'none';
            });

            window.dispatchEvent(new CustomEvent('authReady', {
                detail: { isRop, user: data.user }
            }));

            if (typeof window.onAuthReady === 'function') {
                window.onAuthReady(isRop, data.user);
            }

            if (typeof window.loadManufacturers === 'function') {
                window.loadManufacturers();
            }
            
            await loadAllContent();
            
            setTimeout(function() {
                if (typeof window.setupEditButtons === 'function') {
                    window.setupEditButtons(isRop);
                }
                initAccordions();
                initDetailsHandlers();
            }, 200);

        } else {
            console.log('❌ Not authenticated, redirecting to login...');
            // Сохраняем текущий URL для возврата после входа
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Auth error:', error);
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login';
    }
}

window.refreshEditButtons = function() {
    const isRop = window.isRopGlobal === true;
    document.querySelectorAll('.btn-edit-content').forEach(btn => {
        btn.style.display = isRop ? 'inline-flex' : 'none';
    });
    const addManufBtn = document.getElementById('btnAddManufacturer');
    if (addManufBtn) {
        addManufBtn.style.display = isRop ? 'flex' : 'none';
    }
    if (typeof window.setupEditButtons === 'function') {
        window.setupEditButtons(isRop);
    }
};
window.setupEditButtons = window.refreshEditButtons;

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
}

function setupRopPanel() {
    const ropBtn = document.getElementById('ropBtn');
    if (ropBtn) {
        ropBtn.removeEventListener('click', handleRopPanel);
        ropBtn.addEventListener('click', handleRopPanel);
    }
}

async function handleRopPanel() {
    await openRopPanel();
}

async function openRopPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 720px; height: 85vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-title">⚙️ Администрирование</span>
                <button class="modal-close">✕</button>
            </div>
            <div style="display: flex; gap: 6px; padding: 0 20px 0; border-bottom: 1px solid var(--border); flex-shrink: 0;">
                <button class="admin-tab active" data-panel="users">👥 Пользователи</button>
                <button class="admin-tab" data-panel="schedule">📅 Графики</button>
                <button class="admin-tab" data-panel="points">📍 Точки</button>
            </div>
            <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 20px;">
                <!-- Users panel -->
                <div id="adminPanel-users" class="admin-panel">
                    <div class="field" style="margin-bottom: 16px;">
                        <label style="font-size: 12px; color: var(--muted); margin-bottom: 8px; display: block;">➕ Новый пользователь</label>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <input type="text" id="newUsername" placeholder="Логин" style="flex:1; min-width: 100px;">
                            <input type="text" id="newPassword" placeholder="Пароль (4 цифры)" maxlength="4" style="width: 130px">
                            <input type="text" id="newFullName" placeholder="ФИО" style="flex:1; min-width: 140px">
                            <button id="addUserBtn" class="btn-add" style="flex-shrink:0;">Добавить</button>
                        </div>
                    </div>
                    <div id="usersList" style="max-height: 400px; overflow-y: auto;"></div>
                </div>
                <!-- Schedule panel -->
                <div id="adminPanel-schedule" class="admin-panel" style="display: none;">
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end;">
                        <div>
                            <label style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;">Сотрудник</label>
                            <select id="schedEmployee" style="min-width: 180px;"></select>
                        </div>
                        <div>
                            <label style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;">Сменщик</label>
                            <select id="schedPartner" style="min-width: 180px;"></select>
                        </div>
                        <div>
                            <label style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;">Месяц</label>
                            <input type="month" id="schedMonth" style="width: 150px;">
                        </div>
                        <button id="loadScheduleBtn" class="btn-add">Загрузить</button>
                    </div>
                    <div id="schedEditorArea" style="display: none;">
                        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                            <button id="schedAllWork" style="background: rgba(60,255,160,0.15); border: 1px solid rgba(60,255,160,0.3); color: var(--accent3); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;">✓ Все рабочие</button>
                            <button id="schedAllOff" style="background: var(--surface2); border: 1px solid var(--border); color: var(--muted); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;">✗ Все выходные</button>
                            <button id="schedAutoSun" style="background: rgba(124,92,252,0.15); border: 1px solid rgba(124,92,252,0.3); color: var(--accent); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;">🔄 Чередование</button>
                        </div>
                        <div id="schedCalendar" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 16px;"></div>
                        <div style="text-align: right;">
                            <button id="saveScheduleBtn" class="btn-add" style="background: var(--accent); color: #000; font-weight: 700; padding: 10px 28px;">💾 Сохранить</button>
                        </div>
                    </div>
                </div>
                <!-- Points panel -->
                <div id="adminPanel-points" class="admin-panel" style="display: none;">
                    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                        <input type="text" id="newPointName" placeholder="Название точки" style="flex: 1; min-width: 140px;">
                        <input type="text" id="newPointAddress" placeholder="Адрес" style="flex: 1; min-width: 160px;">
                        <button id="addPointBtn" class="btn-add">Добавить точку</button>
                    </div>
                    <div id="pointsList"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Закрыть</button>
            </div>
        </div>
    `;
    // Tab styles
    const style = document.createElement('style');
    style.textContent = `
        .admin-tab { background: none; border: none; color: var(--muted); padding: 10px 16px; cursor: pointer; font-size: 12px; font-weight: 600; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
        .admin-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .sched-day { aspect-ratio: 1; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; transition: all 0.15s; user-select: none; min-height: 40px; }
        .sched-day.empty { background: transparent; cursor: default; }
        .sched-day.work { background: rgba(60,255,160,0.2); border: 1px solid rgba(60,255,160,0.4); color: var(--accent3); }
        .sched-day.off { background: var(--surface2); border: 1px solid var(--border); color: var(--muted); }
        .sched-day.sun { outline: 1px solid rgba(124,92,252,0.5); }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    const closeModal = () => { modal.classList.remove('open'); setTimeout(() => { modal.remove(); style.remove(); }, 300); };
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);

    // Tab switching
    modal.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(`adminPanel-${tab.dataset.panel}`).style.display = 'block';
        });
    });

    // ---- USERS ----
    await loadUsersList(modal);
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const full_name = document.getElementById('newFullName').value.trim();
        if (!username || !password || !full_name) { alert('Заполните все поля'); return; }
        if (!/^\d{4}$/.test(password)) { alert('Пароль должен быть 4 цифры'); return; }
        const response = await fetch('/api/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ username, password, full_name, role: 'user' })
        });
        if (response.ok) {
            alert('Пользователь добавлен');
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newFullName').value = '';
            await loadUsersList(modal);
        } else { const err = await response.json(); alert(err.error); }
    });

    // ---- SCHEDULE ----
    const schedMonth = document.getElementById('schedMonth');
    const now = new Date();
    schedMonth.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    let schedDays = [];
    let schedDaysInMonth = 0;

    async function loadUsersForSched() {
        const res = await fetch('/api/users-full', { credentials: 'include' });
        const users = await res.json();
        const emp = document.getElementById('schedEmployee');
        const part = document.getElementById('schedPartner');
        emp.innerHTML = '<option value="">— Выберите —</option>';
        part.innerHTML = '<option value="">— Нет сменщика —</option>';
        users.forEach(u => {
            emp.innerHTML += `<option value="${u.id}">${u.full_name}${u.point_name ? ' (' + u.point_name + ')' : ''}</option>`;
            part.innerHTML += `<option value="${u.id}">${u.full_name}</option>`;
        });
    }
    await loadUsersForSched();

    function renderSchedCalendar() {
        const [year, month] = schedMonth.value.split('-').map(Number);
        schedDaysInMonth = new Date(year, month, 0).getDate();
        const firstDay = new Date(year, month - 1, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        if (schedDays.length !== schedDaysInMonth) schedDays = Array(schedDaysInMonth).fill('off');

        const cal = document.getElementById('schedCalendar');
        const HEADS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
        cal.innerHTML = HEADS.map(h => `<div style="font-size:10px;color:var(--muted);text-align:center;padding:4px 0;">${h}</div>`).join('');
        for (let i = 0; i < offset; i++) cal.innerHTML += `<div class="sched-day empty"></div>`;
        for (let d = 1; d <= schedDaysInMonth; d++) {
            const weekday = new Date(year, month - 1, d).getDay();
            const isSun = weekday === 0;
            const type = schedDays[d - 1];
            const el = document.createElement('div');
            el.className = `sched-day ${type}${isSun ? ' sun' : ''}`;
            el.innerHTML = `<span>${d}</span><span style="font-size:9px;">${isSun && type==='work' ? '🧹' : (type==='work' ? '✓' : '')}</span>`;
            el.title = isSun && type==='work' ? 'Рабочий + уборка' : (type==='work' ? 'Рабочий день' : 'Выходной');
            el.addEventListener('click', () => {
                schedDays[d - 1] = schedDays[d - 1] === 'work' ? 'off' : 'work';
                renderSchedCalendar();
            });
            cal.appendChild(el);
        }
    }

    document.getElementById('loadScheduleBtn').addEventListener('click', async () => {
        const userId = document.getElementById('schedEmployee').value;
        if (!userId) { alert('Выберите сотрудника'); return; }
        const [year, month] = schedMonth.value.split('-').map(Number);
        const res = await fetch(`/api/schedule/${userId}/${year}/${month}`, { credentials: 'include' });
        const sched = await res.json();
        const daysInMonth = new Date(year, month, 0).getDate();
        if (sched && sched.days && sched.days.length) {
            schedDays = sched.days;
            // Set partner
            if (sched.partner_id) document.getElementById('schedPartner').value = sched.partner_id;
        } else {
            schedDays = Array(daysInMonth).fill('off');
        }
        document.getElementById('schedEditorArea').style.display = 'block';
        renderSchedCalendar();
    });

    document.getElementById('schedAllWork').addEventListener('click', () => {
        schedDays = Array(schedDaysInMonth).fill('work');
        renderSchedCalendar();
    });
    document.getElementById('schedAllOff').addEventListener('click', () => {
        schedDays = Array(schedDaysInMonth).fill('off');
        renderSchedCalendar();
    });
    document.getElementById('schedAutoSun').addEventListener('click', () => {
        // Auto: every other day starting Mon
        const [year, month] = schedMonth.value.split('-').map(Number);
        schedDays = [];
        for (let d = 1; d <= schedDaysInMonth; d++) {
            schedDays.push(d % 2 === 1 ? 'work' : 'off');
        }
        renderSchedCalendar();
    });

    document.getElementById('saveScheduleBtn').addEventListener('click', async () => {
        const userId = document.getElementById('schedEmployee').value;
        const partnerId = document.getElementById('schedPartner').value;
        if (!userId) { alert('Выберите сотрудника'); return; }
        const [year, month] = schedMonth.value.split('-').map(Number);
        const res = await fetch('/api/schedule', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ user_id: userId, partner_id: partnerId || null, year, month, days: schedDays })
        });
        if (res.ok) alert('График сохранён!');
        else alert('Ошибка сохранения');
    });

    // ---- POINTS ----
    async function loadPoints() {
        const res = await fetch('/api/points', { credentials: 'include' });
        const points = await res.json();
        const users = (await (await fetch('/api/users-full', { credentials: 'include' })).json());
        const list = document.getElementById('pointsList');
        list.innerHTML = points.map(p => {
            const pointUsers = users.filter(u => u.point_id === p.id);
            return `
                <div style="background: var(--surface2); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--strong); margin-bottom: 4px;">📍 ${escapeHtml(p.name)}</div>
                        <div style="font-size: 12px; color: var(--muted);">${escapeHtml(p.address || 'Адрес не указан')}</div>
                        ${pointUsers.length ? `<div style="font-size: 11px; color: var(--accent3); margin-top: 6px;">👥 ${pointUsers.map(u => escapeHtml(u.full_name)).join(', ')}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0;">
                        <button onclick="window.editPoint(${p.id}, '${escapeHtml(p.name)}', '${escapeHtml(p.address || '')}')" class="btn-edit" style="padding: 4px 10px; font-size: 11px;">✏️</button>
                        <button onclick="window.deletePoint(${p.id})" class="btn-delete" style="padding: 4px 10px; font-size: 11px;">🗑</button>
                    </div>
                </div>
            `;
        }).join('') || '<div style="color: var(--muted); font-size: 13px;">Точки не добавлены</div>';
    }
    await loadPoints();

    document.getElementById('addPointBtn').addEventListener('click', async () => {
        const name = document.getElementById('newPointName').value.trim();
        const address = document.getElementById('newPointAddress').value.trim();
        if (!name) { alert('Введите название'); return; }
        await fetch('/api/points', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ name, address })
        });
        document.getElementById('newPointName').value = '';
        document.getElementById('newPointAddress').value = '';
        await loadPoints();
    });

    window.deletePoint = async (id) => {
        if (!confirm('Удалить точку?')) return;
        await fetch(`/api/points/${id}`, { method: 'DELETE', credentials: 'include' });
        await loadPoints();
    };
    window.editPoint = async (id, name, address) => {
        const newName = prompt('Название точки:', name);
        if (!newName) return;
        const newAddr = prompt('Адрес:', address);
        await fetch(`/api/points/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ name: newName, address: newAddr || '' })
        });
        await loadPoints();
    };
}

async function loadUsersList(modal) {
    const response = await fetch('/api/users-full', { credentials: 'include' });
    const users = await response.json();
    const meResponse = await fetch('/api/check-auth', { credentials: 'include' });
    const me = await meResponse.json();
    const pointsRes = await fetch('/api/points', { credentials: 'include' });
    const points = await pointsRes.json();
    const container = modal.querySelector('#usersList');
    if (!container) return;
    container.innerHTML = users.map(user => {
        let canChange = false;
        if (me.user.role === 'root') canChange = true;
        else if (me.user.role === 'rop' && user.role === 'user') canChange = true;
        let canDelete = false;
        if (me.user.role === 'root' && user.username !== 'root' && user.id !== me.user.id) canDelete = true;
        const roleLabel = user.role === 'root' ? 'ROOT' : (user.role === 'rop' ? 'РОП' : 'Сотрудник');
        const pointOpts = points.map(p => `<option value="${p.id}" ${user.point_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
        return `
            <div style="background: var(--surface2); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: ${canChange ? '10px' : '0'};">
                    <div>
                        <strong>${escapeHtml(user.full_name)}</strong><br>
                        <span style="font-size: 11px; color: var(--muted);">${user.username} · ${roleLabel}${user.position ? ' · ' + escapeHtml(user.position) : ''}${user.point_name ? ' · ' + escapeHtml(user.point_name) : ''}</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        ${canChange ? `<button onclick="window.changePasswordUser(${user.id}, '${escapeHtml(user.full_name)}')" class="btn-edit" style="padding: 4px 12px;">🔑 Пароль</button>` : ''}
                        ${canDelete ? `<button onclick="window.deleteUserById(${user.id})" class="btn-delete" style="padding: 4px 12px;">🗑</button>` : ''}
                    </div>
                </div>
                ${canChange ? `
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <input type="text" placeholder="Должность" value="${escapeHtml(user.position || '')}" id="pos-${user.id}" style="flex:1; min-width: 120px; font-size: 12px; padding: 5px 10px;">
                    <select id="point-${user.id}" style="flex:1; min-width: 120px; font-size: 12px; padding: 5px 8px;">
                        <option value="">— Точка —</option>${pointOpts}
                    </select>
                    <button onclick="window.saveUserProfile(${user.id})" class="btn-add" style="padding: 5px 12px; font-size: 11px;">💾</button>
                </div>` : ''}
            </div>
        `;
    }).join('');
}

window.changePasswordUser = async function(userId, userName) {
    const newPassword = prompt(`Введите новый пароль (4 цифры) для ${userName}`);
    if (!newPassword) return;
    if (!/^\d{4}$/.test(newPassword)) { alert('Пароль должен быть 4 цифры'); return; }
    const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
    });
    if (response.ok) alert('Пароль успешно изменен');
    else alert('Ошибка');
};

window.deleteUserById = async function(userId) {
    if (confirm('Удалить пользователя?')) {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) { alert('Пользователь удален'); location.reload(); }
        else alert('Ошибка');
    }
};

window.saveUserProfile = async function(userId) {
    const posEl = document.getElementById(`pos-${userId}`);
    const pointEl = document.getElementById(`point-${userId}`);
    if (!posEl) return;
    const position = posEl.value.trim();
    const point_id = pointEl ? (pointEl.value || null) : null;
    const res = await fetch(`/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ position, point_id })
    });
    if (res.ok) {
        posEl.style.borderColor = 'var(--accent3)';
        setTimeout(() => posEl.style.borderColor = '', 1500);
    } else {
        alert('Ошибка сохранения');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

window.openRopPanel = openRopPanel;
window.initTabs = initTabs;
window.initAccordions = initAccordions;
window.loadUserInfo = loadUserInfo;
window.loadAllContent = loadAllContent;
window.loadContent = loadContent;
window.initDetailsHandlers = initDetailsHandlers;

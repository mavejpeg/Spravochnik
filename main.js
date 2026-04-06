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
        <div class="modal" style="max-width: 1400px; width: 95%; height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
            <div class="modal-header">
                <span class="modal-title">⚙️ Администрирование</span>
                <button class="modal-close">✕</button>
            </div>
            <div style="display: flex; gap: 0; padding: 0 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; overflow-x: auto;">
                <button class="admin-tab active" data-panel="users">👥 Пользователи</button>
                <button class="admin-tab" data-panel="schedule">📅 Графики</button>
                <button class="admin-tab" data-panel="points">📍 Точки</button>
                <button class="admin-tab" data-panel="quizzes">📋 Опросники</button>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 20px 24px;">
                <div id="adminPanel-users" class="admin-panel"></div>
                <div id="adminPanel-schedule" class="admin-panel" style="display:none;"></div>
                <div id="adminPanel-points" class="admin-panel" style="display:none;"></div>
                <div id="adminPanel-quizzes" class="admin-panel" style="display:none;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);

    const closeModal = () => { 
        modal.classList.remove('open'); 
        setTimeout(() => modal.remove(), 300); 
    };
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Tab switching
    modal.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(`adminPanel-${tab.dataset.panel}`).style.display = 'block');
            
            // Перезагружаем данные при переключении вкладки
            if (tab.dataset.panel === 'schedule') {
                if (typeof initScheduleEditor === 'function') {
                    initScheduleEditor();
                }
            } else if (tab.dataset.panel === 'quizzes') {
                if (typeof loadQuizzesAdmin === 'function') {
                    loadQuizzesAdmin();
                }
            }
        });
    });

    await renderUsersPanel();
    renderSchedulePanel();
    await renderPointsPanel();
    renderQuizzesPanel();
}

// ===================== USERS PANEL =====================
async function renderUsersPanel() {
    const panel = document.getElementById('adminPanel-users');
    panel.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div class="admin-panel-label">➕ Новый пользователь</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <input class="admin-panel-input" type="text" id="newUsername" placeholder="Логин" style="flex:1; min-width:90px;">
                <input class="admin-panel-input" type="text" id="newPassword" placeholder="Пароль (4 цифры)" maxlength="4" style="width:130px;">
                <input class="admin-panel-input" type="text" id="newFullName" placeholder="ФИО" style="flex:1; min-width:130px;">
                <button id="addUserBtn" class="btn-add">Добавить</button>
            </div>
        </div>
        <div class="admin-panel-label">📋 Сотрудники</div>
        <div id="usersList"></div>
    `;
    await loadUsersList();
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const full_name = document.getElementById('newFullName').value.trim();
        if (!username || !password || !full_name) { alert('Заполните все поля'); return; }
        if (!/^\d{4}$/.test(password)) { alert('Пароль — 4 цифры'); return; }
        const r = await fetch('/api/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ username, password, full_name, role: 'user' })
        });
        if (r.ok) {
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newFullName').value = '';
            await loadUsersList();
        } else { const e = await r.json(); alert(e.error); }
    });
}

async function loadUsersList() {
    const [usersRes, meRes, pointsRes] = await Promise.all([
        fetch('/api/users-full', { credentials: 'include' }),
        fetch('/api/check-auth', { credentials: 'include' }),
        fetch('/api/points', { credentials: 'include' })
    ]);
    const users = await usersRes.json();
    const me = (await meRes.json()).user;
    const points = await pointsRes.json();
    const container = document.getElementById('usersList');
    if (!container) return;

    container.innerHTML = users.map(user => {
        const canChange = me.role === 'root' || (me.role === 'rop' && user.role === 'user');
        const canDelete = me.role === 'root' && user.username !== 'root' && user.id !== me.id;
        const roleLabel = user.role === 'root' ? 'ROOT' : user.role === 'rop' ? 'РОП' : 'Сотрудник';
        const pointOpts = points.map(p =>
            `<option value="${p.id}" ${user.point_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
        ).join('');
        return `
        <div class="admin-user-row">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; ${canChange ? 'margin-bottom:10px;' : ''}">
                <div>
                    <div style="font-weight:600; color:var(--strong); font-size:14px;">${escapeHtml(user.full_name)}</div>
                    <div style="font-size:11px; color:var(--muted); margin-top:2px;">${user.username} · ${roleLabel}${user.position ? ' · ' + escapeHtml(user.position) : ''}${user.point_name ? ' · ' + escapeHtml(user.point_name) : ''}</div>
                </div>
                <div style="display:flex; gap:6px;">
                    ${canChange ? `<button onclick="window.changePasswordUser(${user.id},'${escapeHtml(user.full_name)}')" class="btn-edit" style="padding:5px 12px; font-size:12px;">🔑 Пароль</button>` : ''}
                    ${canDelete ? `<button onclick="window.deleteUserById(${user.id})" class="btn-delete" style="padding:5px 12px; font-size:12px;">🗑</button>` : ''}
                </div>
            </div>
            ${canChange ? `
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <input class="admin-panel-input" type="text" placeholder="Должность" value="${escapeHtml(user.position || '')}" id="pos-${user.id}" style="flex:1; min-width:120px;">
                <select class="admin-panel-select" id="point-${user.id}" style="flex:1; min-width:130px;">
                    <option value="">— Точка —</option>${pointOpts}
                </select>
                <button onclick="window.saveUserProfile(${user.id})" class="btn-add" style="padding:8px 14px; font-size:12px;">💾 Сохранить</button>
            </div>` : ''}
        </div>`;
    }).join('');
}

window.changePasswordUser = async function(userId, userName) {
    const newPassword = prompt(`Новый пароль (4 цифры) для ${userName}:`);
    if (!newPassword) return;
    if (!/^\d{4}$/.test(newPassword)) { alert('Пароль — 4 цифры'); return; }
    const r = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ newPassword })
    });
    if (r.ok) alert('Пароль изменён');
    else alert('Ошибка');
};

window.deleteUserById = async function(userId) {
    if (!confirm('Удалить пользователя?')) return;
    const r = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { await loadUsersList(); }
    else alert('Ошибка');
};

window.saveUserProfile = async function(userId) {
    const posEl = document.getElementById(`pos-${userId}`);
    const pointEl = document.getElementById(`point-${userId}`);
    if (!posEl) return;
    const r = await fetch(`/api/profile/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ position: posEl.value.trim(), point_id: pointEl?.value || null })
    });
    if (r.ok) {
        posEl.style.borderColor = 'var(--accent3)';
        if (pointEl) pointEl.style.borderColor = 'var(--accent3)';
        setTimeout(() => { posEl.style.borderColor = ''; if (pointEl) pointEl.style.borderColor = ''; }, 1500);
        await loadUsersList();
    } else alert('Ошибка сохранения');
};

// ===================== SCHEDULE PANEL =====================
function renderSchedulePanel() {
    const panel = document.getElementById('adminPanel-schedule');
    panel.innerHTML = `
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; align-items:flex-end;">
            <div style="flex:1; min-width:160px;">
                <label class="admin-panel-label">Сотрудник</label>
                <select class="admin-panel-select" id="schedEmployee" style="width:100%;"></select>
            </div>
            <div style="flex:1; min-width:160px;">
                <label class="admin-panel-label">Сменщик</label>
                <select class="admin-panel-select" id="schedPartner" style="width:100%;"></select>
            </div>
            <div>
                <label class="admin-panel-label">Месяц</label>
                <input class="admin-panel-input" type="month" id="schedMonth" style="width:160px;">
            </div>
            <button id="loadScheduleBtn" class="btn-add">Загрузить</button>
        </div>
        <div id="schedHint" style="color:var(--muted); font-size:13px; text-align:center; padding:24px 0;">Выберите сотрудника и месяц</div>
        <div id="schedEditorArea" style="display:none;">
            <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; align-items:center;">
                <button id="schedAllWork" class="sched-btn green">✓ Все рабочие</button>
                <button id="schedAllOff" class="sched-btn red">✗ Все выходные</button>
                <button id="schedAlternate" class="sched-btn purple">🔄 Чередование 3/3</button>
                <div style="margin-left:auto; font-size:11px; color:var(--muted); line-height:1.4;">Чередование: вручную выдели первые 3 рабочих дня,<br>затем нажми кнопку</div>
            </div>
            <div class="sched-cal-grid" id="schedCalGrid"></div>
            <div class="sched-legend" style="margin-top:14px;">
                <span><span class="sched-legend-dot" style="background:rgba(60,255,160,0.4); border:1px solid rgba(60,255,160,0.5);"></span>Рабочий</span>
                <span><span class="sched-legend-dot" style="background:var(--surface2); border:1px solid var(--border);"></span>Выходной</span>
                <span><span class="sched-legend-dot" style="background:rgba(60,255,160,0.18); border:1px solid rgba(124,92,252,0.5);"></span>Рабочий (вс = уборка)</span>
                <span><span class="sched-legend-dot" style="border:1px solid rgba(60,186,252,0.4); background:transparent;"></span>● Сменщик работает</span>
            </div>
            <div style="margin-top:16px; text-align:right;">
                <button id="saveScheduleBtn" class="sched-btn primary">💾 Сохранить график</button>
            </div>
        </div>
    `;

    // Set current month
    const now = new Date();
    document.getElementById('schedMonth').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    let schedDays = [];       // 'work'|'off' for employee
    let partnerDays = [];     // 'work'|'off' for partner (read-only, display only)
    let daysInMonth = 0;

    // Load users into selects
    fetch('/api/users-full', { credentials: 'include' }).then(r => r.json()).then(users => {
        const emp = document.getElementById('schedEmployee');
        const part = document.getElementById('schedPartner');
        if (!emp) return;
        emp.innerHTML = '<option value="">— Выберите сотрудника —</option>';
        part.innerHTML = '<option value="">— Нет сменщика —</option>';
        users.forEach(u => {
            const label = `${escapeHtml(u.full_name)}${u.point_name ? ' (' + u.point_name + ')' : ''}`;
            emp.innerHTML += `<option value="${u.id}">${label}</option>`;
            part.innerHTML += `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`;
        });
    });

    function renderSchedGrid() {
        const [year, month] = document.getElementById('schedMonth').value.split('-').map(Number);
        daysInMonth = new Date(year, month, 0).getDate();
        const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
        const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;

        const grid = document.getElementById('schedCalGrid');
        if (!grid) return;

        const HEADS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
        grid.innerHTML = HEADS.map(h => `<div class="sched-cal-head">${h}</div>`).join('');

        // Empty offset cells
        for (let i = 0; i < offset; i++) grid.innerHTML += `<div class="sched-day empty"></div>`;

        for (let d = 1; d <= daysInMonth; d++) {
            const type = schedDays[d - 1] || 'off';
            const weekday = new Date(year, month - 1, d).getDay(); // 0=Sun
            const isSun = weekday === 0;
            const partnerWorking = partnerDays[d - 1] === 'work';

            let cls = 'sched-day';
            if (isSun) cls += type === 'work' ? ' sun-work' : ' sun-off';
            else cls += type === 'work' ? ' work' : ' off';
            if (partnerWorking) cls += ' partner-work';

            const icon = isSun && type === 'work' ? '🧹' : (type === 'work' ? '✓' : '');
            const el = document.createElement('div');
            el.className = cls;
            el.dataset.day = d;
            el.innerHTML = `<span class="sched-day-num">${d}</span><span class="sched-day-icon">${icon}</span>`;
            el.title = buildDayTitle(type, isSun, partnerWorking);
            el.addEventListener('click', () => {
                schedDays[d - 1] = schedDays[d - 1] === 'work' ? 'off' : 'work';
                renderSchedGrid();
            });
            grid.appendChild(el);
        }
    }

    function buildDayTitle(type, isSun, partnerWorking) {
        let t = type === 'work' ? (isSun ? 'Рабочий + уборка' : 'Рабочий день') : 'Выходной';
        if (partnerWorking) t += ' | Сменщик работает';
        return t;
    }

    document.getElementById('loadScheduleBtn').addEventListener('click', async () => {
        const userId = document.getElementById('schedEmployee').value;
        const partnerId = document.getElementById('schedPartner').value;
        if (!userId) { alert('Выберите сотрудника'); return; }
        const [year, month] = document.getElementById('schedMonth').value.split('-').map(Number);
        const dim = new Date(year, month, 0).getDate();

        // Load employee schedule
        const res = await fetch(`/api/schedule/${userId}/${year}/${month}`, { credentials: 'include' });
        const sched = await res.json();
        schedDays = sched?.days?.length === dim ? [...sched.days] : Array(dim).fill('off');

        // Auto-fill partner from saved schedule if not manually selected
        const savedPartnerId = sched?.partner_id;
        const partSelect = document.getElementById('schedPartner');
        if (savedPartnerId && !partnerId) partSelect.value = savedPartnerId;

        // Load partner schedule
        const effectivePartnerId = partSelect.value;
        if (effectivePartnerId) {
            const pRes = await fetch(`/api/schedule/${effectivePartnerId}/${year}/${month}`, { credentials: 'include' });
            const pSched = await pRes.json();
            partnerDays = pSched?.days?.length === dim ? [...pSched.days] : Array(dim).fill('off');
        } else {
            partnerDays = Array(dim).fill('off');
        }

        document.getElementById('schedHint').style.display = 'none';
        document.getElementById('schedEditorArea').style.display = 'block';
        renderSchedGrid();
    });

    // Re-load partner days when partner changes
    document.getElementById('adminPanel-schedule').addEventListener('change', async (e) => {
        if (e.target.id !== 'schedPartner') return;
        const partnerId = e.target.value;
        if (!partnerId || !daysInMonth) { partnerDays = Array(Math.max(daysInMonth,31)).fill('off'); renderSchedGrid(); return; }
        const [year, month] = document.getElementById('schedMonth').value.split('-').map(Number);
        const pRes = await fetch(`/api/schedule/${partnerId}/${year}/${month}`, { credentials: 'include' });
        const pSched = await pRes.json();
        const dim = new Date(year, month, 0).getDate();
        partnerDays = pSched?.days?.length === dim ? [...pSched.days] : Array(dim).fill('off');
        renderSchedGrid();
    });

    document.getElementById('schedAllWork').addEventListener('click', () => {
        if (!daysInMonth) return;
        schedDays = Array(daysInMonth).fill('work');
        renderSchedGrid();
    });

    document.getElementById('schedAllOff').addEventListener('click', () => {
        if (!daysInMonth) return;
        schedDays = Array(daysInMonth).fill('off');
        renderSchedGrid();
    });

    document.getElementById('schedAlternate').addEventListener('click', () => {
        if (!daysInMonth) { alert('Сначала загрузите сотрудника'); return; }
        // Find first 3 manually selected work days — these become the "work block"
        const workIndices = [];
        for (let i = 0; i < daysInMonth; i++) {
            if (schedDays[i] === 'work') workIndices.push(i);
            if (workIndices.length === 3) break;
        }
        if (workIndices.length < 3) {
            alert('Выделите вручную первые 3 рабочих дня (смену), затем нажмите «Чередование»');
            return;
        }
        // Determine the start of the pattern: day index of the first work day
        const startIdx = workIndices[0];
        // Fill from startIdx: 3 work, 3 off, 3 work, 3 off...
        const newDays = [...schedDays];
        let pos = startIdx;
        let toggle = true; // start with work
        while (pos < daysInMonth) {
            for (let k = 0; k < 3 && pos < daysInMonth; k++, pos++) {
                newDays[pos] = toggle ? 'work' : 'off';
            }
            toggle = !toggle;
        }
        schedDays = newDays;
        renderSchedGrid();
    });

    document.getElementById('saveScheduleBtn').addEventListener('click', async () => {
        const userId = document.getElementById('schedEmployee').value;
        const partnerId = document.getElementById('schedPartner').value;
        if (!userId) { alert('Выберите сотрудника'); return; }
        const [year, month] = document.getElementById('schedMonth').value.split('-').map(Number);
        const r = await fetch('/api/schedule', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ user_id: userId, partner_id: partnerId || null, year, month, days: schedDays })
        });
        if (r.ok) {
            const btn = document.getElementById('saveScheduleBtn');
            const orig = btn.textContent;
            btn.textContent = '✅ Сохранено!';
            setTimeout(() => btn.textContent = orig, 2000);
        } else alert('Ошибка сохранения');
    });
}

// ===================== POINTS PANEL =====================
async function renderPointsPanel() {
    const panel = document.getElementById('adminPanel-points');
    panel.innerHTML = `
        <div style="margin-bottom:20px;">
            <div class="admin-panel-label">➕ Новая точка</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <input class="admin-panel-input" type="text" id="newPointName" placeholder="Название точки" style="flex:1; min-width:140px;">
                <input class="admin-panel-input" type="text" id="newPointAddress" placeholder="Адрес" style="flex:1; min-width:160px;">
                <button id="addPointBtn" class="btn-add">Добавить</button>
            </div>
        </div>
        <div class="admin-panel-label">📍 Список точек</div>
        <div id="pointsList"></div>
    `;
    await loadPointsList();

    document.getElementById('addPointBtn').addEventListener('click', async () => {
        const name = document.getElementById('newPointName').value.trim();
        const address = document.getElementById('newPointAddress').value.trim();
        if (!name) { alert('Введите название точки'); return; }
        await fetch('/api/points', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ name, address })
        });
        document.getElementById('newPointName').value = '';
        document.getElementById('newPointAddress').value = '';
        await loadPointsList();
    });
}

async function loadPointsList() {
    const [pointsRes, usersRes] = await Promise.all([
        fetch('/api/points', { credentials: 'include' }),
        fetch('/api/users-full', { credentials: 'include' })
    ]);
    const points = await pointsRes.json();
    const users = await usersRes.json();
    const list = document.getElementById('pointsList');
    if (!list) return;

    if (!points.length) { list.innerHTML = '<div style="color:var(--muted); font-size:13px; padding:8px 0;">Точки не добавлены</div>'; return; }

    list.innerHTML = points.map(p => {
        const assigned = users.filter(u => u.point_id === p.id);
        return `
        <div class="admin-point-row" id="point-row-${p.id}">
            <div style="flex:1;">
                <div id="point-view-${p.id}">
                    <div style="font-weight:600; color:var(--strong); font-size:14px;">📍 ${escapeHtml(p.name)}</div>
                    <div style="font-size:12px; color:var(--muted); margin-top:3px;">${escapeHtml(p.address || 'Адрес не указан')}</div>
                    ${assigned.length ? `<div style="font-size:11px; color:var(--accent3); margin-top:6px;">👥 ${assigned.map(u => escapeHtml(u.full_name)).join(', ')}</div>` : ''}
                </div>
                <div id="point-edit-${p.id}" style="display:none; margin-top:8px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <input class="admin-panel-input" type="text" id="point-name-${p.id}" value="${escapeHtml(p.name)}" placeholder="Название" style="flex:1; min-width:120px;">
                        <input class="admin-panel-input" type="text" id="point-addr-${p.id}" value="${escapeHtml(p.address || '')}" placeholder="Адрес" style="flex:1; min-width:140px;">
                    </div>
                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button onclick="window.savePoint(${p.id})" class="btn-add" style="padding:7px 14px; font-size:12px;">💾 Сохранить</button>
                        <button onclick="window.cancelEditPoint(${p.id})" class="btn-cancel" style="padding:7px 14px; font-size:12px;">Отмена</button>
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <button onclick="window.startEditPoint(${p.id})" class="btn-edit" style="padding:5px 12px; font-size:12px;">✏️</button>
                <button onclick="window.deletePoint(${p.id})" class="btn-delete" style="padding:5px 12px; font-size:12px;">🗑</button>
            </div>
        </div>`;
    }).join('');
}

window.startEditPoint = function(id) {
    document.getElementById(`point-view-${id}`).style.display = 'none';
    document.getElementById(`point-edit-${id}`).style.display = 'block';
};
window.cancelEditPoint = function(id) {
    document.getElementById(`point-view-${id}`).style.display = 'block';
    document.getElementById(`point-edit-${id}`).style.display = 'none';
};
window.savePoint = async function(id) {
    const name = document.getElementById(`point-name-${id}`).value.trim();
    const address = document.getElementById(`point-addr-${id}`).value.trim();
    if (!name) { alert('Введите название'); return; }
    const r = await fetch(`/api/points/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name, address })
    });
    if (r.ok) await loadPointsList();
    else alert('Ошибка сохранения');
};
window.deletePoint = async function(id) {
    if (!confirm('Удалить точку?')) return;
    const r = await fetch(`/api/points/${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) await loadPointsList();
    else alert('Ошибка');
};


function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

if (typeof window.openRopPanel !== 'function') {
    window.openRopPanel = openRopPanel;
}
console.log('main.js loaded, openRopPanel available:', typeof window.openRopPanel);

window.openRopPanel = openRopPanel;
window.initTabs = initTabs;
window.initAccordions = initAccordions;
window.loadUserInfo = loadUserInfo;
window.loadAllContent = loadAllContent;
window.loadContent = loadContent;
window.initDetailsHandlers = initDetailsHandlers;

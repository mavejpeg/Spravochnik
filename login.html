// main.js v7.0 - ИСПРАВЛЕНА КНОПКА АДМИНИСТРИРОВАНИЯ

window.isRop = false;
window.isRopGlobal = false;
window._authLoaded = false;
window._ropPanelOpen = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js v7.0 loaded');
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
        console.error('Failed to load content:', error);
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
    
    console.log('Loaded content for', sections.length, 'sections on', page);
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
            
            console.log('User authenticated:', data.user.full_name, 'ROP:', isRop);

            const userNameSpan = document.getElementById('userName');
            const ropBtn = document.getElementById('ropBtn');
            if (userNameSpan) userNameSpan.textContent = data.user.full_name;
            if (ropBtn) {
                ropBtn.style.display = isRop ? 'block' : 'none';
            }

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
            console.log('Not authenticated, redirecting to login...');
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
        console.log('Setting up ROP button listener');
        ropBtn.removeEventListener('click', handleRopPanel);
        ropBtn.addEventListener('click', handleRopPanel);
    }
}

async function handleRopPanel(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('ROP button clicked, opening panel...');
    
    if (window._ropPanelOpen) {
        console.log('Panel already open, ignoring');
        return;
    }
    
    await openRopPanel();
}

// ========== ГЛАВНАЯ ФУНКЦИЯ openRopPanel ==========
window.openRopPanel = async function() {
    if (window._ropPanelOpen) {
        console.log('Panel already open');
        return;
    }
    
    console.log('openRopPanel called');
    window._ropPanelOpen = true;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'ropPanelModal';
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
                <button class="admin-tab" data-panel="roles">👥 Роли</button>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 20px 24px;">
                <div id="adminPanel-users" class="admin-panel"></div>
                <div id="adminPanel-schedule" class="admin-panel" style="display:none;"></div>
                <div id="adminPanel-points" class="admin-panel" style="display:none;"></div>
                <div id="adminPanel-quizzes" class="admin-panel" style="display:none;"></div>
                <div id="adminPanel-roles" class="admin-panel" style="display:none;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);

    const closeModal = () => { 
        modal.classList.remove('open'); 
        setTimeout(() => {
            modal.remove();
            window._ropPanelOpen = false;
        }, 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Tab switching
    modal.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
            tab.classList.add('active');
            const panelId = `adminPanel-${tab.dataset.panel}`;
            const panel = document.getElementById(panelId);
            if (panel) panel.style.display = 'block';
            
            if (tab.dataset.panel === 'schedule') {
                setTimeout(() => {
                    if (typeof window.initScheduleEditor === 'function') {
                        window.initScheduleEditor();
                    }
                }, 100);
            } else if (tab.dataset.panel === 'quizzes') {
                setTimeout(() => {
                    if (typeof window.loadQuizzesAdmin === 'function') {
                        window.loadQuizzesAdmin();
                    }
                }, 100);
            } else if (tab.dataset.panel === 'roles') {
                setTimeout(() => {
                    if (typeof window.renderRolesPanel === 'function') {
                        window.renderRolesPanel();
                    }
                }, 100);
            }
        });
    });

    await renderUsersPanel();
    renderSchedulePanel();
    await renderPointsPanel();
    renderQuizzesPanel();
    renderRolesPanel();
};

// ===================== USERS PANEL =====================
async function renderUsersPanel() {
    const panel = document.getElementById('adminPanel-users');
    if (!panel) return;
    
    panel.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div class="admin-panel-label">➕ Новый пользователь</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <input class="admin-panel-input" type="text" id="newUsername" placeholder="Логин" style="flex:1; min-width:90px;">
                <input class="admin-panel-input" type="text" id="newPassword" placeholder="Пароль (4 цифры)" maxlength="4" style="width:130px;">
                <input class="admin-panel-input" type="text" id="newFullName" placeholder="ФИО" style="flex:1; min-width:130px;">
                <select id="newUserRole" class="admin-panel-select" style="width:120px;">
                    <option value="user">Сотрудник</option>
                    <option value="rop">РОП</option>
                </select>
                <button id="addUserBtn" class="btn-add">Добавить</button>
            </div>
        </div>
        <div class="admin-panel-label">📋 Сотрудники</div>
        <div id="usersList"></div>
    `;
    await loadUsersList();
    
    const addBtn = document.getElementById('addUserBtn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const username = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('newPassword').value;
            const full_name = document.getElementById('newFullName').value.trim();
            const role = document.getElementById('newUserRole').value;
            
            if (!username || !password || !full_name) { 
                alert('Заполните все поля');
                return; 
            }
            if (!/^\d{4}$/.test(password)) { 
                alert('Пароль — 4 цифры');
                return; 
            }
            
            const r = await fetch('/api/users', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                credentials: 'include',
                body: JSON.stringify({ username, password, full_name, role })
            });
            
            if (r.ok) {
                alert('Пользователь добавлен');
                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('newFullName').value = '';
                await loadUsersList();
            } else { 
                const e = await r.json(); 
                alert(e.error || 'Ошибка');
            }
        });
    }
}

async function loadUsersList() {
    try {
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

        if (!users.length) {
            container.innerHTML = '<div style="color:var(--muted); padding:20px;">Нет пользователей</div>';
            return;
        }

        container.innerHTML = users.map(user => {
            const canChange = me.role === 'root' || (me.role === 'rop' && user.role === 'user');
            const canDelete = me.role === 'root' && user.username !== 'root' && user.id !== me.id;
            const roleLabel = user.role === 'root' ? 'ROOT' : user.role === 'rop' ? 'РОП' : 'Сотрудник';
            const pointOpts = points.map(p =>
                `<option value="${p.id}" ${user.point_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
            ).join('');
            
            return `
            <div class="admin-user-row" style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 8px;">
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
    } catch (error) {
        console.error('Failed to load users list:', error);
    }
}

window.changePasswordUser = async function(userId, userName) {
    const newPassword = prompt(`Новый пароль (4 цифры) для ${userName}:`);
    if (!newPassword) return;
    if (!/^\d{4}$/.test(newPassword)) { 
        alert('Пароль — 4 цифры');
        return; 
    }
    const r = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include',
        body: JSON.stringify({ newPassword })
    });
    if (r.ok) {
        alert('Пароль изменён');
    } else {
        alert('Ошибка');
    }
};

window.deleteUserById = async function(userId) {
    if (!confirm('Удалить пользователя?')) return;
    const r = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { 
        alert('Пользователь удален');
        await loadUsersList(); 
    } else { 
        alert('Ошибка');
    }
};

window.saveUserProfile = async function(userId) {
    const posEl = document.getElementById(`pos-${userId}`);
    const pointEl = document.getElementById(`point-${userId}`);
    
    if (!posEl) return;
    
    const r = await fetch(`/api/profile/${userId}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include',
        body: JSON.stringify({ 
            position: posEl.value.trim(), 
            point_id: pointEl?.value || null
        })
    });
    
    if (r.ok) {
        posEl.style.borderColor = 'var(--accent3)';
        if (pointEl) pointEl.style.borderColor = 'var(--accent3)';
        setTimeout(() => { 
            posEl.style.borderColor = ''; 
            if (pointEl) pointEl.style.borderColor = '';
        }, 1500);
        alert('Сохранено');
        await loadUsersList();
    } else {
        alert('Ошибка сохранения');
    }
};

// ===================== SCHEDULE PANEL =====================
function renderSchedulePanel() {
    const panel = document.getElementById('adminPanel-schedule');
    if (!panel) return;
    
    panel.innerHTML = `
        <div class="schedule-nav">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button id="schedulePrevMonth" class="schedule-nav-btn">←</button>
                    <span id="scheduleCurrentMonth" class="schedule-current-month"></span>
                    <button id="scheduleNextMonth" class="schedule-nav-btn">→</button>
                </div>
                <div style="min-width: 250px;">
                    <select id="schedulePointSelect" class="schedule-point-select">
                        <option value="">— Выберите точку —</option>
                    </select>
                </div>
            </div>
        </div>
        <div id="scheduleEditorContainer" style="margin-top: 20px;">
            <div style="text-align: center; padding: 60px; color: var(--muted);">
                📅 Выберите точку для редактирования графика
            </div>
        </div>
    `;
    
    if (typeof window.initScheduleEditor === 'undefined') {
        const script = document.createElement('script');
        script.src = '/schedule-editor.js';
        script.onload = () => {
            if (typeof window.initScheduleEditor === 'function') {
                window.initScheduleEditor();
            }
        };
        document.head.appendChild(script);
    }
}

// ===================== POINTS PANEL =====================
async function renderPointsPanel() {
    const panel = document.getElementById('adminPanel-points');
    if (!panel) return;
    
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

    const addBtn = document.getElementById('addPointBtn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const name = document.getElementById('newPointName').value.trim();
            const address = document.getElementById('newPointAddress').value.trim();
            if (!name) { 
                alert('Введите название точки');
                return; 
            }
            const r = await fetch('/api/points', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                credentials: 'include',
                body: JSON.stringify({ name, address })
            });
            if (r.ok) {
                alert('Точка добавлена');
                document.getElementById('newPointName').value = '';
                document.getElementById('newPointAddress').value = '';
                await loadPointsList();
            } else {
                alert('Ошибка');
            }
        });
    }
}

async function loadPointsList() {
    try {
        const pointsRes = await fetch('/api/points', { credentials: 'include' });
        const points = await pointsRes.json();
        const list = document.getElementById('pointsList');
        if (!list) return;

        if (!points.length) { 
            list.innerHTML = '<div style="color:var(--muted); font-size:13px; padding:8px 0;">Точки не добавлены</div>'; 
            return; 
        }

        list.innerHTML = points.map(p => {
            return `
            <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="font-weight:600; color:var(--strong); font-size:14px;">📍 ${escapeHtml(p.name)}</div>
                    <div style="font-size:12px; color:var(--muted); margin-top:3px;">${escapeHtml(p.address || 'Адрес не указан')}</div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="window.deletePoint(${p.id})" class="btn-delete" style="padding:5px 12px; font-size:12px;">🗑 Удалить</button>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        console.error('Failed to load points:', error);
    }
}

window.deletePoint = async function(id) {
    if (!confirm('Удалить точку? Все сотрудники будут откреплены.')) return;
    const r = await fetch(`/api/points/${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) {
        alert('Точка удалена');
        await loadPointsList();
        await loadUsersList();
    } else {
        alert('Ошибка');
    }
};

// ===================== QUIZZES PANEL =====================
function renderQuizzesPanel() {
    const panel = document.getElementById('adminPanel-quizzes');
    if (!panel) return;
    
    panel.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div class="admin-panel-label">📝 Управление опросниками</div>
            <button onclick="window.openQuizEditorInAdmin()" class="btn-add" style="margin-bottom: 20px;">➕ Создать новый опросник</button>
        </div>
        <div class="admin-panel-label">📋 Список опросников</div>
        <div id="quizzesAdminList"></div>
    `;
    
    loadQuizzesAdmin();
}

async function loadQuizzesAdmin() {
    try {
        const response = await fetch('/api/quizzes', { credentials: 'include' });
        const quizzes = await response.json();
        
        const container = document.getElementById('quizzesAdminList');
        if (!container) return;
        
        if (!quizzes.length) {
            container.innerHTML = '<div style="color: var(--muted); padding: 20px; text-align: center;">Нет опросников. Создайте первый.</div>';
            return;
        }
        
        container.innerHTML = quizzes.map(quiz => `
            <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--strong); font-size: 14px;">${escapeHtml(quiz.title)}</div>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">
                            ${quiz.description ? escapeHtml(quiz.description) : '—'}
                            | Вопросов: ${quiz.questions?.length || 0}
                            | Статус: ${quiz.is_active ? '🟢 Активен' : '🔴 Неактивен'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.openQuizEditorInAdmin(${quiz.id})" class="btn-edit" style="padding: 5px 12px;">✏️ Редактировать</button>
                        <button onclick="window.deleteQuizInAdmin(${quiz.id})" class="btn-delete" style="padding: 5px 12px;">🗑 Удалить</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load quizzes:', error);
    }
}

window.openQuizEditorInAdmin = function(quizId = null) {
    if (typeof window.openQuizEditor === 'function') {
        window.openQuizEditor(quizId);
    } else {
        alert('Редактор опросников загружается. Попробуйте еще раз.');
        const script = document.createElement('script');
        script.src = '/training.html';
    }
};

window.deleteQuizInAdmin = async function(quizId) {
    if (!confirm('Удалить опросник? Все результаты будут потеряны.')) return;
    
    try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Опросник удален');
            loadQuizzesAdmin();
            if (typeof window.loadQuizzes === 'function') window.loadQuizzes();
        } else {
            alert('Ошибка удаления');
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

// ===================== ROLES PANEL =====================
function renderRolesPanel() {
    const panel = document.getElementById('adminPanel-roles');
    if (!panel) return;
    
    panel.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div class="admin-panel-label">👥 Управление ролями</div>
            <button onclick="openCreateRoleModal()" class="btn-add" style="margin-bottom: 20px;">➕ Создать новую роль</button>
        </div>
        <div class="admin-panel-label">📋 Список ролей</div>
        <div id="rolesList"></div>
        <div class="admin-panel-label" style="margin-top: 30px;">👥 Пользователи</div>
        <div id="usersWithRolesList"></div>
    `;
    
    loadRolesList();
    loadUsersWithRolesList();
}

async function loadRolesList() {
    try {
        const response = await fetch('/api/roles', { credentials: 'include' });
        const roles = await response.json();
        
        const container = document.getElementById('rolesList');
        if (!container) return;
        
        if (!roles.length) {
            container.innerHTML = '<div style="color: var(--muted); padding: 20px;">Нет ролей</div>';
            return;
        }
        
        container.innerHTML = roles.map(role => `
            <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <div style="font-weight: 600; font-size: 16px; color: var(--accent);">${escapeHtml(role.display_name)}</div>
                        <div style="font-size: 12px; color: var(--muted);">${escapeHtml(role.name)}</div>
                        <div style="font-size: 12px; margin-top: 4px;">${escapeHtml(role.description || 'Нет описания')}</div>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 6px;">
                            Уровень: ${role.level} | Пользователей: ${role.users_count}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="openEditRoleModal(${role.id})" class="btn-edit" style="padding: 5px 12px;">✏️ Редактировать</button>
                        ${role.name !== 'root' && role.name !== 'user' ? 
                            `<button onclick="deleteRole(${role.id})" class="btn-delete" style="padding: 5px 12px;">🗑 Удалить</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load roles:', error);
    }
}

async function loadUsersWithRolesList() {
    try {
        const response = await fetch('/api/users-with-roles', { credentials: 'include' });
        const users = await response.json();
        const rolesResponse = await fetch('/api/roles', { credentials: 'include' });
        const roles = await rolesResponse.json();
        
        const container = document.getElementById('usersWithRolesList');
        if (!container) return;
        
        if (!users.length) {
            container.innerHTML = '<div style="color: var(--muted); padding: 20px;">Нет пользователей</div>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <div style="font-weight: 600;">${escapeHtml(user.full_name)}</div>
                        <div style="font-size: 12px; color: var(--muted);">${user.username}</div>
                        <div style="font-size: 11px; margin-top: 4px;">
                            Текущая роль: <strong>${user.role_display || user.custom_role || user.role || 'Сотрудник'}</strong>
                        </div>
                    </div>
                    <div>
                        <select id="role-select-${user.id}" class="admin-panel-select" style="width: 200px;">
                            <option value="">— Выберите роль —</option>
                            ${roles.map(role => `
                                <option value="${role.id}" ${user.role_id === role.id ? 'selected' : ''}>
                                    ${escapeHtml(role.display_name)}
                                </option>
                            `).join('')}
                        </select>
                        <button onclick="assignUserRole(${user.id})" class="btn-add" style="margin-top: 8px; width: 100%;">Назначить</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load users with roles:', error);
    }
}

window.assignUserRole = async function(userId) {
    const select = document.getElementById(`role-select-${userId}`);
    const role_id = select.value ? parseInt(select.value) : null;
    
    try {
        const response = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role_id, custom_role: null })
        });
        
        if (response.ok) {
            alert('Роль назначена');
            loadUsersWithRolesList();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка');
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.openCreateRoleModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <span class="modal-title">➕ Создать новую роль</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>Название (системное)</label>
                    <input type="text" id="roleName" placeholder="supervisor">
                    <div style="font-size: 11px; color: var(--muted);">Только латиница, без пробелов</div>
                </div>
                <div class="field">
                    <label>Отображаемое имя</label>
                    <input type="text" id="roleDisplayName" placeholder="Супервайзер">
                </div>
                <div class="field">
                    <label>Описание</label>
                    <textarea id="roleDescription" rows="3" placeholder="Обязанности и права..."></textarea>
                </div>
                <div class="field">
                    <label>Уровень доступа</label>
                    <input type="number" id="roleLevel" value="30" min="0" max="100">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-save" id="createRoleBtn">Создать</button>
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
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    modal.querySelector('#createRoleBtn').addEventListener('click', async () => {
        const name = modal.querySelector('#roleName').value.trim().toLowerCase();
        const display_name = modal.querySelector('#roleDisplayName').value.trim();
        const description = modal.querySelector('#roleDescription').value.trim();
        const level = parseInt(modal.querySelector('#roleLevel').value);
        
        if (!name || !display_name) {
            alert('Заполните название и отображаемое имя');
            return;
        }
        
        if (!/^[a-z_]+$/.test(name)) {
            alert('Название может содержать только латинские буквы и подчеркивания');
            return;
        }
        
        try {
            const response = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, display_name, description, level, permissions: [] })
            });
            
            if (response.ok) {
                alert('Роль создана');
                closeModal();
                loadRolesList();
                loadUsersWithRolesList();
            } else {
                const error = await response.json();
                alert(error.error || 'Ошибка');
            }
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });
};

window.openEditRoleModal = async function(roleId) {
    try {
        const response = await fetch('/api/roles', { credentials: 'include' });
        const roles = await response.json();
        const role = roles.find(r => r.id === roleId);
        
        if (!role) {
            alert('Роль не найдена');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <span class="modal-title">✏️ Редактировать: ${escapeHtml(role.display_name)}</span>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="field">
                        <label>Отображаемое имя</label>
                        <input type="text" id="editRoleDisplayName" value="${escapeHtml(role.display_name)}">
                    </div>
                    <div class="field">
                        <label>Описание</label>
                        <textarea id="editRoleDescription" rows="3">${escapeHtml(role.description || '')}</textarea>
                    </div>
                    <div class="field">
                        <label>Уровень доступа</label>
                        <input type="number" id="editRoleLevel" value="${role.level}" min="0" max="100">
                    </div>
                    <div class="field">
                        <label>Активна</label>
                        <select id="editRoleActive">
                            <option value="true" ${role.is_active ? 'selected' : ''}>Да</option>
                            <option value="false" ${!role.is_active ? 'selected' : ''}>Нет</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Отмена</button>
                    <button class="btn-save" id="saveRoleBtn">Сохранить</button>
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
        modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
        
        modal.querySelector('#saveRoleBtn').addEventListener('click', async () => {
            const display_name = modal.querySelector('#editRoleDisplayName').value.trim();
            const description = modal.querySelector('#editRoleDescription').value.trim();
            const level = parseInt(modal.querySelector('#editRoleLevel').value);
            const is_active = modal.querySelector('#editRoleActive').value === 'true';
            
            if (!display_name) {
                alert('Введите отображаемое имя');
                return;
            }
            
            try {
                const updateResponse = await fetch(`/api/roles/${roleId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ display_name, description, level, is_active })
                });
                
                if (updateResponse.ok) {
                    alert('Сохранено');
                    closeModal();
                    loadRolesList();
                    loadUsersWithRolesList();
                } else {
                    const error = await updateResponse.json();
                    alert(error.error || 'Ошибка');
                }
            } catch (error) {
                alert('Ошибка: ' + error.message);
            }
        });
    } catch (error) {
        alert('Ошибка загрузки роли');
    }
};

window.deleteRole = async function(roleId) {
    if (!confirm('Удалить роль? Пользователи с этой ролью останутся, но роль будет сброшена.')) return;
    
    try {
        const response = await fetch(`/api/roles/${roleId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Роль удалена');
            loadRolesList();
            loadUsersWithRolesList();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка');
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
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
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        font-size: 13px;
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Экспорт
window.openRopPanel = openRopPanel;
window.renderUsersPanel = renderUsersPanel;
window.renderSchedulePanel = renderSchedulePanel;
window.renderPointsPanel = renderPointsPanel;
window.renderQuizzesPanel = renderQuizzesPanel;
window.renderRolesPanel = renderRolesPanel;
window.loadUsersList = loadUsersList;
window.loadPointsList = loadPointsList;
window.loadQuizzesAdmin = loadQuizzesAdmin;
window.loadRolesList = loadRolesList;
window.loadUsersWithRolesList = loadUsersWithRolesList;

console.log('main.js loaded, openRopPanel available:', typeof window.openRopPanel);

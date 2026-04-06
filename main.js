// main.js v4.0 - ИСПРАВЛЕНА КНОПКА АДМИНИСТРИРОВАНИЯ

window.isRop = false;
window.isRopGlobal = false;
window._authLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js v4.0 loaded');
    initTabs();
    initAccordions();
    initSearch();
    loadUserInfo();
    setupLogout();
    setupRopPanel(); // <- ЭТО ВАЖНО!
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
            if (ropBtn) {
                ropBtn.style.display = isRop ? 'block' : 'none';
                console.log('ROP button display set to:', isRop ? 'block' : 'none');
            }
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

            // ВАЖНО: отправляем событие для других страниц
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
        console.log('Setting up ROP button listener');
        ropBtn.removeEventListener('click', handleRopPanel);
        ropBtn.addEventListener('click', handleRopPanel);
    } else {
        console.log('ROP button not found in DOM yet, will retry');
        // Если кнопки еще нет, пробуем позже
        setTimeout(setupRopPanel, 500);
    }
}

async function handleRopPanel(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('ROP button clicked, opening panel...');
    await openRopPanel();
}

// ========== ГЛОБАЛЬНАЯ ФУНКЦИЯ openRopPanel ==========
// Объявляем ДО того, как она будет использоваться
window.openRopPanel = async function() {
    console.log('openRopPanel called');
    
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
            const panel = document.getElementById(`adminPanel-${tab.dataset.panel}`);
            if (panel) panel.style.display = 'block';
            
            if (tab.dataset.panel === 'schedule' && typeof window.initScheduleEditor === 'function') {
                setTimeout(() => window.initScheduleEditor(), 100);
            } else if (tab.dataset.panel === 'quizzes' && typeof window.loadQuizzesAdmin === 'function') {
                window.loadQuizzesAdmin();
            }
        });
    });

    await renderUsersPanel();
    renderSchedulePanelSimple();
    await renderPointsPanel();
    renderQuizzesPanelSimple();
};

// Простая версия для графика (без сложного редактора)
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
    
    // Загружаем schedule-editor.js если еще не загружен
    if (typeof window.initScheduleEditor === 'undefined') {
        const script = document.createElement('script');
        script.src = '/schedule-editor.js';
        script.onload = () => {
            if (typeof window.initScheduleEditor === 'function') {
                window.initScheduleEditor();
            }
        };
        document.head.appendChild(script);
    } else {
        window.initScheduleEditor();
    }
}

// ===================== QUIZZES PANEL (полноценный) =====================
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
        
        if (quizzes.length === 0) {
            container.innerHTML = '<div style="color: var(--muted); padding: 20px; text-align: center;">Нет опросников. Создайте первый.</div>';
            return;
        }
        
        container.innerHTML = quizzes.map(quiz => `
            <div class="admin-quiz-row" style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--strong); font-size: 14px;">${escapeHtml(quiz.title)}</div>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">
                            ${quiz.description ? escapeHtml(quiz.description) : '—'}
                            | Вопросов: ${quiz.questions?.length || 0}
                            | Статус: ${quiz.is_active ? '🟢 Активен' : '🔴 Неактивен'}
                            | Создан: ${new Date(quiz.created_at).toLocaleDateString('ru-RU')}
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
        const container = document.getElementById('quizzesAdminList');
        if (container) container.innerHTML = '<div style="color: var(--accent2); padding: 20px;">❌ Ошибка загрузки опросников</div>';
    }
}

// Функции для админ-панели
window.openQuizEditorInAdmin = async function(quizId = null) {
    // Используем ту же функцию что и на странице обучения
    if (typeof openQuizEditor === 'function') {
        openQuizEditor(quizId);
    } else {
        // Если функция не определена, показываем простой редактор
        showSimpleQuizEditor(quizId);
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
            showToast('Опросник удален', 'success');
            loadQuizzesAdmin();
            if (typeof loadQuizzes === 'function') loadQuizzes();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        showToast('Ошибка: ' + error.message, 'error');
    }
};

// Простой редактор на случай если основная функция не загружена
function showSimpleQuizEditor(quizId = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 700px;">
            <div class="modal-header">
                <span class="modal-title">${quizId ? '✏️ Редактировать' : '📝 Создать'} опросник</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>Название</label>
                    <input type="text" id="simpleQuizTitle" placeholder="Название опросника">
                </div>
                <div class="field">
                    <label>Описание</label>
                    <textarea id="simpleQuizDesc" rows="2" placeholder="Описание..."></textarea>
                </div>
                <div class="field">
                    <label>Вопросы (JSON формат)</label>
                    <textarea id="simpleQuizQuestions" rows="10" placeholder='[
  {
    "text": "Пример вопроса?",
    "options": ["Вариант 1", "Вариант 2", "Вариант 3"],
    "correct": 0,
    "explanation": "Пояснение"
  }
]'></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-save" id="saveSimpleQuizBtn">💾 Сохранить</button>
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
    
    // Если редактируем, загружаем данные
    if (quizId) {
        fetch(`/api/quizzes/${quizId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(quiz => {
                document.getElementById('simpleQuizTitle').value = quiz.title;
                document.getElementById('simpleQuizDesc').value = quiz.description || '';
                document.getElementById('simpleQuizQuestions').value = JSON.stringify(quiz.questions, null, 2);
            })
            .catch(console.error);
    }
    
    modal.querySelector('#saveSimpleQuizBtn').addEventListener('click', async () => {
        const title = document.getElementById('simpleQuizTitle').value.trim();
        const description = document.getElementById('simpleQuizDesc').value.trim();
        let questions;
        
        try {
            questions = JSON.parse(document.getElementById('simpleQuizQuestions').value);
        } catch (e) {
            showToast('Неверный формат JSON', 'error');
            return;
        }
        
        if (!title) {
            showToast('Введите название', 'error');
            return;
        }
        
        try {
            let response;
            if (quizId) {
                response = await fetch(`/api/quizzes/${quizId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, description, questions, is_active: true })
                });
            } else {
                response = await fetch('/api/quizzes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, description, questions })
                });
            }
            
            if (response.ok) {
                showToast('Сохранено', 'success');
                closeModal();
                loadQuizzesAdmin();
                if (typeof loadQuizzes === 'function') loadQuizzes();
            } else {
                showToast('Ошибка', 'error');
            }
        } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
        }
    });
}

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

// Глобальные функции для работы с пользователями
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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// Экспортируем всё в window
window.openRopPanel = openRopPanel;
window.initTabs = initTabs;
window.initAccordions = initAccordions;
window.loadUserInfo = loadUserInfo;
window.loadAllContent = loadAllContent;
window.loadContent = loadContent;
window.initDetailsHandlers = initDetailsHandlers;

console.log('main.js loaded, openRopPanel available:', typeof window.openRopPanel);

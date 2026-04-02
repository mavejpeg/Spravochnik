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
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
                <span class="modal-title">👑 Панель управления</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>➕ Добавить пользователя</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <input type="text" id="newUsername" placeholder="Логин" style="flex:1">
                        <input type="text" id="newPassword" placeholder="Пароль (4 цифры)" maxlength="4" style="width: 120px">
                        <input type="text" id="newFullName" placeholder="ФИО" style="flex:1">
                        <button id="addUserBtn" class="btn-add">Добавить</button>
                    </div>
                </div>
                <div class="field">
                    <label>📋 Список пользователей</label>
                    <div id="usersList" style="max-height: 300px; overflow-y: auto;"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    const closeModal = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 300); };
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    await loadUsersList(modal);
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const full_name = document.getElementById('newFullName').value.trim();
        if (!username || !password || !full_name) { alert('Заполните все поля'); return; }
        if (!/^\d{4}$/.test(password)) { alert('Пароль должен быть 4 цифры'); return; }
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, full_name, role: 'user' })
        });
        if (response.ok) {
            alert('Пользователь добавлен');
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newFullName').value = '';
            await loadUsersList(modal);
        } else {
            const error = await response.json();
            alert(error.error);
        }
    });
}

async function loadUsersList(modal) {
    const response = await fetch('/api/users', { credentials: 'include' });
    const users = await response.json();
    const meResponse = await fetch('/api/check-auth', { credentials: 'include' });
    const me = await meResponse.json();
    const container = modal.querySelector('#usersList');
    if (!container) return;
    container.innerHTML = users.map(user => {
        let canChange = false;
        if (me.user.role === 'root') canChange = true;
        else if (me.user.role === 'rop' && user.role === 'user') canChange = true;
        let canDelete = false;
        if (me.user.role === 'root' && user.username !== 'root' && user.id !== me.user.id) canDelete = true;
        return `
            <div style="background: var(--surface2); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <strong>${escapeHtml(user.full_name)}</strong><br>
                        <span style="font-size: 11px;">${user.username} | ${user.role === 'root' ? 'ROOT' : (user.role === 'rop' ? 'РОП' : 'Пользователь')}</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        ${canChange ? `<button onclick="window.changePasswordUser(${user.id}, '${escapeHtml(user.full_name)}')" class="btn-edit" style="padding: 4px 12px;">🔑 Сменить пароль</button>` : ''}
                        ${canDelete ? `<button onclick="window.deleteUserById(${user.id})" class="btn-delete" style="padding: 4px 12px;">🗑 Удалить</button>` : ''}
                    </div>
                </div>
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

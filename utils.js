// utils.js - универсальные функции для всех страниц

// Инициализация табов
function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
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

// Инициализация аккордеонов
function initAccordions() {
    const headers = document.querySelectorAll('.acc-header');
    headers.forEach(header => {
        header.removeEventListener('click', handleAccordionClick);
        header.addEventListener('click', handleAccordionClick);
    });
}

function handleAccordionClick(e) {
    const header = e.currentTarget;
    header.closest('.accordion').classList.toggle('open');
}

// Инициализация поиска
function initSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.removeEventListener('input', handleSearch);
    input.addEventListener('input', handleSearch);
}

function handleSearch(e) {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('[data-searchable]').forEach(el => {
        if (el.textContent.toLowerCase().includes(val)) {
            el.classList.remove('search-hidden');
        } else {
            el.classList.add('search-hidden');
        }
    });
}

// Проверка авторизации и отображение пользователя
async function loadUserInfo() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await response.json();
        
        const userNameSpan = document.getElementById('userName');
        const ropBtn = document.getElementById('ropBtn');
        
        if (data.authenticated) {
            if (userNameSpan) userNameSpan.textContent = data.user.full_name;
            const isRop = (data.user.role === 'rop' || data.user.role === 'root');
            window.isRopGlobal = isRop;
            if (ropBtn) ropBtn.style.display = isRop ? 'block' : 'none';
            return { authenticated: true, user: data.user, isRop };
        } else {
            if (userNameSpan) userNameSpan.textContent = '';
            if (ropBtn) ropBtn.style.display = 'none';
            window.location.href = '/login.html';
            return { authenticated: false };
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
        return { authenticated: false };
    }
}

// Выход
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login.html';
}

// Панель управления РОП
function setupRopPanel() {
    const ropBtn = document.getElementById('ropBtn');
    if (ropBtn) {
        ropBtn.removeEventListener('click', openRopPanel);
        ropBtn.addEventListener('click', openRopPanel);
    }
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
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    await loadUsersList(modal);
    
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const full_name = document.getElementById('newFullName').value.trim();
        
        if (!username || !password || !full_name) {
            alert('Заполните все поля');
            return;
        }
        if (!/^\d{4}$/.test(password)) {
            alert('Пароль должен состоять из 4 цифр');
            return;
        }
        
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
                        <span style="font-size: 11px;">Логин: ${user.username} | Роль: ${user.role === 'root' ? 'ROOT' : (user.role === 'rop' ? 'РОП' : 'Пользователь')}</span>
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

window.changePasswordUser = async (userId, userName) => {
    const newPassword = prompt(`Введите новый пароль (4 цифры) для пользователя ${userName}`);
    if (!newPassword) return;
    if (!/^\d{4}$/.test(newPassword)) {
        alert('Пароль должен состоять из 4 цифр');
        return;
    }
    const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
    });
    if (response.ok) alert('Пароль успешно изменен');
    else alert('Ошибка смены пароля');
};

window.deleteUserById = async (userId) => {
    if (confirm('Удалить пользователя?')) {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) {
            alert('Пользователь удален');
            location.reload();
        } else alert('Ошибка удаления');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// Редактирование контента
function editContent(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    const currentHtml = contentDiv.innerHTML;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <span class="modal-title">✏️ Редактировать: ${section}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>📝 Содержимое (HTML)</label>
                    <textarea id="contentEditor" style="width:100%; min-height:400px; font-family:monospace; font-size:13px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--text);">${escapeHtml(currentHtml)}</textarea>
                </div>
                <div class="alert-bar info">
                    <span>💡</span>
                    <span>Вы можете использовать HTML теги: &lt;div&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;table&gt;, &lt;h3&gt; и т.д.</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-save">💾 Сохранить</button>
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
    
    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newContent = modal.querySelector('#contentEditor').value;
        
        try {
            const response = await fetch(`/api/content/${page}/${section}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: newContent })
            });
            
            if (response.ok) {
                contentDiv.innerHTML = newContent;
                alert('✅ Сохранено успешно!');
                closeModal();
                initAccordions(); // Переинициализируем аккордеоны
            } else {
                alert('❌ Ошибка сохранения');
            }
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        }
    });
}

// Инициализация всех компонентов
async function initApp() {
    initTabs();
    initAccordions();
    initSearch();
    setupLogout();
    setupRopPanel();
    await loadUserInfo();
}

// Запуск после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// utils.js - общие функции для всех страниц

// ========== ESCAPE HTML ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
        return map[m] || m;
    });
}

// ========== DEBOUNCE для поиска ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== ФОРМАТИРОВАНИЕ ДАТ ==========
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дня назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недели назад`;
    return formatDate(dateString);
}

// ========== АЛГОРИТМ ЛЕВЕНШТЕЙНА ==========
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
}

// ========== ПОДСВЕТКА ПОИСКОВОГО ЗАПРОСА ==========
function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

// ========== ТЕМА (светлая/темная) ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let theme = savedTheme;
    if (!theme) {
        theme = prefersDark ? 'dark' : 'light';
    }
    
    applyTheme(theme);
}

function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
        root.style.setProperty('--bg', '#f5f5f7');
        root.style.setProperty('--surface', '#ffffff');
        root.style.setProperty('--surface2', '#f0f0f2');
        root.style.setProperty('--surface3', '#e8e8ec');
        root.style.setProperty('--border', '#e0e0e4');
        root.style.setProperty('--border2', '#d0d0d8');
        root.style.setProperty('--text', '#1a1a2e');
        root.style.setProperty('--text2', '#4a4a6a');
        root.style.setProperty('--muted', '#8a8aa8');
        root.style.setProperty('--strong', '#0a0a1e');
    } else {
        root.style.setProperty('--bg', '#09090e');
        root.style.setProperty('--surface', '#111118');
        root.style.setProperty('--surface2', '#18181f');
        root.style.setProperty('--surface3', '#1f1f28');
        root.style.setProperty('--border', '#26263a');
        root.style.setProperty('--border2', '#32324a');
        root.style.setProperty('--text', '#d8d8e8');
        root.style.setProperty('--text2', '#a8a8c0');
        root.style.setProperty('--muted', '#58587a');
        root.style.setProperty('--strong', '#f0f0ff');
    }
    
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-left: 3px solid ${type === 'success' ? 'var(--accent3)' : type === 'error' ? 'var(--accent2)' : 'var(--accent)'};
        border-radius: 12px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== МОДАЛЬНОЕ ОКНО ДЛЯ ЗАМЕТОК ==========
function openNoteModal(productType, productId, productName, currentNote) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'noteModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <span class="modal-title">📝 Личная заметка</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>Товар</label>
                    <div style="background: var(--surface2); border-radius: 10px; padding: 10px; font-size: 13px;">
                        ${escapeHtml(productName)}
                    </div>
                </div>
                <div class="field">
                    <label>Ваша заметка</label>
                    <textarea id="noteText" rows="4" placeholder="Добавьте личную заметку о товаре...">${escapeHtml(currentNote || '')}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" id="deleteNoteBtn" style="${!currentNote ? 'display:none' : ''}">🗑 Удалить</button>
                <button class="btn-cancel" id="cancelNoteBtn">Отмена</button>
                <button class="btn-save" id="saveNoteBtn">💾 Сохранить</button>
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
    modal.querySelector('#cancelNoteBtn').addEventListener('click', closeModal);
    
    modal.querySelector('#saveNoteBtn').addEventListener('click', async () => {
        const note = modal.querySelector('#noteText').value.trim();
        
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ product_type: productType, product_id: productId, note })
            });
            
            if (response.ok) {
                showToast('Заметка сохранена', 'success');
                closeModal();
                // Обновляем иконку заметки на странице
                updateNoteIcon(productType, productId, note);
            } else {
                showToast('Ошибка сохранения', 'error');
            }
        } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
        }
    });
    
    modal.querySelector('#deleteNoteBtn')?.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/notes/${productType}/${productId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                showToast('Заметка удалена', 'success');
                closeModal();
                updateNoteIcon(productType, productId, '');
            } else {
                showToast('Ошибка удаления', 'error');
            }
        } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
        }
    });
}

function updateNoteIcon(productType, productId, note) {
    const btn = document.querySelector(`.note-btn[data-type="${productType}"][data-id="${productId}"]`);
    if (btn) {
        if (note) {
            btn.innerHTML = '📝✓';
            btn.classList.add('has-note');
            btn.title = 'Редактировать заметку';
        } else {
            btn.innerHTML = '📝';
            btn.classList.remove('has-note');
            btn.title = 'Добавить заметку';
        }
    }
}

// ========== ПРОГРЕСС-БАР ОБУЧЕНИЯ ==========
async function loadLearningProgress() {
    try {
        const response = await fetch('/api/learning/progress', { credentials: 'include' });
        const data = await response.json();
        
        // Обновляем прогресс-бар в шапке (если есть)
        const progressBar = document.getElementById('learningProgressBar');
        const progressText = document.getElementById('learningProgressText');
        
        if (progressBar) {
            progressBar.style.width = `${data.progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${data.progress}% (${data.completedPages}/${data.totalPages})`;
        }
        
        return data;
    } catch (error) {
        console.error('Failed to load learning progress:', error);
        return null;
    }
}

async function trackPageView(page) {
    try {
        await fetch('/api/learning/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ page })
        });
        loadLearningProgress(); // Обновляем прогресс
    } catch (error) {
        console.error('Failed to track page view:', error);
    }
}

// ========== ГЛОБАЛЬНЫЙ ПОИСК ==========
let searchModal = null;

function initGlobalSearch() {
    // Создаем кнопку поиска в шапке
    const header = document.querySelector('.site-header');
    if (header && !document.getElementById('globalSearchBtn')) {
        const searchBtn = document.createElement('button');
        searchBtn.id = 'globalSearchBtn';
        searchBtn.className = 'search-global-btn';
        searchBtn.innerHTML = '🔍';
        searchBtn.title = 'Глобальный поиск (Ctrl+K)';
        searchBtn.style.cssText = `
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 7px 14px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            header.insertBefore(searchBtn, userInfo);
        } else {
            header.appendChild(searchBtn);
        }
        
        searchBtn.addEventListener('click', () => openSearchModal());
    }
    
    // Ctrl+K / Cmd+K для открытия поиска
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearchModal();
        }
    });
}

function openSearchModal() {
    if (searchModal) {
        searchModal.classList.add('open');
        searchModal.style.display = 'flex';
        const input = searchModal.querySelector('#globalSearchInput');
        if (input) input.focus();
        return;
    }
    
    searchModal = document.createElement('div');
    searchModal.className = 'modal-overlay';
    searchModal.id = 'globalSearchModal';
    searchModal.innerHTML = `
        <div class="modal" style="max-width: 700px; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <span class="modal-title">🔍 Глобальный поиск</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body" style="overflow-y: auto;">
                <div class="field">
                    <input type="text" id="globalSearchInput" placeholder="Поиск по товарам, производителям, линейкам..." autocomplete="off" style="font-size: 16px; padding: 14px;">
                    <div id="searchAutocomplete" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
                </div>
                <div id="searchResults" style="margin-top: 20px;">
                    <div style="text-align: center; color: var(--muted); padding: 40px;">Начните вводить запрос...</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(searchModal);
    setTimeout(() => searchModal.classList.add('open'), 10);
    
    const closeModal = () => {
        searchModal.classList.remove('open');
        setTimeout(() => {
            if (searchModal) searchModal.remove();
            searchModal = null;
        }, 300);
    };
    
    searchModal.querySelector('.modal-close').addEventListener('click', closeModal);
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeModal();
    });
    
    const searchInput = searchModal.querySelector('#globalSearchInput');
    const autocompleteDiv = searchModal.querySelector('#searchAutocomplete');
    const resultsDiv = searchModal.querySelector('#searchResults');
    
    const performSearch = debounce(async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            resultsDiv.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 40px;">Введите минимум 2 символа...</div>';
            return;
        }
        
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px;">🔍 Поиск...</div>';
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
            const data = await response.json();
            
            // Показываем исправление опечаток
            if (data.suggestion && data.suggestion !== query) {
                autocompleteDiv.innerHTML = `
                    <span style="color: var(--muted); font-size: 12px;">Возможно, вы искали:</span>
                    <button class="suggestion-btn" data-suggestion="${escapeHtml(data.suggestion)}">${escapeHtml(data.suggestion)}</button>
                `;
                autocompleteDiv.querySelector('.suggestion-btn')?.addEventListener('click', () => {
                    searchInput.value = data.suggestion;
                    performSearch();
                });
            } else {
                autocompleteDiv.innerHTML = '';
            }
            
            // Отображаем результаты
            let html = '';
            
            if (data.results.manufacturers.length > 0) {
                html += `<div class="search-category"><span class="search-category-title">🏭 Производители</span></div>`;
                html += data.results.manufacturers.map(item => `
                    <a href="${item.url}" class="search-result-item" data-url="${item.url}">
                        <div class="search-result-title">${highlightText(item.title, query)}</div>
                        <div class="search-result-desc">${highlightText(item.description?.substring(0, 100) || '', query)}</div>
                        <div class="search-result-category">${item.category}</div>
                    </a>
                `).join('');
            }
            
            if (data.results.lines.length > 0) {
                html += `<div class="search-category"><span class="search-category-title">📦 Линейки</span></div>`;
                html += data.results.lines.map(item => `
                    <a href="${item.url}" class="search-result-item" data-url="${item.url}">
                        <div class="search-result-title">${highlightText(item.title, query)}</div>
                        <div class="search-result-desc">${highlightText(item.description?.substring(0, 100) || '', query)}</div>
                        <div class="search-result-category">${item.category}</div>
                    </a>
                `).join('');
            }
            
            if (data.results.content.length > 0) {
                html += `<div class="search-category"><span class="search-category-title">📄 Справочные статьи</span></div>`;
                html += data.results.content.map(item => `
                    <a href="${item.url}" class="search-result-item" data-url="${item.url}">
                        <div class="search-result-title">${highlightText(item.title, query)}</div>
                        <div class="search-result-desc">${highlightText(item.description?.substring(0, 100) || '', query)}</div>
                    </a>
                `).join('');
            }
            
            if (html === '') {
                html = '<div style="text-align: center; color: var(--muted); padding: 40px;">😕 Ничего не найдено</div>';
            }
            
            resultsDiv.innerHTML = html;
            
            // Добавляем обработчики для результатов
            resultsDiv.querySelectorAll('.search-result-item').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const url = link.dataset.url;
                    if (url) window.location.href = url;
                    closeModal();
                });
            });
            
        } catch (error) {
            console.error('Search error:', error);
            resultsDiv.innerHTML = '<div style="text-align: center; color: var(--accent2); padding: 40px;">❌ Ошибка поиска</div>';
        }
    }, 300);
    
    searchInput.addEventListener('input', performSearch);
    searchInput.focus();
}

// ========== ДОБАВЛЯЕМ КНОПКУ ЗАМЕТКИ НА КАРТОЧКИ ==========
function addNoteButtonToCard(card, productType, productId, productName) {
    const existingBtn = card.querySelector('.note-btn');
    if (existingBtn) return;
    
    const actionsDiv = card.querySelector('.card-actions');
    if (!actionsDiv) return;
    
    const noteBtn = document.createElement('button');
    noteBtn.className = 'card-action-btn note-btn';
    noteBtn.setAttribute('data-type', productType);
    noteBtn.setAttribute('data-id', productId);
    noteBtn.innerHTML = '📝';
    noteBtn.title = 'Добавить заметку';
    
    // Загружаем существующую заметку
    fetch(`/api/notes/${productType}/${productId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.note) {
                noteBtn.innerHTML = '📝✓';
                noteBtn.classList.add('has-note');
                noteBtn.title = 'Редактировать заметку';
            }
        })
        .catch(console.error);
    
    noteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const response = await fetch(`/api/notes/${productType}/${productId}`, { credentials: 'include' });
        const data = await response.json();
        openNoteModal(productType, productId, productName, data.note);
    });
    
    actionsDiv.appendChild(noteBtn);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initGlobalSearch();
    loadLearningProgress();
    
    // Добавляем кнопку переключения темы
    const header = document.querySelector('.site-header');
    if (header && !document.getElementById('themeToggleBtn')) {
        const themeBtn = document.createElement('button');
        themeBtn.id = 'themeToggleBtn';
        themeBtn.className = 'theme-toggle-btn';
        themeBtn.innerHTML = localStorage.getItem('theme') === 'light' ? '🌙' : '☀️';
        themeBtn.style.cssText = `
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 7px 14px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        themeBtn.addEventListener('click', () => {
            toggleTheme();
            themeBtn.innerHTML = localStorage.getItem('theme') === 'light' ? '🌙' : '☀️';
        });
        
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            header.insertBefore(themeBtn, userInfo);
        } else {
            header.appendChild(themeBtn);
        }
    }
});

// Экспортируем функции в глобальный объект
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatRelativeDate = formatRelativeDate;
window.highlightText = highlightText;
window.showToast = showToast;
window.openNoteModal = openNoteModal;
window.trackPageView = trackPageView;
window.loadLearningProgress = loadLearningProgress;
window.initGlobalSearch = initGlobalSearch;
window.levenshteinDistance = levenshteinDistance;
